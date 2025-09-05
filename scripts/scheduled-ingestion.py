#!/usr/bin/env python3
"""
Scheduled ingestion script for automated Notion content sync
Can be used with cron, systemd timers, or DigitalOcean scheduled jobs
"""
import os
import sys
import asyncio
import httpx
from datetime import datetime, timezone
import logging
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

async def trigger_ingestion_via_api():
    """Trigger ingestion through the API endpoint"""
    api_url = os.getenv('API_URL', 'http://localhost:8080')
    revalidate_token = os.getenv('REVALIDATE_TOKEN')
    
    if not revalidate_token:
        logger.error("REVALIDATE_TOKEN not found in environment")
        return False
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # 5 minute timeout
            response = await client.post(
                f"{api_url}/api/ingestion/trigger",
                json={"force_full_sync": False},
                headers={"Authorization": f"Bearer {revalidate_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Ingestion triggered successfully: {data['message']}")
                return True
            else:
                logger.error(f"Failed to trigger ingestion: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error triggering ingestion: {e}")
        return False

async def check_ingestion_status():
    """Check if ingestion is already running"""
    api_url = os.getenv('API_URL', 'http://localhost:8080')
    revalidate_token = os.getenv('REVALIDATE_TOKEN')
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{api_url}/api/ingestion/status",
                headers={"Authorization": f"Bearer {revalidate_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data['is_running']
            else:
                logger.warning(f"Could not check status: {response.status_code}")
                return None
                
    except Exception as e:
        logger.warning(f"Error checking status: {e}")
        return None

async def run_direct_ingestion():
    """Run ingestion directly (fallback if API is not available)"""
    sys.path.append(project_root)
    
    try:
        from functions.ingestion.handler import sync_notion_content
        logger.info("Running direct ingestion...")
        await sync_notion_content()
        logger.info("Direct ingestion completed")
        return True
    except Exception as e:
        logger.error(f"Direct ingestion failed: {e}")
        return False

async def main():
    """Main entry point for scheduled ingestion"""
    logger.info("=" * 60)
    logger.info(f"Scheduled ingestion started at {datetime.now(timezone.utc)}")
    
    # Check if we should use API or direct mode
    use_api = os.getenv('USE_API_TRIGGER', 'true').lower() == 'true'
    
    if use_api:
        # Check if ingestion is already running
        is_running = await check_ingestion_status()
        
        if is_running:
            logger.info("Ingestion is already running, skipping...")
            return
        elif is_running is None:
            logger.warning("Could not check status, attempting to trigger anyway...")
        
        # Trigger via API
        success = await trigger_ingestion_via_api()
        
        if not success:
            logger.warning("API trigger failed, falling back to direct ingestion...")
            await run_direct_ingestion()
    else:
        # Run directly
        await run_direct_ingestion()
    
    logger.info("Scheduled ingestion completed")
    logger.info("=" * 60)

if __name__ == "__main__":
    # For production DigitalOcean deployment
    if os.getenv('DO_DEPLOYMENT') == 'true':
        # Set production values
        os.environ['API_URL'] = os.getenv('APP_URL', 'https://customer-help-center.ondigitalocean.app') + '/api'
        os.environ['USE_API_TRIGGER'] = 'false'  # Run directly in scheduled job
    
    asyncio.run(main())


