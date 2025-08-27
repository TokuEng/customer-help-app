#!/usr/bin/env python3
"""
Test DigitalOcean database connection
"""
import os
import asyncpg
import asyncio

async def test_connection():
    db_url = os.environ.get('DO_DATABASE_URL')
    
    if not db_url:
        print("❌ DO_DATABASE_URL not found in environment")
        return
    
    print("🔄 Testing database connection...")
    print(f"📍 URL: {db_url[:30]}...{db_url[-20:]}")  # Show partial URL for security
    
    try:
        # Test connection
        conn = await asyncpg.connect(db_url)
        print("✅ Connected successfully!")
        
        # Check tables
        tables = await conn.fetch("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        """)
        
        print(f"\n📊 Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table['tablename']}")
        
        if len(tables) == 0:
            print("\n⚠️  No tables found. Need to run schema setup first!")
            print("\n🔧 Run:")
            print(f"   psql '{db_url}' < apps/api/db/schema.sql")
        
        await conn.close()
        
    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        print("\n💡 Check:")
        print("  1. Is the database URL correct?")
        print("  2. Is your IP whitelisted in DO trusted sources?")
        print("  3. Is the database running?")

if __name__ == "__main__":
    asyncio.run(test_connection())

