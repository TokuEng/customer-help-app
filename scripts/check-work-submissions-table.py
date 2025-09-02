#!/usr/bin/env python3
"""
Script to check if work_submissions table exists in production database
"""

import os
import sys
import asyncio
import asyncpg

async def check_work_submissions_table():
    # Use the production database URL
    database_url = os.getenv('DO_DATABASE_URL')
    
    if not database_url:
        print("❌ Please set DO_DATABASE_URL environment variable")
        print("Example:")
        print("DO_DATABASE_URL='postgresql://...' python scripts/check-work-submissions-table.py")
        return False
    
    print("🔄 Connecting to production database...")
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Check if work_submissions table exists
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'work_submissions'
            )
        """)
        
        if table_exists:
            print("✅ work_submissions table exists!")
            
            # Get table schema
            columns = await conn.fetch("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'work_submissions'
                ORDER BY ordinal_position
            """)
            
            print("\n📊 Table Schema:")
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                print(f"   - {col['column_name']}: {col['data_type']} {nullable}{default}")
            
            # Check for related tables
            comments_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'work_submission_comments'
                )
            """)
            
            if comments_exists:
                print("\n✅ work_submission_comments table also exists")
            else:
                print("\n⚠️  work_submission_comments table is missing")
            
            # Try a test insert
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
                'Test from check script',
                'Testing database functionality',
                'low',
                'Check Script',
                'test@check.com'
                )
                print(f"✅ Successfully inserted test record with ID: {test_id}")
                
                # Clean up
                await conn.execute(
                    "DELETE FROM work_submissions WHERE id = $1",
                    test_id
                )
                print("✅ Successfully cleaned up test record")
                
            except Exception as e:
                print(f"❌ Failed to insert test record: {e}")
                print(f"   Error type: {type(e).__name__}")
                
        else:
            print("❌ work_submissions table does NOT exist!")
            print("\n🛠️  To create the table, you need to run the migration.")
            print("\nOption 1: Run from your local machine:")
            print(f"DO_DATABASE_URL='{database_url}' python scripts/apply-work-submissions-migration.py")
            print("\nOption 2: SSH into your DigitalOcean app and run the migration there")
            
            # Show what tables do exist
            tables = await conn.fetch("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            print("\n📋 Existing tables in database:")
            for table in tables:
                print(f"   - {table['table_name']}")
        
        await conn.close()
        return table_exists
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(check_work_submissions_table())
