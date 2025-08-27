#!/usr/bin/env python3
"""
Run ingestion through your deployed API
This bypasses the need for direct Meilisearch access
"""
import httpx
import asyncio
import os

async def trigger_ingestion():
    # Get your app URL
    app_url = input("Enter your DO app URL (e.g., https://customer-help-center-xxxxx.ondigitalocean.app): ").strip()
    
    if not app_url:
        print("❌ App URL is required")
        return
    
    # Your revalidation token
    token = "MJHXGOOpaglqgS3f+4l3P6aYXfoYlE3LghMSHt9w7gw="
    
    print(f"\n🚀 Triggering ingestion via API...")
    print(f"📍 URL: {app_url}/api/revalidate")
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{app_url}/api/revalidate",
                headers={"X-Revalidate-Token": token},
                json={"type": "full"}
            )
            
            if response.status_code == 200:
                print("✅ Ingestion triggered successfully!")
                result = response.json()
                print(f"📊 Result: {result}")
            else:
                print(f"❌ Error: {response.status_code}")
                print(response.text)
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    print("🔄 Ingestion via Deployed API")
    print("=" * 50)
    print("This triggers ingestion through your deployed app,")
    print("which already has access to the private Meilisearch.\n")
    
    asyncio.run(trigger_ingestion())
