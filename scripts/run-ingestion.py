#!/usr/bin/env python3
"""
Run Notion ingestion locally
"""
import subprocess
import sys
import os

# Change to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(project_root)

print("🔄 Running Notion ingestion...")
print(f"📁 Project root: {project_root}")

# Check if .env file exists
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if not os.path.exists(env_path):
    print("❌ Error: No .env file found at apps/api/.env")
    print("   Please copy apps/api/env.template to apps/api/.env and fill in your values")
    sys.exit(1)

# Set PYTHONPATH to include project root
env = os.environ.copy()
env['PYTHONPATH'] = project_root

# Run the ingestion handler
result = subprocess.run([
    sys.executable, 
    'functions/ingestion/handler.py'
], env=env)

if result.returncode == 0:
    print("✅ Ingestion completed successfully!")
else:
    print("❌ Ingestion failed with error code:", result.returncode)
