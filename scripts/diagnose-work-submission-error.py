#!/usr/bin/env python3
"""
Script to diagnose work submission form errors in production.
This checks database connectivity and table existence.
"""

import os
import sys
import asyncio
import asyncpg
from datetime import datetime

async def check_database_connection():
    """Test database connection and work_submissions table"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable is not set!")
        print("Please set it using: export DATABASE_URL='your-postgresql-connection-string'")
        return False
    
    print(f"✅ DATABASE_URL is set")
    print(f"   Connection string starts with: {database_url[:30]}...")
    
    try:
        # Try to create a connection pool
        print("\n🔄 Testing database connection...")
        pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=2,
            command_timeout=10
        )
        print("✅ Successfully created connection pool")
        
        async with pool.acquire() as conn:
            # Test basic connectivity
            version = await conn.fetchval('SELECT version()')
            print(f"✅ Connected to PostgreSQL: {version.split(',')[0]}")
            
            # Check if work_submissions table exists
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'work_submissions'
                )
            """)
            
            if table_exists:
                print("✅ work_submissions table exists")
                
                # Get table info
                column_count = await conn.fetchval("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'work_submissions'
                """)
                print(f"   Table has {column_count} columns")
                
                # Check for required columns
                required_columns = [
                    'id', 'request_type', 'title', 'description', 
                    'priority', 'submitter_name', 'submitter_email'
                ]
                
                for col in required_columns:
                    col_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = 'work_submissions' 
                            AND column_name = $1
                        )
                    """, col)
                    
                    if col_exists:
                        print(f"   ✅ Column '{col}' exists")
                    else:
                        print(f"   ❌ Column '{col}' is MISSING!")
                
                # Test insert capability
                print("\n🔄 Testing INSERT capability...")
                try:
                    test_id = await conn.fetchval("""
                        INSERT INTO work_submissions (
                            request_type, title, description, priority,
                            submitter_name, submitter_email
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id
                    """,
                    'test_type',
                    'Test submission from diagnostic script',
                    'This is a test submission to verify database functionality',
                    'low',
                    'Diagnostic Script',
                    'test@diagnostic.com'
                    )
                    print(f"✅ Successfully inserted test record with ID: {test_id}")
                    
                    # Clean up test record
                    await conn.execute(
                        "DELETE FROM work_submissions WHERE id = $1",
                        test_id
                    )
                    print("✅ Successfully cleaned up test record")
                    
                except Exception as e:
                    print(f"❌ Failed to insert test record: {e}")
                    
            else:
                print("❌ work_submissions table does NOT exist!")
                print("   Run the migration script to create it:")
                print("   python scripts/apply-work-submissions-migration.py")
        
        await pool.close()
        return True
        
    except asyncpg.PostgresConnectionError as e:
        print(f"❌ Failed to connect to database: {e}")
        print("\nPossible causes:")
        print("1. Incorrect DATABASE_URL format")
        print("2. Database server is down")
        print("3. Network/firewall blocking connection")
        print("4. Invalid credentials")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")
        return False

async def test_api_endpoint():
    """Test the API endpoint directly"""
    api_url = os.getenv('NEXT_PUBLIC_API_URL', 'http://localhost:8080/api')
    
    print(f"\n🔄 Testing API endpoint at: {api_url}/work-submissions")
    
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            # Prepare test data
            test_data = {
                "request_type": "diagnostic_test",
                "title": "Test from diagnostic script",
                "description": "Testing API endpoint functionality",
                "priority": "low",
                "submitter_name": "Diagnostic Script",
                "submitter_email": "test@diagnostic.com",
                "tags": ["test", "diagnostic"]
            }
            
            async with session.post(
                f"{api_url}/work-submissions",
                json=test_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                status = response.status
                text = await response.text()
                
                if status == 200 or status == 201:
                    print(f"✅ API endpoint is working! Status: {status}")
                else:
                    print(f"❌ API returned error status: {status}")
                    print(f"   Response: {text}")
                    
    except Exception as e:
        print(f"❌ Failed to test API endpoint: {e}")
        print("   (This is expected if running locally without the API server)")

async def main():
    print("🔍 Diagnosing Work Submission Form Issues")
    print("=" * 50)
    
    # Check database connection
    db_ok = await check_database_connection()
    
    # Only test API if aiohttp is available
    try:
        import aiohttp
        await test_api_endpoint()
    except ImportError:
        print("\n⚠️  Skipping API test (aiohttp not installed)")
    
    print("\n" + "=" * 50)
    if db_ok:
        print("✅ Database diagnostics passed!")
        print("\nIf the form still isn't working, check:")
        print("1. API server logs for detailed error messages")
        print("2. Network connectivity between frontend and API")
        print("3. CORS configuration")
        print("4. Environment variables in production")
    else:
        print("❌ Database diagnostics failed!")
        print("\nPlease fix the database issues before the form will work.")

if __name__ == "__main__":
    asyncio.run(main())
