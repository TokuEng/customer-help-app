#!/usr/bin/env python3
"""
Check the actual state of DigitalOcean database
"""
import os
import asyncio
import asyncpg
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

async def check_database():
    print("🔍 Checking DigitalOcean Database State")
    print("=" * 50)
    
    # Try multiple possible environment variable names
    db_url = (os.environ.get('DO_DATABASE_URL') or 
              os.environ.get('DATABASE_URL') or
              os.environ.get('POSTGRES_URL'))
    
    if not db_url:
        print("❌ Database URL not found. Please set DO_DATABASE_URL, DATABASE_URL, or POSTGRES_URL")
        return
    
    print(f"🔗 Connecting to: {db_url[:30]}...")
    
    try:
        conn = await asyncpg.connect(db_url)
        print("✅ Connected to DigitalOcean database")
        
        # Check articles table
        print("\n📋 Checking articles table...")
        article_count = await conn.fetchval("SELECT COUNT(*) FROM articles")
        print(f"   Articles count: {article_count}")
        
        if article_count > 0:
            # Show some sample articles
            articles = await conn.fetch("SELECT id, title, updated_at FROM articles ORDER BY updated_at DESC LIMIT 5")
            print("\n📄 Recent articles:")
            for article in articles:
                print(f"   - {article['title'][:50]}... (Updated: {article['updated_at']})")
        
        # Check chunks table  
        chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
        print(f"\n🧩 Chunks count: {chunk_count}")
        
        # Check ingestion state
        print("\n🔄 Checking ingestion state...")
        ingestion_state = await conn.fetchrow("SELECT * FROM ingestion_state WHERE id = 1")
        if ingestion_state:
            print(f"   Last synced: {ingestion_state['last_synced']}")
        else:
            print("   No ingestion state found")
        
        # Check if any images are stored
        if article_count > 0:
            print("\n🖼️  Checking for stored images...")
            articles_with_images = await conn.fetch("""
                SELECT title, content_html FROM articles 
                WHERE content_html LIKE '%digitaloceanspaces.com%' 
                LIMIT 3
            """)
            
            if articles_with_images:
                print(f"   Found {len(articles_with_images)} articles with DO Spaces images:")
                for article in articles_with_images:
                    print(f"   - {article['title'][:40]}...")
            else:
                print("   No articles with DO Spaces images found")
        
        await conn.close()
        
        # Summary
        print(f"\n📊 Summary:")
        print(f"   - Database: {'✅ Connected' if True else '❌ Failed'}")
        print(f"   - Articles: {article_count}")
        print(f"   - Chunks: {chunk_count}")
        
        if article_count == 0:
            print("   🎯 Database is CLEAN - ready for fresh ingestion!")
        else:
            print("   ⚠️  Database still contains data - reset might not have worked")
            
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print("\nTroubleshooting:")
        print("1. Check your DO_DATABASE_URL is correct")
        print("2. Ensure your IP is whitelisted in DigitalOcean")
        print("3. Verify database credentials")

if __name__ == "__main__":
    asyncio.run(check_database())
