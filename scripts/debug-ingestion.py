#!/usr/bin/env python3
"""
Debug ingestion issues
"""
import os
import sys
import httpx
import asyncio
import asyncpg
from meilisearch import Client

async def test_all_connections():
    print("🔍 Testing all connections needed for ingestion...\n")
    
    # 1. Test Database
    print("1️⃣ Testing Database Connection...")
    db_url = os.environ.get('DO_DATABASE_URL')
    if not db_url:
        print("❌ DO_DATABASE_URL not set")
        return
    
    try:
        conn = await asyncpg.connect(db_url)
        print("✅ Database connected")
        await conn.close()
    except Exception as e:
        print(f"❌ Database error: {e}")
        return
    
    # 2. Test Meilisearch
    print("\n2️⃣ Testing Meilisearch Connection...")
    meili_host = 'http://10.124.0.39:7700'
    meili_key = 'NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk'
    
    try:
        # First test if we can reach it
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{meili_host}/health")
            print(f"✅ Meilisearch reachable (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Cannot reach Meilisearch at {meili_host}")
        print(f"   Error: {e}")
        print("\n💡 This is a private IP - it won't work from your local machine!")
        print("   Options:")
        print("   1. Run ingestion from a DO droplet in the same VPC")
        print("   2. Use port forwarding through your deployed app")
        print("   3. Deploy Meilisearch with a public endpoint")
        return
    
    # 3. Test Notion
    print("\n3️⃣ Testing Notion API...")
    notion_token = os.environ.get('NOTION_TOKEN')
    if not notion_token:
        print("❌ NOTION_TOKEN not set")
        return
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.notion.com/v1/users/me",
                headers={
                    "Authorization": f"Bearer {notion_token}",
                    "Notion-Version": "2022-06-28"
                }
            )
            if response.status_code == 200:
                print("✅ Notion API connected")
            else:
                print(f"❌ Notion API error: {response.status_code}")
    except Exception as e:
        print(f"❌ Notion error: {e}")
    
    # 4. Test OpenAI
    print("\n4️⃣ Testing OpenAI API...")
    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        print("❌ OPENAI_API_KEY not set")
        return
    
    print("✅ OpenAI API key present")
    
    print("\n" + "="*50)
    print("📋 Summary: The issue is likely Meilisearch access")
    print("="*50)

if __name__ == "__main__":
    # Load env
    from dotenv import load_dotenv
    load_dotenv('apps/api/.env')
    
    asyncio.run(test_all_connections())

