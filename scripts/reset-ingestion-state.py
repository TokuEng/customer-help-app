#!/usr/bin/env python3
"""
Reset ingestion state to force a fresh sync
"""
import os
import sys
import asyncio
import asyncpg
from dotenv import load_dotenv

# Add project root to path for imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Load environment variables
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

async def clear_all_images():
    """Clear all images from DigitalOcean Spaces"""
    try:
        from apps.api.services.image_storage import ImageStorageService
        
        print("🗑️  Initializing image storage service...")
        image_service = ImageStorageService()
        
        # List all objects in the notion-images prefix
        response = image_service.spaces_client.list_objects_v2(
            Bucket=image_service.bucket_name,
            Prefix="notion-images/"
        )
        
        if 'Contents' in response and response['Contents']:
            # Delete all objects
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            print(f"🗑️  Found {len(objects_to_delete)} images to delete...")
            
            # Delete in batches (max 1000 per request)
            batch_size = 1000
            for i in range(0, len(objects_to_delete), batch_size):
                batch = objects_to_delete[i:i + batch_size]
                image_service.spaces_client.delete_objects(
                    Bucket=image_service.bucket_name,
                    Delete={'Objects': batch}
                )
                print(f"   Deleted batch {i//batch_size + 1}/{(len(objects_to_delete) + batch_size - 1)//batch_size}")
            
            print(f"✅ Deleted {len(objects_to_delete)} images from DigitalOcean Spaces")
        else:
            print("ℹ️  No images found in DigitalOcean Spaces")
            
    except ImportError:
        print("⚠️  Could not import image storage service - may not be configured")
    except Exception as e:
        print(f"❌ Error clearing images: {e}")
        print("ℹ️  You may need to clear images manually from the DigitalOcean Spaces console")

async def reset_ingestion_state():
    # Try multiple possible environment variable names
    db_url = (os.environ.get('DO_DATABASE_URL') or 
              os.environ.get('DATABASE_URL') or
              os.environ.get('POSTGRES_URL'))
    
    if not db_url:
        print("❌ Database URL not found. Please set DO_DATABASE_URL, DATABASE_URL, or POSTGRES_URL")
        return
    
    print(f"🔗 Connecting to database: {db_url[:30]}...")
    
    print("🔄 Resetting ingestion state...")
    
    try:
        conn = await asyncpg.connect(db_url)
        
        # Reset last_synced to force re-ingestion
        await conn.execute("""
            UPDATE ingestion_state 
            SET last_synced = '2000-01-01'::timestamp 
            WHERE id = 1
        """)
        
        # Optional: Clear existing articles to start fresh
        choice = input("\n🗑️  Do you want to clear existing articles too? (y/N): ").lower()
        if choice == 'y':
            count = await conn.fetchval("SELECT COUNT(*) FROM articles")
            print(f"📊 Found {count} articles")
            
            await conn.execute("DELETE FROM chunks")
            await conn.execute("DELETE FROM articles")
            print("✅ Cleared all articles and chunks")
            
            # Also clear images from DigitalOcean Spaces
            image_choice = input("\n🗑️  Do you want to clear all stored images from DigitalOcean Spaces too? (y/N): ").lower()
            if image_choice == 'y':
                await clear_all_images()
            else:
                print("ℹ️  Keeping existing images in DigitalOcean Spaces")
        
        print("✅ Ingestion state reset. Next sync will process all articles.")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔧 Ingestion State Reset")
    print("=" * 50)
    print("This will force the next ingestion to process all articles\n")
    
    asyncio.run(reset_ingestion_state())
