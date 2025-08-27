#!/usr/bin/env python3
"""
Debug Notion page structure to understand how pages are linked
"""
import os
import sys
import asyncio
from dotenv import load_dotenv
from notion_client import AsyncClient
import json

# Set up paths
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Load environment variables
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

from apps.api.core.settings import settings

async def debug_notion_structure():
    print("🔍 Debugging Notion Page Structure\n")
    
    client = AsyncClient(auth=settings.notion_token)
    
    try:
        # Get all blocks from the index page
        print(f"Fetching blocks from index page: {settings.notion_index_page_id}\n")
        
        blocks = []
        has_more = True
        start_cursor = None
        
        while has_more:
            response = await client.blocks.children.list(
                block_id=settings.notion_index_page_id,
                start_cursor=start_cursor,
                page_size=100
            )
            blocks.extend(response['results'])
            has_more = response['has_more']
            start_cursor = response.get('next_cursor')
        
        print(f"Found {len(blocks)} blocks in the index page\n")
        
        # Analyze block types
        block_types = {}
        page_references = []
        
        for i, block in enumerate(blocks):
            block_type = block['type']
            block_types[block_type] = block_types.get(block_type, 0) + 1
            
            # Look for any page references
            if block_type == 'child_page':
                page_references.append({
                    'type': 'child_page',
                    'title': block['child_page'].get('title', 'Untitled'),
                    'block': block
                })
                
            elif block_type == 'link_to_page':
                page_references.append({
                    'type': 'link_to_page',
                    'page_id': block['link_to_page'].get('page_id'),
                    'block': block
                })
                
            elif block_type == 'child_database':
                page_references.append({
                    'type': 'child_database',
                    'title': block['child_database'].get('title', 'Untitled'),
                    'block': block
                })
            
            # Check for mentions in rich text
            if block_type in ['paragraph', 'bulleted_list_item', 'numbered_list_item', 'heading_1', 'heading_2', 'heading_3']:
                rich_text = block.get(block_type, {}).get('rich_text', [])
                for text_obj in rich_text:
                    if text_obj.get('type') == 'mention':
                        mention = text_obj.get('mention', {})
                        if mention.get('type') == 'page':
                            page_references.append({
                                'type': 'page_mention',
                                'page_id': mention['page']['id'],
                                'context': block,
                                'text': text_obj.get('plain_text', '')
                            })
            
            # Show first few blocks for debugging
            if i < 5:
                print(f"Block {i+1}: Type = {block_type}")
                if block_type in ['paragraph', 'heading_1', 'heading_2', 'heading_3']:
                    text = ' '.join([rt.get('plain_text', '') for rt in block.get(block_type, {}).get('rich_text', [])])
                    if text:
                        print(f"  Text: {text[:100]}...")
                print()
        
        print("\n📊 Block Type Summary:")
        for block_type, count in sorted(block_types.items()):
            print(f"  - {block_type}: {count}")
        
        print(f"\n📄 Found {len(page_references)} page references:")
        for i, ref in enumerate(page_references[:10]):  # Show first 10
            print(f"\n{i+1}. Type: {ref['type']}")
            if ref['type'] == 'child_page':
                print(f"   Title: {ref['title']}")
            elif ref['type'] == 'page_mention':
                print(f"   Text: {ref.get('text', 'N/A')}")
                print(f"   Page ID: {ref.get('page_id', 'N/A')}")
            elif ref['type'] == 'link_to_page':
                print(f"   Page ID: {ref.get('page_id', 'N/A')}")
        
        if len(page_references) > 10:
            print(f"\n... and {len(page_references) - 10} more")
            
        # Try to fetch databases in the workspace
        print("\n\n🗄️  Checking for databases in workspace...")
        try:
            db_response = await client.search(
                filter={"property": "object", "value": "database"}
            )
            print(f"Found {len(db_response.get('results', []))} databases")
            for db in db_response.get('results', [])[:3]:
                print(f"  - {db.get('title', [{}])[0].get('plain_text', 'Untitled')}")
        except Exception as e:
            print(f"Could not search databases: {e}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_notion_structure())
