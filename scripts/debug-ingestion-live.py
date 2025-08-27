#!/usr/bin/env python3
"""
Debug live ingestion - show what's happening
"""
import os
import sys
import asyncio
import asyncpg
from meilisearch import Client
from notion_client import AsyncClient as NotionClient
from dotenv import load_dotenv

# Add parent directory to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Load environment
load_dotenv(os.path.join(project_root, 'apps/api/.env'))

async def test_components():
    print("🔍 Testing each component...\n")
    
    # 1. Database
    print("1️⃣ Testing Database...")
    db_url = os.environ.get('DO_DATABASE_URL', os.environ.get('DATABASE_URL'))
    try:
        conn = await asyncpg.connect(db_url)
        count = await conn.fetchval("SELECT COUNT(*) FROM articles")
        print(f"✅ Database connected. Articles in DB: {count}")
        await conn.close()
    except Exception as e:
        print(f"❌ Database error: {e}")
        return
    
    # 2. Meilisearch
    print("\n2️⃣ Testing Meilisearch...")
    try:
        client = Client('http://147.182.245.91:7700', 'NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk')
        health = client.health()
        print(f"✅ Meilisearch connected: {health}")
        
        # Check if index exists
        try:
            index = client.index('articles')
            stats = index.get_stats()
            print(f"📊 Articles in Meilisearch: {stats.get('numberOfDocuments', 0)}")
        except:
            print("📝 Articles index doesn't exist yet")
    except Exception as e:
        print(f"❌ Meilisearch error: {e}")
    
    # 3. Notion
    print("\n3️⃣ Testing Notion API...")
    notion_token = os.environ.get('NOTION_TOKEN')
    page_id = os.environ.get('NOTION_INDEX_PAGE_ID')
    
    if not notion_token or not page_id:
        print("❌ Missing NOTION_TOKEN or NOTION_INDEX_PAGE_ID")
        return
        
    try:
        notion = NotionClient(auth=notion_token)
        # Test by getting the page
        page = await notion.pages.retrieve(page_id)
        print(f"✅ Notion connected. Page title: {page.get('properties', {}).get('title', {}).get('title', [{}])[0].get('text', {}).get('content', 'Unknown')}")
        
        # Try to list child pages
        children = await notion.blocks.children.list(page_id)
        print(f"📄 Found {len(children['results'])} child blocks/pages")
    except Exception as e:
        print(f"❌ Notion error: {e}")
        print(f"   Token: {notion_token[:20]}... (first 20 chars)")
        print(f"   Page ID: {page_id}")

if __name__ == "__main__":
    print("🐛 Live Ingestion Debugger")
    print("=" * 50)
    asyncio.run(test_components())

