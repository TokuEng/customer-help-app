#!/usr/bin/env python3
"""
Set up ingestion logs tables in the database
"""
import asyncio
import asyncpg
import os
import sys
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

# For DigitalOcean deployment
if os.getenv('DO_DATABASE_URL'):
    os.environ['DATABASE_URL'] = os.getenv('DO_DATABASE_URL')

async def setup_ingestion_logs():
    """Create ingestion logs tables"""
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        print("   For local: Make sure apps/api/.env has DATABASE_URL")
        print("   For production: Set DO_DATABASE_URL environment variable")
        sys.exit(1)
    
    print("🔧 Setting up ingestion logs tables...")
    print(f"📊 Database: {database_url.split('@')[1].split('/')[0]}")
    
    conn = await asyncpg.connect(database_url)
    
    try:
        # Read the schema file
        schema_path = os.path.join(project_root, 'apps', 'api', 'db', 'schema-ingestion-logs.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Execute the schema
        await conn.execute(schema_sql)
        
        print("✅ Ingestion logs tables created successfully!")
        
        # Check if tables exist
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('ingestion_logs', 'ingestion_events')
        """)
        
        print("\n📋 Created tables:")
        for table in tables:
            print(f"   - {table['table_name']}")
        
        # Check the view
        views = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'ingestion_summary'
        """)
        
        if views:
            print("   - ingestion_summary (view)")
        
    except Exception as e:
        print(f"❌ Error setting up tables: {e}")
        sys.exit(1)
    finally:
        await conn.close()

async def check_existing_data():
    """Check if there's any existing data"""
    database_url = os.environ.get('DATABASE_URL')
    conn = await asyncpg.connect(database_url)
    
    try:
        # Check ingestion_state
        state = await conn.fetchrow("SELECT * FROM ingestion_state WHERE id = 1")
        if state:
            print(f"\n📊 Last ingestion sync: {state['last_synced']}")
        
        # Check for any existing logs (from before we added logging)
        article_count = await conn.fetchval("SELECT COUNT(*) FROM articles")
        print(f"📚 Total articles in database: {article_count}")
        
    except Exception as e:
        print(f"⚠️  Could not check existing data: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    print("🚀 Ingestion Logs Setup")
    print("=" * 50)
    
    asyncio.run(setup_ingestion_logs())
    asyncio.run(check_existing_data())
    
    print("\n✅ Setup complete!")
    print("\n📝 Next steps:")
    print("1. The ingestion system will now log all activities")
    print("2. Access the admin panel at: /admin/ingestion")
    print("3. Use the monitoring script: python scripts/monitor-auto-ingestion.py")


