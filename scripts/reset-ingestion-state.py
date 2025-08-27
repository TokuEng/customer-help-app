#!/usr/bin/env python3
"""
Reset ingestion state to force a fresh sync
"""
import os
import asyncio
import asyncpg
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

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
        
        print("✅ Ingestion state reset. Next sync will process all articles.")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔧 Ingestion State Reset")
    print("=" * 50)
    print("This will force the next ingestion to process all articles\n")
    
    asyncio.run(reset_ingestion_state())
