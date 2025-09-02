#!/usr/bin/env python3
"""
Script to test the work submission API endpoint
"""

import asyncio
import aiohttp
import json
import sys

async def test_work_submission(api_url):
    """Test the work submission endpoint"""
    
    # Test data matching what the frontend sends
    test_submission = {
        "request_type": "test",
        "title": "test",
        "description": "test",
        "priority": "medium",  # Changed from "Urgent" to lowercase
        "submitter_name": "test",
        "submitter_email": "test@test.com",
        "submitter_role": "Employee",  # This will be sent as a string
        "department": "e.g., Engineering, HR, Sales",
        "tags": []
    }
    
    print(f"🔄 Testing API endpoint: {api_url}/work-submissions")
    print(f"📋 Payload: {json.dumps(test_submission, indent=2)}")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                f"{api_url}/work-submissions",
                json=test_submission,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            ) as response:
                status = response.status
                content_type = response.headers.get('content-type', '')
                
                # Try to get response text
                try:
                    response_text = await response.text()
                except:
                    response_text = "Could not read response"
                
                print(f"\n📊 Response Status: {status}")
                print(f"📄 Content-Type: {content_type}")
                
                if status == 200 or status == 201:
                    print("✅ Success!")
                    if 'application/json' in content_type:
                        try:
                            data = json.loads(response_text)
                            print(f"📦 Response: {json.dumps(data, indent=2)}")
                        except:
                            print(f"📦 Response (raw): {response_text}")
                    else:
                        print(f"📦 Response: {response_text}")
                else:
                    print(f"❌ Error!")
                    print(f"📦 Response: {response_text}")
                    
                    # If it's a validation error, parse it
                    if status == 422 and 'application/json' in content_type:
                        try:
                            error_data = json.loads(response_text)
                            print("\n🚨 Validation Errors:")
                            if 'detail' in error_data:
                                for error in error_data['detail']:
                                    loc = ' -> '.join(str(x) for x in error['loc'])
                                    print(f"   - {loc}: {error['msg']}")
                        except:
                            pass
                
        except Exception as e:
            print(f"❌ Request failed: {type(e).__name__}: {str(e)}")

async def main():
    if len(sys.argv) > 1:
        api_url = sys.argv[1]
    else:
        # Default to production URL
        api_url = "https://customer-help-app-qjn3p.ondigitalocean.app/api"
        print(f"Using default API URL: {api_url}")
        print("To test a different URL, run: python test-work-submission-api.py <API_URL>")
    
    await test_work_submission(api_url)

if __name__ == "__main__":
    asyncio.run(main())
