#!/usr/bin/env python3
"""
Script to test admin work submissions functionality
"""

import asyncio
import aiohttp
import json
from datetime import datetime

async def test_admin_endpoints(api_url):
    """Test all admin work submission endpoints"""
    
    print("🔍 Testing Admin Work Submissions Endpoints")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Get all submissions
        print("\n1️⃣ Testing GET /api/work-submissions")
        try:
            async with session.get(f"{api_url}/work-submissions") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Success! Found {len(data)} submissions")
                    if data:
                        print(f"   Latest submission: {data[0]['title']} ({data[0]['status']})")
                else:
                    print(f"❌ Error: Status {response.status}")
                    print(f"   Response: {await response.text()}")
        except Exception as e:
            print(f"❌ Failed: {e}")
        
        # Test 2: Test with filters
        print("\n2️⃣ Testing GET /api/work-submissions with filters")
        filters = [
            {"status": "pending"},
            {"priority": "urgent"},
            {"status": "pending", "priority": "high"}
        ]
        
        for filter_params in filters:
            query = "&".join([f"{k}={v}" for k, v in filter_params.items()])
            try:
                async with session.get(f"{api_url}/work-submissions?{query}") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Filter {filter_params}: Found {len(data)} submissions")
                    else:
                        print(f"❌ Filter {filter_params}: Error {response.status}")
            except Exception as e:
                print(f"❌ Filter {filter_params}: Failed - {e}")
        
        # Test 3: Test pagination
        print("\n3️⃣ Testing pagination")
        try:
            async with session.get(f"{api_url}/work-submissions?limit=5&offset=0") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Pagination: Retrieved {len(data)} items (max 5)")
                else:
                    print(f"❌ Pagination: Error {response.status}")
        except Exception as e:
            print(f"❌ Pagination: Failed - {e}")
        
        # Test 4: Create a test submission to verify full flow
        print("\n4️⃣ Creating test submission")
        test_submission = {
            "request_type": "Admin Test",
            "title": f"Admin Test - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "description": "Test submission created by admin test script",
            "priority": "low",
            "submitter_name": "Admin Test Script",
            "submitter_email": "admin@test.com",
            "submitter_role": "admin",
            "department": "IT",
            "tags": ["test", "admin-check"]
        }
        
        try:
            async with session.post(
                f"{api_url}/work-submissions",
                json=test_submission,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status in [200, 201]:
                    data = await response.json()
                    submission_id = data['id']
                    print(f"✅ Created test submission: ID={submission_id}")
                    
                    # Test 5: Get specific submission
                    print("\n5️⃣ Testing GET specific submission")
                    async with session.get(f"{api_url}/work-submissions/{submission_id}") as resp:
                        if resp.status == 200:
                            submission = await resp.json()
                            print(f"✅ Retrieved submission: {submission['title']}")
                        else:
                            print(f"❌ Get specific: Error {resp.status}")
                else:
                    print(f"❌ Create failed: Status {response.status}")
                    print(f"   Response: {await response.text()}")
        except Exception as e:
            print(f"❌ Create failed: {e}")

async def main():
    # Default to production URL
    api_url = "https://customer-help-app-qjn3p.ondigitalocean.app/api"
    
    # First check if the API is reachable
    print(f"🌐 Testing API at: {api_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_url.replace('/api', '')}/healthz") as response:
                if response.status == 200:
                    print("✅ API is reachable\n")
                    await test_admin_endpoints(api_url)
                else:
                    print(f"❌ API health check failed: {response.status}")
    except Exception as e:
        print(f"❌ Cannot reach API: {e}")
        print("\n💡 Testing with local API instead...")
        await test_admin_endpoints("http://localhost:8080/api")

if __name__ == "__main__":
    asyncio.run(main())
