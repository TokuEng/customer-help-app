import os
import asyncio
import asyncpg
import httpx
import meilisearch_python_async as meilisearch
from datetime import datetime
from typing import List, Dict, Optional
import sys

# Add parent directory to path to import API services
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

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
    
    # Connect to database
    conn = await asyncpg.connect(settings.database_url)
    
    # Initialize Meilisearch client
    meili_client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
    
    try:
        # Ensure Meilisearch index exists
        try:
            await meili_client.create_index('articles', {'primaryKey': 'id'})
        except Exception:
            # Index might already exist
            pass
        
        # Get last sync timestamp
        last_synced = await conn.fetchval(
            "SELECT last_synced FROM ingestion_state WHERE id = 1"
        )
        
        print(f"Last synced: {last_synced}")
        
        # Fetch index page structure
        pages = await notion_service.walk_index(settings.notion_index_page_id)
        print(f"Found {len(pages)} pages to process")
        
        # Track updated pages
        updated_slugs = []
        
        # Process each page
        for page_info in pages:
            try:
                # Fetch page details
                page_detail = await notion_service.fetch_page_detail(page_info['page_id'])
                
                # Check if page needs update
                if last_synced and page_detail['last_edited_time'] <= last_synced:
                    print(f"Skipping unchanged page: {page_detail['title']}")
                    continue
                
                print(f"Processing page: {page_detail['title']}")
                
                # Upsert to database and indexes
                async with conn.transaction():
                    slug = await indexer_service.upsert_article(
                        conn,
                        meili_client,
                        page_detail,
                        page_info['category']
                    )
                    updated_slugs.append(slug)
                
                print(f"Successfully processed: {page_detail['title']} -> {slug}")
                
            except Exception as e:
                print(f"Error processing page {page_info['page_id']}: {str(e)}")
                continue
        
        # Update ingestion state
        await conn.execute(
            """
            INSERT INTO ingestion_state (id, last_synced) 
            VALUES (1, $1)
            ON CONFLICT (id) 
            DO UPDATE SET last_synced = EXCLUDED.last_synced
            """,
            datetime.utcnow()
        )
        
        # Trigger ISR revalidation for updated pages
        if updated_slugs:
            await trigger_revalidation(updated_slugs)
        
        print(f"Sync completed. Updated {len(updated_slugs)} articles.")
        
    finally:
        await conn.close()
        await meili_client.close()

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
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }

# For local testing
if __name__ == "__main__":
    result = main({})
    print(result)