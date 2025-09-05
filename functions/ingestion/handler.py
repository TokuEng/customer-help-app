import os
import asyncio
import asyncpg
import httpx
import meilisearch
from datetime import datetime, timezone
from typing import List, Dict, Optional
import sys
from dotenv import load_dotenv

# Add parent directory to path to import API services
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

# Load environment variables from the API .env file
api_env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(api_env_path):
    load_dotenv(api_env_path)

from apps.api.services.notion import NotionService
from apps.api.services.chunking import ChunkingService
from apps.api.services.embeddings import EmbeddingsService
from apps.api.services.indexers import IndexerService
from apps.api.core.settings import settings

async def sync_notion_content():
    """Main sync function to ingest content from Notion"""
    
    # Initialize services
    notion_service = NotionService()
    indexer_service = IndexerService()
    
    # Create database connection pool for concurrent operations
    db_pool = await asyncpg.create_pool(settings.database_url, min_size=5, max_size=10)
    
    # Initialize Meilisearch client
    meili_client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
    
    try:
        # Ensure Meilisearch index exists
        try:
            meili_client.create_index('articles', {'primaryKey': 'id'})
        except Exception:
            # Index might already exist
            pass
        
        # Get last sync timestamp
        async with db_pool.acquire() as conn:
            last_synced = await conn.fetchval(
                "SELECT last_synced FROM ingestion_state WHERE id = 1"
            )
        
        print(f"Last synced: {last_synced}")
        
        # Fetch index page structure
        pages = await notion_service.walk_index(settings.notion_index_page_id)
        print(f"Found {len(pages)} pages to process")
        
        # Track updated pages
        updated_slugs = []
        
        # Process pages in batches for better performance
        import asyncio
        BATCH_SIZE = int(os.getenv('INGESTION_PARALLEL', '3'))  # Process 3 pages concurrently by default
        
        async def process_page(page_info):
            try:
                # Fetch page details
                page_detail = await notion_service.fetch_page_detail(page_info['page_id'])
                
                # Check if page needs update (unless forcing full sync)
                force_sync = os.getenv('FORCE_FULL_SYNC', 'false').lower() == 'true'
                if not force_sync and last_synced and page_detail['last_edited_time'] <= last_synced:
                    print(f"Skipping unchanged page: {page_detail['title']}")
                    return None
                
                print(f"Processing page: {page_detail['title']} (Category: {page_info['category']})")
                
                # Special logging for Benefits content
                if page_info['category'] == 'Benefits':
                    print(f"🎯 BENEFITS CONTENT DETECTED: {page_detail['title']}")
                
                # Upsert to database and indexes
                async with db_pool.acquire() as conn:
                    async with conn.transaction():
                        slug = await indexer_service.upsert_article(
                            conn,
                            meili_client,
                            page_detail,
                            page_info['category']
                        )
                
                print(f"Successfully processed: {page_detail['title']} -> {slug} (Category: {page_info['category']})")
                return slug
                
            except Exception as e:
                print(f"Error processing page {page_info['page_id']}: {str(e)}")
                import traceback
                traceback.print_exc()
                return None
        
        # Process pages in batches
        for i in range(0, len(pages), BATCH_SIZE):
            batch = pages[i:i + BATCH_SIZE]
            print(f"\nProcessing batch {i//BATCH_SIZE + 1}/{(len(pages) + BATCH_SIZE - 1)//BATCH_SIZE}")
            
            # Process batch concurrently
            results = await asyncio.gather(*[process_page(page_info) for page_info in batch])
            
            # Add successful slugs
            updated_slugs.extend([slug for slug in results if slug is not None])
        
        # Update ingestion state
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ingestion_state (id, last_synced) 
                VALUES (1, $1)
                ON CONFLICT (id) 
                DO UPDATE SET last_synced = EXCLUDED.last_synced
                """,
                datetime.now(timezone.utc)
            )
        
        # Trigger ISR revalidation for updated pages
        if updated_slugs:
            await trigger_revalidation(updated_slugs)
        
        print(f"Sync completed. Updated {len(updated_slugs)} articles.")
        
    finally:
        await db_pool.close()
        # Meilisearch async client doesn't have a close method
        # await meili_client.close()

async def trigger_revalidation(slugs: List[str]):
    """Trigger ISR revalidation for updated articles"""
    print(f"Triggering revalidation for {len(slugs)} articles")
    
    async with httpx.AsyncClient() as client:
        for slug in slugs:
            try:
                response = await client.post(
                    f"{settings.web_base_url}/api/revalidate",
                    json={"slug": slug},
                    headers={
                        "x-revalidate-token": settings.revalidate_token
                    },
                    timeout=10.0
                )
                if response.status_code == 200:
                    print(f"Revalidated: {slug}")
                else:
                    print(f"Revalidation failed for {slug}: {response.status_code}")
            except Exception as e:
                print(f"Error revalidating {slug}: {str(e)}")

def main(args):
    """DigitalOcean Functions entry point"""
    try:
        # Run the async sync function
        asyncio.run(sync_notion_content())
        
        return {
            "statusCode": 200,
            "body": {"message": "Sync completed successfully"}
        }
    except Exception as e:
        print(f"Sync failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }

# For local testing
if __name__ == "__main__":
    result = main({})
    print(result)