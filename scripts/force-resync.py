#!/usr/bin/env python3
"""
Force re-sync all Notion content by clearing the last sync timestamp
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/help_center')

async def clear_sync_state():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Clear the last sync timestamp
        await conn.execute("DELETE FROM ingestion_state WHERE id = 1")
        print("✅ Cleared sync state. Next ingestion will process all pages.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(clear_sync_state())
