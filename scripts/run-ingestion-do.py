#!/usr/bin/env python3
"""
Run Notion ingestion on DigitalOcean database
"""
import subprocess
import sys
import os
import argparse
import asyncio
import asyncpg
from dotenv import load_dotenv

# Change to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

# Parse command line arguments
parser = argparse.ArgumentParser(
    description='Run Notion ingestion on DigitalOcean database',
    epilog='''
Examples:
  # Normal ingestion (only updates changed articles):
  DO_DATABASE_URL="postgresql://..." python scripts/run-ingestion-do.py
  
  # Force re-ingest all articles (keeps existing data):
  DO_DATABASE_URL="postgresql://..." python scripts/run-ingestion-do.py --force
  
  # Clean all data and start fresh (WARNING: deletes everything!):
  DO_DATABASE_URL="postgresql://..." python scripts/run-ingestion-do.py --clean
''',
    formatter_class=argparse.RawDescriptionHelpFormatter
)
parser.add_argument('--clean', '--reset', action='store_true', 
                    help='Completely erase all articles and images before ingesting (WARNING: destructive!)')
parser.add_argument('--force', action='store_true',
                    help='Force re-ingestion of all articles (but keep existing data)')
args = parser.parse_args()

async def ensure_schema_exists(database_url):
    """Ensure database schema exists before ingestion"""
    print("\n🔧 Checking database schema...")
    print("=" * 50)
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Check if articles table exists
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'articles'
            )
        """)
        
        if not table_exists:
            print("📋 Schema not found. Creating database schema...")
            
            # Read and execute schema.sql
            schema_path = os.path.join(project_root, 'apps', 'api', 'db', 'schema.sql')
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
            
            # Execute the schema
            await conn.execute(schema_sql)
            print("✅ Database schema created successfully!")
        else:
            print("✅ Database schema already exists")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error checking/creating schema: {e}")
        raise

async def clean_all_data(database_url, env):
    """Clean all articles and images from database and Spaces"""
    print("\n🗑️  Cleaning all existing data...")
    print("=" * 50)
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Delete all data
        print("📊 Cleaning database tables...")
        
        # Define tables to clean with dependencies order (child tables first)
        tables_to_clean = [
            # Tables with foreign keys to articles (must be cleaned first)
            'chunks',
            'article_views',
            'search_feedback',
            
            # Analytics tables (no foreign keys to articles)
            'search_queries',
            'chat_interactions',
            'page_visits',
            
            # Work submission tables
            'work_submission_comments',  # Has FK to work_submissions
            'work_submissions',
            
            # Main content tables
            'articles',
            'ingestion_state'
        ]
        
        for table in tables_to_clean:
            try:
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
                if count > 0:
                    await conn.execute(f"DELETE FROM {table}")
                    print(f"   ✅ Deleted {count} rows from {table}")
                else:
                    print(f"   ℹ️  Table {table} was already empty")
            except Exception as e:
                if "does not exist" in str(e):
                    print(f"   ℹ️  Table {table} does not exist (skipping)")
                else:
                    print(f"   ⚠️  Error cleaning {table}: {e}")
        
        # Get counts to confirm
        article_count = await conn.fetchval("SELECT COUNT(*) FROM articles")
        chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
        
        print(f"   ✅ Articles remaining: {article_count}")
        print(f"   ✅ Chunks remaining: {chunk_count}")
        
        await conn.close()
        
        # Clean images from Spaces if configured
        if all(env.get(var) for var in ['SPACES_KEY', 'SPACES_SECRET', 'SPACES_BUCKET']):
            print("\n🖼️  Cleaning images from DigitalOcean Spaces...")
            try:
                sys.path.append(project_root)
                from apps.api.services.image_storage import ImageStorageService
                
                image_service = ImageStorageService()
                
                # List all objects in the notion-images prefix
                response = image_service.spaces_client.list_objects_v2(
                    Bucket=image_service.bucket_name,
                    Prefix="notion-images/"
                )
                
                if 'Contents' in response and response['Contents']:
                    # Delete all objects
                    objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                    print(f"   Found {len(objects_to_delete)} images to delete...")
                    
                    # Delete in batches (max 1000 per request)
                    batch_size = 1000
                    for i in range(0, len(objects_to_delete), batch_size):
                        batch = objects_to_delete[i:i + batch_size]
                        image_service.spaces_client.delete_objects(
                            Bucket=image_service.bucket_name,
                            Delete={'Objects': batch}
                        )
                    
                    print(f"   ✅ Deleted {len(objects_to_delete)} images from Spaces")
                else:
                    print("   ℹ️  No images found in Spaces")
                    
            except Exception as e:
                print(f"   ⚠️  Could not clean images: {e}")
                print("   Continuing anyway...")
        
        # Also clean Meilisearch index
        print("\n🔍 Cleaning Meilisearch index...")
        try:
            import meilisearch
            client = meilisearch.Client(env['MEILI_HOST'], env['MEILI_MASTER_KEY'])
            client.index('articles').delete_all_documents()
            print("   ✅ Meilisearch index cleared")
        except Exception as e:
            print(f"   ⚠️  Could not clean Meilisearch: {e}")
            
        print("\n✅ All data cleaned successfully!")
        
    except Exception as e:
        print(f"\n❌ Error cleaning data: {e}")
        raise

print("🚀 Running Notion ingestion on DigitalOcean database...")
print(f"📁 Project root: {project_root}")

if args.clean:
    print("\n⚠️  CLEAN MODE: Will erase all existing data before ingesting!")
elif args.force:
    print("\n⚡ FORCE MODE: Will re-ingest all articles (keeping existing data)")

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
env['INGESTION_PARALLEL'] = '10'

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
    print("\n💡 Example commands:")
    print("   # Normal ingestion (only updates changed articles):")
    print("   DO_DATABASE_URL='postgresql://doadmin:AVNS_xxx@...' python scripts/run-ingestion-do.py")
    print("\n   # Force re-ingest all articles (keeps existing data):")
    print("   DO_DATABASE_URL='postgresql://doadmin:AVNS_xxx@...' python scripts/run-ingestion-do.py --force")
    print("\n   # Clean all data and start fresh:")
    print("   DO_DATABASE_URL='postgresql://doadmin:AVNS_xxx@...' python scripts/run-ingestion-do.py --clean")
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

# Ensure schema exists before any operations
asyncio.run(ensure_schema_exists(env['DATABASE_URL']))

# Clean data if requested
if args.clean:
    # Get confirmation from user
    print("\n⚠️  WARNING: This will delete ALL articles and images!")
    confirm = input("Are you sure you want to continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Operation cancelled")
        sys.exit(0)
    
    # Run the clean operation
    asyncio.run(clean_all_data(env['DATABASE_URL'], env))
    print("\n🔄 Proceeding with fresh ingestion...")

print("\n⚡ Processing articles in parallel (10 at a time)")
print("📊 Estimated time: 3-5 minutes for all articles\n")

print("Starting ingestion...")

# Prepare command
cmd = [sys.executable, '-u', 'functions/ingestion/handler.py']

# Add force flag if specified
if args.force:
    env['FORCE_FULL_SYNC'] = 'true'

# Run the ingestion handler with output
result = subprocess.run(cmd, env=env, capture_output=True, text=True)

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
