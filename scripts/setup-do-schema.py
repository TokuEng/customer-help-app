#!/usr/bin/env python3
"""
Setup database schema on DigitalOcean PostgreSQL
"""
import os
import sys
import subprocess

print("🗄️  DigitalOcean Database Schema Setup")
print("=" * 50)

# Check for database URL
db_url = os.environ.get('DO_DATABASE_URL')
if not db_url:
    print("\n⚠️  You need to provide your DigitalOcean database connection string.")
    print("\n📝 To get your database URL:")
    print("1. Go to: https://cloud.digitalocean.com/databases")
    print("2. Click on 'customer-help-db'")
    print("3. Click on 'Connection Details' tab")
    print("4. Copy the 'Connection string' (starts with postgresql://)")
    print("\n🔧 Then run:")
    print("   DO_DATABASE_URL='postgresql://...' python scripts/setup-do-schema.py")
    sys.exit(1)

# Path to schema file
schema_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'apps', 'api', 'db', 'schema.sql')

if not os.path.exists(schema_file):
    print(f"❌ Schema file not found: {schema_file}")
    sys.exit(1)

print(f"\n📄 Using schema file: {schema_file}")
print("🔄 Applying schema to DigitalOcean database...")

# Run psql command
try:
    result = subprocess.run(['psql', db_url, '-f', schema_file], capture_output=True, text=True)
    
    if result.returncode == 0:
        print("\n✅ Schema created successfully!")
        print("\n📊 Tables created:")
        print("  - articles")
        print("  - article_visits") 
        print("  - feedback")
        print("  - article_embeddings")
        print("\n🎉 Your database is ready for data ingestion!")
        print("\n📝 Next step: Run the ingestion")
        print(f"   DO_DATABASE_URL='{db_url}' python scripts/run-ingestion-do.py")
    else:
        print(f"\n❌ Error creating schema:")
        print(result.stderr)
        print("\n💡 If you see 'already exists' errors, the schema might already be created.")
except FileNotFoundError:
    print("\n❌ psql command not found. Please install PostgreSQL client:")
    print("   macOS: brew install postgresql")
    print("   Ubuntu: sudo apt-get install postgresql-client")
except Exception as e:
    print(f"\n❌ Error: {e}")
