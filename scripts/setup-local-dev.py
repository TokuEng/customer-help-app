#!/usr/bin/env python3
"""
Setup script for local development with PostgreSQL.
Creates the database and applies all necessary migrations including analytics tables.
"""

import asyncio
import asyncpg
import os
import sys
from pathlib import Path

# Load environment variables from .env if it exists
try:
    from dotenv import load_dotenv
    # Look for .env in apps/api/ directory
    env_path = Path("apps/api/.env")
    if env_path.exists():
        load_dotenv(env_path)
        print("✓ Loaded environment variables from apps/api/.env")
    else:
        load_dotenv()  # Fallback to current directory
        print("✓ Loaded environment variables from .env")
except ImportError:
    print("⚠ python-dotenv not installed. Install with: pip install python-dotenv")

async def setup_local_database():
    """Setup local PostgreSQL database for development"""
    
    # Local database connection details
    local_db_config = {
        'host': 'localhost',
        'port': 5432,
        'user': 'knowhrishi',
        'password': os.getenv('DB_PASSWORD', 'password'),
        'database': 'postgres'  # Connect to postgres db first to create our db
    }
    
    target_db = 'help_center'
    
    try:
        # Connect to PostgreSQL server
        print("Connecting to local PostgreSQL...")
        conn = await asyncpg.connect(**local_db_config)
        
        # Check if database exists
        db_exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", 
            target_db
        )
        
        if not db_exists:
            print(f"Creating database '{target_db}'...")
            await conn.execute(f"CREATE DATABASE {target_db}")
            print("✓ Database created successfully")
        else:
            print(f"✓ Database '{target_db}' already exists")
            
        await conn.close()
        
        # Now connect to our target database
        local_db_config['database'] = target_db
        conn = await asyncpg.connect(**local_db_config)
        
        # Load and apply schema
        schema_path = Path("apps/api/db/schema.sql")
        if schema_path.exists():
            print("Applying main schema...")
            schema_sql = schema_path.read_text()
            
            # Split schema into individual commands
            commands = [cmd.strip() for cmd in schema_sql.split(';') if cmd.strip()]
            
            for i, command in enumerate(commands):
                if command and not command.startswith('--'):
                    try:
                        await conn.execute(command)
                        print(f"  ✓ Command {i+1}/{len(commands)}")
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            print(f"  ✓ Already exists (skipping)")
                        else:
                            print(f"  ⚠ Warning: {e}")
        
        print("✓ Local database setup completed successfully!")
        print(f"\n📊 Database URL: postgresql://knowhrishi:{local_db_config['password']}@localhost:5432/{target_db}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return 1
        
    return 0

async def verify_setup():
    """Verify the local setup is working"""
    try:
        database_url = os.getenv('DATABASE_URL', 'postgresql://knowhrishi:password@localhost:5432/help_center')
        print(f"Testing connection to: {database_url}")
        
        conn = await asyncpg.connect(database_url)
        
        # Check if analytics tables exist
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
                AND table_name IN ('articles', 'search_queries', 'chat_interactions', 'page_visits')
            ORDER BY table_name
        """)
        
        print("\n✅ Database connection successful!")
        print("Available tables:")
        for table in tables:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table['table_name']}")
            print(f"  - {table['table_name']}: {count} records")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def main():
    """Main function"""
    print("=== Local Development Setup ===")
    print("Setting up PostgreSQL database for local development")
    
    # Check if we're in the right directory
    if not Path("apps/api/db/schema.sql").exists():
        print("Error: Run this script from the project root directory")
        return 1
    
    try:
        # Setup database
        result = asyncio.run(setup_local_database())
        if result != 0:
            return result
            
        # Verify setup
        if asyncio.run(verify_setup()):
            print("\n🎉 Local development setup completed successfully!")
            print("\nNext steps:")
            print("1. Start your local Meilisearch: meilisearch")
            print("2. Update .env with your Meilisearch master key")
            print("3. Start the API: cd apps/api && python -m uvicorn main:app --reload --port 8080")
            print("4. Start the web app: cd apps/web && npm run dev")
            print("5. Visit http://localhost:3000")
            return 0
        else:
            return 1
            
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
