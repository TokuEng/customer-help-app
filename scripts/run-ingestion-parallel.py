#!/usr/bin/env python3
"""
Run Notion ingestion with parallel processing for faster execution
"""
import subprocess
import sys
import os

# Change to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

print("🚀 Running PARALLEL Notion ingestion with OpenAI embeddings...")
print(f"📁 Project root: {project_root}")
print("\n⚡ This version processes multiple articles simultaneously")
print("📊 Estimated time: 3-5 minutes for all 47 articles\n")

# Check if .env file exists
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if not os.path.exists(env_path):
    print("❌ Error: No .env file found at apps/api/.env")
    sys.exit(1)

# Set PYTHONPATH to include project root
env = os.environ.copy()
env['PYTHONPATH'] = project_root

# Enable parallel processing (process 5 articles at a time)
env['INGESTION_PARALLEL'] = '5'

print("Starting ingestion...")
print("You can monitor progress in another terminal with:")
print("  python scripts/monitor-ingestion.py\n")

# Run the ingestion handler
result = subprocess.run([
    sys.executable, 
    'functions/ingestion/handler.py'
], env=env)

if result.returncode == 0:
    print("\n✅ Parallel ingestion completed successfully!")
else:
    print("❌ Ingestion failed with error code:", result.returncode)
