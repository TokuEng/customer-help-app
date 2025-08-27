#!/usr/bin/env python3
"""
Run Notion ingestion on DigitalOcean database
"""
import subprocess
import sys
import os
from dotenv import load_dotenv

# Change to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

print("🚀 Running Notion ingestion on DigitalOcean database...")
print(f"📁 Project root: {project_root}")

# Load .env file to get other settings
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

# Set PYTHONPATH to include project root
env = os.environ.copy()
env['PYTHONPATH'] = project_root

# Ensure Spaces environment variables are copied
spaces_vars = ['SPACES_KEY', 'SPACES_SECRET', 'SPACES_BUCKET', 'SPACES_REGION', 'SPACES_CDN_ENDPOINT']
for var in spaces_vars:
    if var in os.environ:
        env[var] = os.environ[var]

# Enable parallel processing (process 5 articles at a time)
env['INGESTION_PARALLEL'] = '5'

# Use DigitalOcean Meilisearch droplet (public endpoint)
env['MEILI_HOST'] = 'http://147.182.245.91:7700'
env['MEILI_MASTER_KEY'] = 'NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk'

# Get DigitalOcean database credentials
print("\n📋 DigitalOcean Database Connection")
print("=" * 50)

# Option 1: Use environment variable if already set
if 'DO_DATABASE_URL' in env:
    env['DATABASE_URL'] = env['DO_DATABASE_URL']
    print("✅ Using DO_DATABASE_URL from environment")
else:
    print("\n⚠️  You need to set the DATABASE_URL for your DigitalOcean database.")
    print("\n📝 To get your database URL:")
    print("1. Go to: https://cloud.digitalocean.com/databases")
    print("2. Click on 'customer-help-db'")
    print("3. Click on 'Connection Details' tab")
    print("4. Copy the 'Connection string' (starts with postgresql://)")
    print("\n🔧 Then run this script with:")
    print("   DO_DATABASE_URL='postgresql://doadmin:password@host:25060/defaultdb?sslmode=require' python scripts/run-ingestion-do.py")
    print("\n💡 Example command (replace with your actual connection string):")
    print("   DO_DATABASE_URL='postgresql://doadmin:AVNS_xxx@customer-help-db-do-user-xxx.db.ondigitalocean.com:25060/defaultdb?sslmode=require' python scripts/run-ingestion-do.py")
    sys.exit(1)

# Verify required environment variables
required_vars = ['NOTION_TOKEN', 'NOTION_INDEX_PAGE_ID', 'OPENAI_API_KEY', 'MEILI_HOST', 'MEILI_MASTER_KEY']
missing_vars = [var for var in required_vars if not env.get(var)]

if missing_vars:
    print(f"\n❌ Missing required environment variables: {', '.join(missing_vars)}")
    print("Please check your .env file")
    sys.exit(1)

# Check for Spaces configuration (optional but recommended)
required_spaces_vars = ['SPACES_KEY', 'SPACES_SECRET', 'SPACES_BUCKET']
spaces_missing = [var for var in required_spaces_vars if not env.get(var)]

if spaces_missing:
    print(f"\n⚠️  Spaces configuration incomplete: {', '.join(spaces_missing)} not set")
    print("Images will use original Notion URLs (which expire)")
    print("To fix: Run 'python scripts/setup-do-spaces.py' to set up permanent storage")
else:
    print("✅ Spaces configuration found - images will be stored permanently")

print("\n✅ All required environment variables are set")
print("\n⚡ Processing articles in parallel (5 at a time)")
print("📊 Estimated time: 3-5 minutes for all articles\n")

print("Starting ingestion...")

# Run the ingestion handler with output
result = subprocess.run([
    sys.executable, '-u',  # Unbuffered output
    'functions/ingestion/handler.py'
], env=env, capture_output=True, text=True)

# Print output regardless of success/failure
if result.stdout:
    print(result.stdout)
if result.stderr:
    print("ERRORS:", result.stderr)

if result.returncode == 0:
    print("\n✅ DigitalOcean database ingestion completed successfully!")
    print("\n🎉 Your app should now have all the data!")
    print("🔗 Check your app at: https://customer-help-center-*.ondigitalocean.app")
else:
    print("\n❌ Ingestion failed with error code:", result.returncode)
    print("Check the error messages above for details")
