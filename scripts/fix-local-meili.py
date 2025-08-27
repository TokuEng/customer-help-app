#!/usr/bin/env python3
"""
Update MEILI_HOST in .env to use local Meilisearch
"""
import os
import re

# Path to .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'apps', 'api', '.env')

if not os.path.exists(env_path):
    print("❌ No .env file found at apps/api/.env")
    exit(1)

# Read the .env file
with open(env_path, 'r') as f:
    content = f.read()

# Check current MEILI_HOST value
if 'MEILI_HOST=http://10.124.0.39:7700' in content:
    # Replace with localhost
    content = content.replace('MEILI_HOST=http://10.124.0.39:7700', 'MEILI_HOST=http://localhost:7700')
    
    # Write back
    with open(env_path, 'w') as f:
        f.write(content)
    
    print("✅ Updated MEILI_HOST to http://localhost:7700")
    print("   Your ingestion will now use the local Meilisearch instance")
else:
    # Check what the current value is
    match = re.search(r'MEILI_HOST=(.+)', content)
    if match:
        current_value = match.group(1)
        print(f"ℹ️  MEILI_HOST is currently set to: {current_value}")
        if 'localhost' in current_value:
            print("   Already configured for local development")
        else:
            print("   You may want to update it to: http://localhost:7700")
    else:
        print("⚠️  MEILI_HOST not found in .env file")
        print("   Add this line to your .env file:")
        print("   MEILI_HOST=http://localhost:7700")
