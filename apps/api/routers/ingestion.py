from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime, timezone
import asyncio
import asyncpg
from typing import Optional, Dict, Any
import os
import sys

# Add project root to path for imports
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)

from services.notion import NotionService
from services.indexers import IndexerService
from core.settings import settings
import meilisearch

router = APIRouter()

class IngestionTriggerRequest(BaseModel):
    force_full_sync: bool = False
    page_ids: Optional[list[str]] = None
    
class IngestionStatusResponse(BaseModel):
    status: str
    last_synced: Optional[datetime]
    is_running: bool
    message: str

class IngestionWebhookRequest(BaseModel):
    event: str
    page_id: Optional[str] = None
    timestamp: Optional[datetime] = None

# Global variable to track if ingestion is running
_ingestion_running = False
_last_ingestion_start = None

async def run_ingestion_task(force_full_sync: bool = False, specific_page_ids: Optional[list[str]] = None, trigger_type: str = "manual", trigger_source: str = None):
    """Background task to run the ingestion process"""
    global _ingestion_running, _last_ingestion_start
    
    if _ingestion_running:
        print("⚠️  Ingestion already running, skipping...")
        return {"status": "skipped", "reason": "Already running"}
    
    _ingestion_running = True
    _last_ingestion_start = datetime.now(timezone.utc)
    
    # Create ingestion log entry
    ingestion_log_id = None
    conn = None
    
    try:
        # Initialize services
        notion_service = NotionService()
        indexer_service = IndexerService()
        
        # Create database connection pool
        db_pool = await asyncpg.create_pool(settings.database_url, min_size=5, max_size=10)
        
        # Create ingestion log entry
        try:
            async with db_pool.acquire() as conn:
                ingestion_log_id = await conn.fetchval(
                    """
                    INSERT INTO ingestion_logs (
                        trigger_type, trigger_source, force_full_sync, specific_page_ids
                    ) VALUES ($1, $2, $3, $4)
                    RETURNING id
                    """,
                    trigger_type, trigger_source, force_full_sync, specific_page_ids
                )
                print(f"📝 Created ingestion log entry: {ingestion_log_id}")
        except Exception as e:
            print(f"⚠️  Failed to create ingestion log: {e}")
            # Continue without logging
        
        # Initialize Meilisearch client
        meili_client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
        
        try:
            # Ensure Meilisearch index exists
            try:
                meili_client.create_index('articles', {'primaryKey': 'id'})
            except Exception:
                pass  # Index might already exist
            
            # Get last sync timestamp (unless forcing full sync)
            last_synced = None
            if not force_full_sync:
                async with db_pool.acquire() as conn:
                    last_synced = await conn.fetchval(
                        "SELECT last_synced FROM ingestion_state WHERE id = 1"
                    )
            
            print(f"🔄 Starting ingestion (force_full_sync={force_full_sync}, last_synced={last_synced})")
            
            # If specific page IDs provided, only process those
            if specific_page_ids:
                pages = [{'page_id': pid, 'category': 'Library'} for pid in specific_page_ids]
                print(f"📄 Processing {len(pages)} specific pages")
            else:
                # Fetch all pages from index
                pages = await notion_service.walk_index(settings.notion_index_page_id)
                print(f"📚 Found {len(pages)} total pages to check")
            
            # Track updated pages
            updated_slugs = []
            processed_count = 0
            skipped_count = 0
            
            # Process pages
            BATCH_SIZE = int(os.getenv('INGESTION_PARALLEL', '5'))
            
            async def process_page(page_info):
                nonlocal processed_count, skipped_count
                try:
                    # Fetch page details
                    page_detail = await notion_service.fetch_page_detail(page_info['page_id'])
                    
                    # Check if page needs update (unless forcing or specific pages)
                    if not force_full_sync and not specific_page_ids:
                        if last_synced and page_detail['last_edited_time'] <= last_synced:
                            skipped_count += 1
                            return None
                    
                    print(f"📝 Processing: {page_detail['title']} ({page_info['category']})")
                    
                    # Upsert to database and indexes
                    async with db_pool.acquire() as conn:
                        async with conn.transaction():
                            slug = await indexer_service.upsert_article(
                                conn,
                                meili_client,
                                page_detail,
                                page_info['category']
                            )
                    
                    processed_count += 1
                    return slug
                    
                except Exception as e:
                    print(f"❌ Error processing page {page_info['page_id']}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    return None
            
            # Process pages in batches
            for i in range(0, len(pages), BATCH_SIZE):
                batch = pages[i:i + BATCH_SIZE]
                results = await asyncio.gather(*[process_page(page_info) for page_info in batch])
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
                # Import here to avoid circular dependency
                from functions.ingestion.handler import trigger_revalidation
                await trigger_revalidation(updated_slugs)
            
            print(f"✅ Ingestion completed: {processed_count} processed, {skipped_count} skipped, {len(updated_slugs)} updated")
            
            # Update ingestion log
            if ingestion_log_id:
                try:
                    async with db_pool.acquire() as conn:
                        duration = int((datetime.now(timezone.utc) - _last_ingestion_start).total_seconds())
                        await conn.execute(
                            """
                            UPDATE ingestion_logs SET
                                completed_at = NOW(),
                                status = 'completed',
                                pages_processed = $2,
                                pages_skipped = $3,
                                pages_updated = $4,
                                duration_seconds = $5
                            WHERE id = $1
                            """,
                            ingestion_log_id, processed_count, skipped_count, len(updated_slugs), duration
                        )
                except Exception as e:
                    print(f"⚠️  Failed to update ingestion log: {e}")
            
            return {
                "status": "completed",
                "processed": processed_count,
                "skipped": skipped_count,
                "updated": len(updated_slugs),
                "updated_slugs": updated_slugs
            }
            
        finally:
            await db_pool.close()
            
    except Exception as e:
        print(f"❌ Ingestion failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "failed", "error": str(e)}
    finally:
        _ingestion_running = False

@router.post("/ingestion/trigger")
async def trigger_ingestion(
    request: IngestionTriggerRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(..., description="Bearer token")
):
    """Manually trigger the ingestion process"""
    # Validate token
    token = authorization.replace("Bearer ", "")
    if token != settings.revalidate_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if _ingestion_running:
        return {
            "status": "already_running",
            "message": "Ingestion is already in progress",
            "started_at": _last_ingestion_start
        }
    
    # Add ingestion to background tasks
    background_tasks.add_task(
        run_ingestion_task, 
        force_full_sync=request.force_full_sync,
        specific_page_ids=request.page_ids
    )
    
    return {
        "status": "started",
        "message": "Ingestion process started in background",
        "force_full_sync": request.force_full_sync,
        "page_ids": request.page_ids
    }

@router.get("/ingestion/status", response_model=IngestionStatusResponse)
async def get_ingestion_status(
    authorization: str = Header(..., description="Bearer token")
):
    """Get the current status of the ingestion process"""
    # Validate token
    token = authorization.replace("Bearer ", "")
    if token != settings.revalidate_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Get last sync time from database
    try:
        conn = await asyncpg.connect(settings.database_url)
        try:
            last_synced = await conn.fetchval(
                "SELECT last_synced FROM ingestion_state WHERE id = 1"
            )
        finally:
            await conn.close()
    except Exception as e:
        last_synced = None
    
    status = "running" if _ingestion_running else "idle"
    
    message = f"Ingestion is {status}"
    if _ingestion_running and _last_ingestion_start:
        duration = (datetime.now(timezone.utc) - _last_ingestion_start).total_seconds()
        message += f" (started {duration:.0f} seconds ago)"
    
    return IngestionStatusResponse(
        status=status,
        last_synced=last_synced,
        is_running=_ingestion_running,
        message=message
    )

@router.post("/ingestion/webhook")
async def ingestion_webhook(
    request: IngestionWebhookRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(None)
):
    """Webhook endpoint for external services to trigger ingestion"""
    # For webhook, we might use a different auth mechanism or validate the source
    # For now, we'll use the same token
    if authorization:
        token = authorization.replace("Bearer ", "")
        if token != settings.revalidate_token:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    print(f"📨 Webhook received: {request.event}")
    
    # Handle different event types
    if request.event == "page_updated" and request.page_id:
        # Single page update
        background_tasks.add_task(
            run_ingestion_task,
            force_full_sync=False,
            specific_page_ids=[request.page_id]
        )
        return {"status": "accepted", "message": f"Queued update for page {request.page_id}"}
    
    elif request.event == "full_sync":
        # Full sync requested
        background_tasks.add_task(run_ingestion_task, force_full_sync=True)
        return {"status": "accepted", "message": "Full sync queued"}
    
    elif request.event == "incremental_sync":
        # Normal incremental sync
        background_tasks.add_task(run_ingestion_task, force_full_sync=False)
        return {"status": "accepted", "message": "Incremental sync queued"}
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {request.event}")
