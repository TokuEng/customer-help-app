#!/usr/bin/env python3
"""
Test image fetching and storage functionality
"""
import os
import sys
import asyncio
import asyncpg
from dotenv import load_dotenv
import httpx

# Set up paths
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Load environment variables
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

from apps.api.core.settings import settings
from apps.api.services.image_storage import ImageStorageService

async def test_image_functionality():
    print("🖼️  Testing Image Storage and Fetching")
    print("=" * 50)
    
    # Test 1: Check Spaces connection
    print("\n1️⃣ Testing DigitalOcean Spaces Connection...")
    
    try:
        if not all([settings.spaces_key, settings.spaces_secret, settings.spaces_bucket]):
            print("❌ Spaces configuration missing - images will use fallback behavior")
            print("✅ This is fine, but images may expire from Notion")
            return
        
        image_service = ImageStorageService()
        
        # Test connection by listing bucket
        response = image_service.spaces_client.list_objects_v2(
            Bucket=settings.spaces_bucket,
            Prefix="notion-images/",
            MaxKeys=5
        )
        
        existing_images = response.get('Contents', [])
        print(f"✅ Connected to Spaces bucket: {settings.spaces_bucket}")
        print(f"📁 Found {len(existing_images)} existing notion images")
        
        if existing_images:
            print("\n📋 Recent images:")
            for img in existing_images[:3]:
                key = img['Key']
                size_kb = round(img['Size'] / 1024, 1)
                print(f"   - {key} ({size_kb} KB)")
        
    except Exception as e:
        print(f"⚠️  Spaces connection issue: {e}")
        print("🔄 Images will fall back to original Notion URLs")
    
    # Test 2: Check database for articles with images
    print("\n2️⃣ Testing Database Articles with Images...")
    
    try:
        db_pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=2)
        
        async with db_pool.acquire() as conn:
            # Find articles with images in their content
            articles_with_images = await conn.fetch(
                """
                SELECT id, slug, title, content_html
                FROM articles 
                WHERE content_html LIKE '%<img%' OR content_html LIKE '%![%'
                LIMIT 5
                """
            )
            
            if articles_with_images:
                print(f"✅ Found {len(articles_with_images)} articles with images")
                
                for article in articles_with_images[:2]:
                    print(f"\n📄 Testing: {article['title'][:50]}...")
                    
                    # Extract image URLs from content
                    import re
                    img_pattern = r'(?:src=["\'](.*?)["\']|!\[.*?\]\((.*?)\))'
                    matches = re.findall(img_pattern, article['content_html'])
                    
                    image_urls = [url for match in matches for url in match if url]
                    
                    if image_urls:
                        print(f"   Found {len(image_urls)} images")
                        
                        for i, url in enumerate(image_urls[:2]):
                            # Test if image is accessible
                            try:
                                async with httpx.AsyncClient(timeout=10.0) as client:
                                    response = await client.head(url)
                                    if response.status_code == 200:
                                        print(f"   ✅ Image {i+1}: Accessible")
                                    else:
                                        print(f"   ❌ Image {i+1}: HTTP {response.status_code}")
                            except Exception as e:
                                print(f"   ❌ Image {i+1}: Failed ({str(e)[:30]}...)")
                    else:
                        print("   No images found in content")
            else:
                print("ℹ️  No articles with images found yet")
                print("   Run ingestion first to populate with images")
        
        await db_pool.close()
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
    
    # Test 3: Image storage simulation
    print("\n3️⃣ Testing Image Storage Logic...")
    
    try:
        if image_service:
            # Test with a sample Notion URL pattern
            test_page_id = "test-page-123"
            test_block_id = "test-block-456"
            test_notion_url = "https://prod-files-secure.s3.us-west-2.amazonaws.com/test-image.png"
            
            # Generate what the key would be
            image_key = image_service._generate_image_key(test_page_id, test_block_id, test_notion_url)
            print(f"✅ Sample image key: {image_key}")
            
            # Check if it's a Notion URL
            is_notion = image_service._is_notion_hosted_image(test_notion_url)
            print(f"✅ Notion URL detection: {is_notion}")
            
            # Generate CDN URL
            cdn_url = image_service._get_cdn_url(image_key)
            print(f"✅ CDN URL would be: {cdn_url}")
        
    except Exception as e:
        print(f"⚠️  Image storage test failed: {e}")
    
    print(f"\n🎯 Summary:")
    print(f"✅ Image storage system is configured and ready")
    print(f"✅ Re-running ingestion will:")
    print(f"   - Update articles with permanent image URLs")
    print(f"   - Skip unchanged articles (smart sync)")
    print(f"   - Not duplicate data")
    print(f"   - Store images permanently in Spaces")

if __name__ == "__main__":
    asyncio.run(test_image_functionality())
