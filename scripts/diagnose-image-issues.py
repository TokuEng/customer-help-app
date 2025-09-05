#!/usr/bin/env python3
"""
Diagnose image display issues in production
"""
import asyncio
import asyncpg
import os
import httpx
import boto3
from dotenv import load_dotenv

# Load environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

# Use the production DATABASE_URL from your env vars
DATABASE_URL = os.getenv('DATABASE_URL')
SPACES_KEY = os.getenv('SPACES_KEY')
SPACES_SECRET = os.getenv('SPACES_SECRET')
SPACES_BUCKET = os.getenv('SPACES_BUCKET')
SPACES_REGION = os.getenv('SPACES_REGION', 'sfo3')
SPACES_CDN_ENDPOINT = os.getenv('SPACES_CDN_ENDPOINT')

async def diagnose_images():
    print("🔍 Diagnosing Image Display Issues in Production")
    print("=" * 60)
    
    # Check environment configuration
    print("\n1️⃣ Environment Configuration:")
    print(f"   DATABASE_URL: {'✅ Set' if DATABASE_URL else '❌ Missing'}")
    print(f"   SPACES_KEY: {'✅ Set' if SPACES_KEY else '❌ Missing'}")
    print(f"   SPACES_SECRET: {'✅ Set' if SPACES_SECRET else '❌ Missing'}")
    print(f"   SPACES_BUCKET: {SPACES_BUCKET or '❌ Missing'}")
    print(f"   SPACES_REGION: {SPACES_REGION}")
    print(f"   SPACES_CDN_ENDPOINT: {SPACES_CDN_ENDPOINT or '❌ Missing'}")
    
    if not all([DATABASE_URL, SPACES_KEY, SPACES_SECRET, SPACES_BUCKET]):
        print("\n❌ Missing required environment variables!")
        return
    
    # Test Spaces connectivity
    print("\n2️⃣ Testing DigitalOcean Spaces Connection:")
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=f"https://{SPACES_REGION}.digitaloceanspaces.com",
            aws_access_key_id=SPACES_KEY,
            aws_secret_access_key=SPACES_SECRET,
            region_name=SPACES_REGION
        )
        
        # List objects to test connection
        response = s3_client.list_objects_v2(Bucket=SPACES_BUCKET, MaxKeys=1)
        print(f"   ✅ Connected to Spaces bucket: {SPACES_BUCKET}")
        
        # Check bucket policy
        try:
            policy = s3_client.get_bucket_policy(Bucket=SPACES_BUCKET)
            print("   ✅ Bucket has a policy configured")
        except Exception as e:
            if 'NoSuchBucketPolicy' in str(e):
                print("   ⚠️  No bucket policy found - images might not be publicly accessible!")
            else:
                print(f"   ⚠️  Could not check bucket policy: {str(e)}")
        
        # Check CORS configuration
        try:
            cors = s3_client.get_bucket_cors(Bucket=SPACES_BUCKET)
            print("   ✅ CORS configuration found")
            for rule in cors.get('CORSRules', []):
                print(f"      - Allowed Origins: {rule.get('AllowedOrigins', [])}")
                print(f"      - Allowed Methods: {rule.get('AllowedMethods', [])}")
        except Exception as e:
            if 'NoSuchCORSConfiguration' in str(e):
                print("   ⚠️  No CORS configuration - this might cause issues!")
                print("      Images may be blocked by browser CORS policy")
            else:
                print(f"   ⚠️  Could not check CORS: {str(e)}")
            
    except Exception as e:
        print(f"   ❌ Failed to connect to Spaces: {str(e)}")
        return
    
    # Check database for articles with images
    print("\n3️⃣ Checking Database for Articles with Images:")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Count articles with different image types
        spaces_count = await conn.fetchval("""
            SELECT COUNT(*) FROM articles 
            WHERE content_html LIKE '%digitaloceanspaces.com%'
        """)
        
        notion_count = await conn.fetchval("""
            SELECT COUNT(*) FROM articles 
            WHERE (content_html LIKE '%secure.notion-static.com%' 
                   OR content_html LIKE '%prod-files-secure%')
        """)
        
        print(f"   📊 Articles with Spaces images: {spaces_count}")
        print(f"   📊 Articles with Notion images: {notion_count}")
        
        # Get a sample article with Spaces images
        sample = await conn.fetchrow("""
            SELECT id, title, slug, 
                   substring(content_html from '(https://[^"]*digitaloceanspaces[^"]*)') as sample_url
            FROM articles 
            WHERE content_html LIKE '%digitaloceanspaces.com%'
            LIMIT 1
        """)
        
        if sample and sample['sample_url']:
            print(f"\n4️⃣ Testing Sample Image from '{sample['title']}':")
            print(f"   URL: {sample['sample_url'][:80]}...")
            
            # Test direct access
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                try:
                    response = await client.get(sample['sample_url'])
                    print(f"   Direct Access: {'✅ OK' if response.status_code == 200 else f'❌ HTTP {response.status_code}'}")
                    
                    if response.status_code == 200:
                        print(f"   Content-Type: {response.headers.get('content-type', 'Unknown')}")
                        print(f"   Content-Length: {len(response.content) / 1024:.1f} KB")
                    else:
                        print(f"   Response: {response.text[:200]}")
                        
                except Exception as e:
                    print(f"   ❌ Failed to fetch: {str(e)}")
            
            # Test CDN access if configured
            if SPACES_CDN_ENDPOINT and 'cdn.' not in sample['sample_url']:
                # Extract the path after bucket name
                import re
                match = re.search(f'{SPACES_BUCKET}/(.+)', sample['sample_url'])
                if match:
                    cdn_url = f"{SPACES_CDN_ENDPOINT}/{match.group(1)}"
                    print(f"\n   Testing CDN URL: {cdn_url[:80]}...")
                    
                    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                        try:
                            response = await client.get(cdn_url)
                            print(f"   CDN Access: {'✅ OK' if response.status_code == 200 else f'❌ HTTP {response.status_code}'}")
                        except Exception as e:
                            print(f"   ❌ CDN Failed: {str(e)}")
        
        await conn.close()
        
    except Exception as e:
        print(f"   ❌ Database error: {str(e)}")
    
    # Recommendations
    print("\n💡 Recommendations:")
    print("\n1. If images are returning 403 Forbidden:")
    print("   - Check bucket permissions in DigitalOcean console")
    print("   - Ensure 'File Listing' is set to 'Restricted' (not private)")
    print("   - Files should be uploaded with ACL='public-read'")
    
    print("\n2. If CORS errors in browser console:")
    print("   - Add CORS configuration to your Spaces bucket:")
    print("   - Allow origins: ['*'] or your specific domain")
    print("   - Allow methods: ['GET', 'HEAD']")
    print("   - Allow headers: ['*']")
    
    print("\n3. If using CDN:")
    print("   - Ensure CDN is enabled for your Space")
    print("   - Update SPACES_CDN_ENDPOINT in production")
    print("   - CDN URLs are faster and more reliable")
    
    print("\n4. To fix existing Notion images:")
    print("   - Run: python scripts/run-ingestion-do.py --force")
    print("   - This will re-process all articles and store images in Spaces")

if __name__ == "__main__":
    asyncio.run(diagnose_images())
