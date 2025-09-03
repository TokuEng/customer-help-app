#!/usr/bin/env python3
"""
Check images in a specific article to diagnose loading issues
"""
import asyncio
import asyncpg
import os
import re
import httpx
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

DATABASE_URL = os.getenv('DO_DATABASE_URL') or os.getenv('DATABASE_URL')

async def check_article_images(article_title=None):
    if not DATABASE_URL:
        print("❌ No DATABASE_URL found!")
        return
    
    print("🔍 Checking Article Images")
    print("=" * 50)
    
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected to database")
        
        # Find the article
        if article_title:
            article = await conn.fetchrow("""
                SELECT id, title, content_html, content_md
                FROM articles 
                WHERE LOWER(title) LIKE LOWER($1)
                LIMIT 1
            """, f'%{article_title}%')
        else:
            # Get an article with images
            article = await conn.fetchrow("""
                SELECT id, title, content_html, content_md
                FROM articles 
                WHERE content_html LIKE '%<img%' OR content_md LIKE '%![%'
                LIMIT 1
            """)
        
        if not article:
            print(f"❌ No article found with title containing '{article_title}'")
            await conn.close()
            return
        
        print(f"\n📄 Article: {article['title']}")
        print(f"   ID: {article['id']}")
        
        # Extract image URLs from both HTML and Markdown
        html_images = []
        md_images = []
        
        # Extract from HTML
        if article['content_html']:
            img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
            html_images = re.findall(img_pattern, article['content_html'])
        
        # Extract from Markdown
        if article['content_md']:
            md_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
            md_matches = re.findall(md_pattern, article['content_md'])
            md_images = [url for _, url in md_matches]
        
        all_images = list(set(html_images + md_images))
        
        if not all_images:
            print("   No images found in this article")
            await conn.close()
            return
        
        print(f"\n🖼️  Found {len(all_images)} unique images")
        
        # Categorize images
        spaces_images = []
        notion_images = []
        external_images = []
        
        for url in all_images:
            if 'digitaloceanspaces.com' in url:
                spaces_images.append(url)
            elif any(domain in url for domain in ['notion-static.com', 'prod-files-secure', 's3.us-west-2.amazonaws.com']):
                notion_images.append(url)
            else:
                external_images.append(url)
        
        print(f"\n📊 Image breakdown:")
        print(f"   - DigitalOcean Spaces: {len(spaces_images)}")
        print(f"   - Notion (temporary): {len(notion_images)}")
        print(f"   - External: {len(external_images)}")
        
        # Test each image
        print(f"\n🧪 Testing image accessibility...")
        
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            # Test Spaces images
            if spaces_images:
                print(f"\n✅ DigitalOcean Spaces Images:")
                for i, url in enumerate(spaces_images[:5]):  # Test first 5
                    try:
                        response = await client.head(url)
                        parsed = urlparse(url)
                        filename = parsed.path.split('/')[-1][:40]
                        if response.status_code == 200:
                            print(f"   {i+1}. ✅ {filename}... - OK")
                        else:
                            print(f"   {i+1}. ❌ {filename}... - HTTP {response.status_code}")
                    except Exception as e:
                        print(f"   {i+1}. ❌ Error: {str(e)[:50]}...")
            
            # Test Notion images
            if notion_images:
                print(f"\n⚠️  Notion Temporary Images:")
                for i, url in enumerate(notion_images[:5]):  # Test first 5
                    try:
                        response = await client.head(url)
                        parsed = urlparse(url)
                        if response.status_code == 200:
                            print(f"   {i+1}. ✅ Currently accessible (but will expire!)")
                        else:
                            print(f"   {i+1}. ❌ EXPIRED - HTTP {response.status_code}")
                    except Exception as e:
                        print(f"   {i+1}. ❌ Error: {str(e)[:50]}...")
            
            # Test external images
            if external_images:
                print(f"\n🌐 External Images:")
                for i, url in enumerate(external_images[:5]):  # Test first 5
                    try:
                        response = await client.head(url)
                        domain = urlparse(url).netloc
                        if response.status_code == 200:
                            print(f"   {i+1}. ✅ {domain} - OK")
                        else:
                            print(f"   {i+1}. ❌ {domain} - HTTP {response.status_code}")
                    except Exception as e:
                        print(f"   {i+1}. ❌ Error: {str(e)[:50]}...")
        
        # Check when article was last synced
        ingestion_state = await conn.fetchrow("SELECT * FROM ingestion_state WHERE id = 1")
        if ingestion_state:
            print(f"\n⏰ Last sync: {ingestion_state['last_synced']}")
        
        # Summary and recommendations
        print(f"\n💡 Analysis:")
        if notion_images:
            print(f"   ❌ {len(notion_images)} images are still using Notion URLs")
            print(f"      These WILL expire and break!")
            print(f"      Solution: Re-run ingestion to migrate these to Spaces")
        
        if spaces_images:
            failed_spaces = 0
            for url in spaces_images:
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        response = await client.head(url)
                        if response.status_code != 200:
                            failed_spaces += 1
                except:
                    failed_spaces += 1
            
            if failed_spaces > 0:
                print(f"   ⚠️  {failed_spaces} Spaces images are not accessible")
                print(f"      Check: Spaces bucket permissions, CDN configuration")
        
        print(f"\n📋 Recommendations:")
        if notion_images:
            print(f"   1. Re-run ingestion to migrate Notion images to Spaces:")
            print(f"      python scripts/run-ingestion-do.py")
        print(f"   2. Check DigitalOcean Spaces configuration:")
        print(f"      - Bucket exists and is accessible")
        print(f"      - CORS policy is set correctly")
        print(f"      - CDN endpoint is configured")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import sys
    article_title = sys.argv[1] if len(sys.argv) > 1 else "How To Create an Employee Report"
    asyncio.run(check_article_images(article_title))

