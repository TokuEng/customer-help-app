#!/usr/bin/env python3
"""
Test Notion connection and configuration
"""
import os
import sys
import asyncio
from dotenv import load_dotenv

# Set up paths
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Load environment variables
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    print("❌ No .env file found at apps/api/.env")
    sys.exit(1)

# Import after loading env
from apps.api.services.notion import NotionService
from apps.api.core.settings import settings

async def test_notion():
    print("🔍 Testing Notion Connection...\n")
    
    # Check environment variables
    print("1️⃣ Environment Variables:")
    print(f"   NOTION_TOKEN: {'✅ Set' if settings.notion_token else '❌ Not set'}")
    print(f"   NOTION_INDEX_PAGE_ID: {'✅ Set' if settings.notion_index_page_id else '❌ Not set'}")
    
    if settings.notion_token:
        print(f"   Token starts with: {settings.notion_token[:10]}...")
    if settings.notion_index_page_id:
        print(f"   Index Page ID: {settings.notion_index_page_id}")
    
    if not settings.notion_token or not settings.notion_index_page_id:
        print("\n❌ Missing required environment variables!")
        print("\nTo fix this:")
        print("1. Create a Notion integration at https://notion.so/my-integrations")
        print("2. Get your index page ID from the Notion URL")
        print("3. Update apps/api/.env with:")
        print("   NOTION_TOKEN=secret_your-token-here")
        print("   NOTION_INDEX_PAGE_ID=your-page-id-here")
        return
    
    print("\n2️⃣ Testing Notion API Connection...")
    
    try:
        notion_service = NotionService()
        
        # Test getting the index page
        print(f"\n3️⃣ Fetching index page: {settings.notion_index_page_id}")
        
        # Try to get page info
        page_info = await notion_service.client.pages.retrieve(page_id=settings.notion_index_page_id)
        print("   ✅ Successfully connected to Notion!")
        print(f"   Page URL: {page_info.get('url', 'N/A')}")
        
        # Try to walk the index
        print("\n4️⃣ Walking index structure...")
        pages = await notion_service.walk_index(settings.notion_index_page_id)
        print(f"   Found {len(pages)} pages")
        
        if pages:
            print("\n   Pages found:")
            for i, page_info in enumerate(pages[:10]):  # Show first 10
                page_id = page_info.get('page_id', 'Unknown')
                category = page_info.get('category', 'Unknown')
                # Fetch title from page
                try:
                    page_detail = await notion_service.client.pages.retrieve(page_id=page_id)
                    title = 'Untitled'
                    if 'properties' in page_detail and 'title' in page_detail['properties']:
                        title_prop = page_detail['properties']['title']
                        if title_prop['type'] == 'title' and title_prop.get('title'):
                            title = title_prop['title'][0].get('plain_text', 'Untitled')
                    elif 'child_page' in page_detail:
                        title = page_detail['child_page'].get('title', 'Untitled')
                    # Try to get title from the block itself
                    else:
                        block = await notion_service.client.blocks.retrieve(block_id=page_id)
                        if block['type'] == 'child_page':
                            title = block['child_page'].get('title', 'Untitled')
                except:
                    title = 'Error fetching title'
                    
                print(f"   {i+1}. {title} (Category: {category})")
            if len(pages) > 10:
                print(f"   ... and {len(pages) - 10} more")
        else:
            print("\n   ⚠️  No pages found. Check that:")
            print("   - Your index page has the expected structure")
            print("   - The page contains links to other pages")
            print("   - The integration has access to all linked pages")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nCommon issues:")
        print("1. Invalid NOTION_TOKEN - regenerate at https://notion.so/my-integrations")
        print("2. Invalid NOTION_INDEX_PAGE_ID - copy from Notion URL")
        print("3. Integration doesn't have access - share pages with your integration")
        print("4. Index page structure - ensure it has headings: Library, Token Payroll, Benefits, Policy")

if __name__ == "__main__":
    asyncio.run(test_notion())
