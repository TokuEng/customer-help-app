#!/usr/bin/env python3
"""
Script to debug API issues in production, specifically database connectivity.
This script simulates the API startup process to identify connection issues.
"""

import os
import sys
import asyncio
import asyncpg
from datetime import datetime

def check_env_vars():
    """Check if all required environment variables are set"""
    required_vars = [
        'DATABASE_URL',
        'MEILI_HOST',
        'MEILI_MASTER_KEY',
        'NOTION_TOKEN',
        'NOTION_INDEX_PAGE_ID',
        'REVALIDATE_TOKEN',
        'WEB_BASE_URL'
    ]
    
    optional_vars = [
        'OPENAI_API_KEY',
        'SPACES_KEY',
        'SPACES_SECRET',
        'SPACES_BUCKET',
        'SPACES_REGION',
        'SPACES_CDN_ENDPOINT'
    ]
    
    print("🔍 Checking Environment Variables")
    print("=" * 50)
    
    all_good = True
    
    # Check required vars
    print("\n📋 Required Variables:")
    for var in required_vars:
        value = os.getenv(var)
        if value:
            if var == 'DATABASE_URL' and value.startswith('${'):
                print(f"❌ {var}: Contains unresolved reference: {value}")
                all_good = False
            else:
                # Mask sensitive values
                if 'TOKEN' in var or 'KEY' in var or 'SECRET' in var:
                    masked = value[:10] + '...' if len(value) > 10 else '***'
                    print(f"✅ {var}: {masked}")
                elif var == 'DATABASE_URL':
                    # Show database host for debugging
                    import re
                    match = re.search(r'@([^:/]+)', value)
                    host = match.group(1) if match else 'unknown'
                    print(f"✅ {var}: postgres://...@{host}/...")
                else:
                    print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: NOT SET")
            all_good = False
    
    # Check optional vars
    print("\n📋 Optional Variables:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            masked = value[:10] + '...' if len(value) > 10 and ('KEY' in var or 'SECRET' in var) else value
            print(f"✅ {var}: {masked}")
        else:
            print(f"⚠️  {var}: Not set (optional)")
    
    return all_good

async def test_database_connection():
    """Test database connection with detailed error reporting"""
    print("\n🔄 Testing Database Connection")
    print("=" * 50)
    
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL is not set!")
        return False
    
    if database_url.startswith('${'):
        print(f"❌ DATABASE_URL contains unresolved reference: {database_url}")
        print("   This typically means the DigitalOcean database binding failed.")
        print("\n   Possible fixes:")
        print("   1. Check if the database 'customer-help-db' exists in your DO project")
        print("   2. Verify the database binding in app-spec.yaml matches the database name")
        print("   3. Ensure the app has permission to access the database")
        return False
    
    # Parse connection string for debugging
    try:
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)', database_url)
        if match:
            user, _, host, port, dbname = match.groups()
            port = port or '5432'
            print(f"\n📊 Connection Details:")
            print(f"   User: {user}")
            print(f"   Host: {host}")
            print(f"   Port: {port}")
            print(f"   Database: {dbname}")
    except:
        pass
    
    # Test connection with timeout
    try:
        print("\n🔄 Attempting to connect...")
        pool = await asyncio.wait_for(
            asyncpg.create_pool(
                database_url,
                min_size=1,
                max_size=2,
                command_timeout=10,
                timeout=10
            ),
            timeout=15
        )
        print("✅ Successfully created connection pool")
        
        async with pool.acquire() as conn:
            # Test basic query
            version = await conn.fetchval('SELECT version()')
            print(f"✅ Connected to: {version.split(',')[0]}")
            
            # Check if work_submissions table exists
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'work_submissions'
                )
            """)
            
            if table_exists:
                print("✅ work_submissions table exists")
                
                # Count records
                count = await conn.fetchval("SELECT COUNT(*) FROM work_submissions")
                print(f"   Table contains {count} records")
            else:
                print("❌ work_submissions table does NOT exist!")
                print("\n   To fix this, run the migration:")
                print("   1. SSH into your DigitalOcean app")
                print("   2. Run: python scripts/apply-work-submissions-migration.py")
        
        await pool.close()
        return True
        
    except asyncio.TimeoutError:
        print("❌ Connection timeout!")
        print("   The database is not responding within 15 seconds.")
        print("\n   Possible causes:")
        print("   1. Database is overloaded or down")
        print("   2. Network connectivity issues")
        print("   3. Firewall blocking the connection")
        return False
        
    except asyncpg.InvalidCatalogNameError as e:
        print(f"❌ Database does not exist: {e}")
        print("\n   The specified database name in DATABASE_URL doesn't exist.")
        return False
        
    except asyncpg.InvalidPasswordError as e:
        print(f"❌ Authentication failed: {e}")
        print("\n   The database credentials are incorrect.")
        return False
        
    except asyncpg.PostgresConnectionError as e:
        print(f"❌ Connection failed: {e}")
        print("\n   Cannot establish connection to the database server.")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")
        return False

async def test_api_startup():
    """Simulate the API startup process"""
    print("\n🔄 Simulating API Startup")
    print("=" * 50)
    
    try:
        # Import settings (this will validate env vars)
        print("📦 Loading settings...")
        from core.settings import settings
        print("✅ Settings loaded successfully")
        
        # Test database pool creation
        print("\n🔄 Creating database pool...")
        db_pool = await asyncpg.create_pool(settings.database_url)
        print("✅ Database pool created successfully")
        
        # Test a simple query
        async with db_pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            print(f"✅ Test query successful: {result}")
        
        await db_pool.close()
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import settings: {e}")
        print("\n   Make sure you're running this from the API directory")
        return False
    except Exception as e:
        print(f"❌ Startup failed: {type(e).__name__}: {e}")
        return False

async def main():
    print("🔍 Debugging Production API Issues")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    # Check environment variables
    env_ok = check_env_vars()
    
    # Test database connection
    db_ok = await test_database_connection()
    
    # Try to simulate API startup
    if env_ok and db_ok:
        # Change to API directory if needed
        if os.path.exists('apps/api'):
            os.chdir('apps/api')
            print("\n📁 Changed to API directory")
        
        await test_api_startup()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    
    if not env_ok:
        print("❌ Environment variables are not properly configured")
    elif not db_ok:
        print("❌ Database connection failed")
        print("\nMost likely causes in DigitalOcean:")
        print("1. DATABASE_URL reference not resolved (check app spec)")
        print("2. Database doesn't exist or is not accessible")
        print("3. Migration not run (work_submissions table missing)")
    else:
        print("✅ Basic checks passed!")
        print("\nIf the API still has issues:")
        print("1. Check the app logs in DigitalOcean console")
        print("2. Verify CORS settings for your domain")
        print("3. Check if the API service is running and healthy")

if __name__ == "__main__":
    asyncio.run(main())
