#!/usr/bin/env python3
"""
Test the automatic ingestion API endpoints
"""
import asyncio
import httpx
import os
from datetime import datetime
from dotenv import load_dotenv
import argparse
import json

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

class IngestionAPITester:
    def __init__(self, api_url=None, token=None):
        self.api_url = api_url or os.getenv('API_URL', 'http://localhost:8080')
        self.token = token or os.getenv('REVALIDATE_TOKEN')
        
        if not self.token:
            raise ValueError("REVALIDATE_TOKEN not found. Set it in .env or pass as argument")
    
    async def test_status(self):
        """Test the status endpoint"""
        print("\n🔍 Testing GET /api/ingestion/status...")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/api/ingestion/status",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                
                print(f"Status Code: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Success!")
                    print(f"   Status: {data['status']}")
                    print(f"   Running: {data['is_running']}")
                    print(f"   Last Synced: {data['last_synced']}")
                    print(f"   Message: {data['message']}")
                    return True
                else:
                    print(f"❌ Failed: {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Error: {e}")
                return False
    
    async def test_trigger(self, force_full_sync=False, page_ids=None):
        """Test the trigger endpoint"""
        print(f"\n🚀 Testing POST /api/ingestion/trigger...")
        print(f"   Force Full Sync: {force_full_sync}")
        print(f"   Page IDs: {page_ids}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                payload = {"force_full_sync": force_full_sync}
                if page_ids:
                    payload["page_ids"] = page_ids
                
                response = await client.post(
                    f"{self.api_url}/api/ingestion/trigger",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                
                print(f"Status Code: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Success!")
                    print(f"   Status: {data['status']}")
                    print(f"   Message: {data['message']}")
                    return True
                else:
                    print(f"❌ Failed: {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Error: {e}")
                return False
    
    async def test_webhook(self, event_type="incremental_sync", page_id=None):
        """Test the webhook endpoint"""
        print(f"\n📨 Testing POST /api/ingestion/webhook...")
        print(f"   Event: {event_type}")
        print(f"   Page ID: {page_id}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                payload = {"event": event_type}
                if page_id:
                    payload["page_id"] = page_id
                payload["timestamp"] = datetime.utcnow().isoformat() + "Z"
                
                response = await client.post(
                    f"{self.api_url}/api/ingestion/webhook",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.token}"}
                )
                
                print(f"Status Code: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Success!")
                    print(f"   Status: {data['status']}")
                    print(f"   Message: {data['message']}")
                    return True
                else:
                    print(f"❌ Failed: {response.text}")
                    return False
                    
            except Exception as e:
                print(f"❌ Error: {e}")
                return False
    
    async def monitor_ingestion(self, timeout=300):
        """Monitor ingestion progress"""
        print(f"\n⏳ Monitoring ingestion progress (timeout: {timeout}s)...")
        
        start_time = datetime.utcnow()
        was_running = False
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        f"{self.api_url}/api/ingestion/status",
                        headers={"Authorization": f"Bearer {self.token}"}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        is_running = data['is_running']
                        
                        # State change detection
                        if is_running and not was_running:
                            print(f"\n🟢 Ingestion started!")
                        elif not is_running and was_running:
                            print(f"\n🏁 Ingestion completed!")
                            return True
                        
                        was_running = is_running
                        
                        # Progress indicator
                        if is_running:
                            print(".", end="", flush=True)
                        
                except Exception:
                    print("!", end="", flush=True)
            
            await asyncio.sleep(5)
        
        print(f"\n⏰ Timeout reached")
        return False

async def main():
    parser = argparse.ArgumentParser(description='Test ingestion API endpoints')
    parser.add_argument('--api-url', help='API URL (default: from env or localhost:8080)')
    parser.add_argument('--token', help='Bearer token (default: from env REVALIDATE_TOKEN)')
    parser.add_argument('--test', choices=['status', 'trigger', 'webhook', 'all'], 
                       default='all', help='Which endpoint to test')
    parser.add_argument('--force-sync', action='store_true', help='Force full sync when testing trigger')
    parser.add_argument('--page-ids', nargs='+', help='Specific page IDs to sync')
    parser.add_argument('--monitor', action='store_true', help='Monitor ingestion after trigger')
    parser.add_argument('--production', action='store_true', help='Use production URL')
    
    args = parser.parse_args()
    
    # Set production URL if requested
    if args.production:
        api_url = 'https://customer-help-center.ondigitalocean.app'
    else:
        api_url = args.api_url
    
    try:
        tester = IngestionAPITester(api_url, args.token)
    except ValueError as e:
        print(f"❌ {e}")
        return
    
    print("=" * 60)
    print(f"Ingestion API Test")
    print(f"API URL: {tester.api_url}")
    print(f"Token: {tester.token[:10]}...")
    print("=" * 60)
    
    success = True
    
    # Run tests
    if args.test in ['status', 'all']:
        success &= await tester.test_status()
    
    if args.test in ['trigger', 'all']:
        success &= await tester.test_trigger(args.force_sync, args.page_ids)
        
        if args.monitor and success:
            await tester.monitor_ingestion()
    
    if args.test in ['webhook', 'all']:
        success &= await tester.test_webhook()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())


