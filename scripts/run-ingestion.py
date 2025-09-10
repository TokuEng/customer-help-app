#!/usr/bin/env python3
"""
Run Notion ingestion locally via API trigger
"""
import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')

if not os.path.exists(env_path):
    print("❌ Error: No .env file found at apps/api/.env")
    print("   Please copy apps/api/env.template to apps/api/.env and fill in your values")
    sys.exit(1)

load_dotenv(env_path)

print("🔄 Triggering Notion ingestion via API...")
print(f"📁 Project root: {project_root}")

# Get required environment variables
api_url = os.getenv('API_URL', 'http://localhost:8080')
revalidate_token = os.getenv('REVALIDATE_TOKEN')

if not revalidate_token:
    print("❌ Error: REVALIDATE_TOKEN not found in .env file")
    sys.exit(1)

try:
    response = requests.post(
        f"{api_url}/api/ingestion/trigger",
        json={"force_full_sync": False},
        headers={"Authorization": f"Bearer {revalidate_token}"},
        timeout=30.0
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Ingestion triggered successfully: {data['message']}")
        print("📝 Check ingestion status with: python scripts/test-ingestion-api.py")
    else:
        print(f"❌ Failed to trigger ingestion: {response.status_code} - {response.text}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ Error triggering ingestion: {e}")
    sys.exit(1)
