#!/usr/bin/env python3
"""
Run ingestion to DigitalOcean PostgreSQL only (skip Meilisearch)
The app will need to index Meilisearch separately
"""
import subprocess
import sys
import os
from dotenv import load_dotenv

# Change to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

print("🚀 Running PostgreSQL-only ingestion to DigitalOcean...")
print("⚠️  Note: This skips Meilisearch indexing")
print("📁 Project root: {project_root}")

# Load .env file
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

# Set PYTHONPATH
env = os.environ.copy()
env['PYTHONPATH'] = project_root

# Use DO database
if 'DO_DATABASE_URL' in env:
    env['DATABASE_URL'] = env['DO_DATABASE_URL']
else:
    print("❌ DO_DATABASE_URL not set")
    sys.exit(1)

# Point to a non-existent Meilisearch to skip indexing
env['MEILI_HOST'] = 'http://skip-meilisearch:7700'
env['SKIP_MEILISEARCH'] = 'true'

print("\n📊 This will:")
print("  ✅ Insert articles into PostgreSQL")
print("  ✅ Generate and store embeddings")
print("  ❌ Skip Meilisearch indexing")
print("\n⚠️  You'll need to index Meilisearch separately from within DO network")

# Run ingestion
result = subprocess.run([
    sys.executable, '-u',
    'functions/ingestion/handler.py'
], env=env, capture_output=True, text=True)

if result.stdout:
    print(result.stdout)
if result.stderr:
    print("ERRORS:", result.stderr)

if "inserted into database" in result.stdout:
    print("\n✅ PostgreSQL data ingested successfully!")
    print("\n📝 Next steps:")
    print("1. SSH into a DO droplet in the same VPC")
    print("2. Run a script to index Meilisearch from PostgreSQL")
else:
    print("\n❌ Ingestion may have failed")
