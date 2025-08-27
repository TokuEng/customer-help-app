#!/usr/bin/env python3
"""
Monitor ingestion progress
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import time

# Load environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/help_center')

async def monitor_progress():
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("📊 Monitoring ingestion progress...")
    print("Press Ctrl+C to stop\n")
    
    start_time = time.time()
    
    try:
        while True:
            # Get counts
            article_count = await conn.fetchval("SELECT COUNT(*) FROM articles")
            chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
            
            # Calculate rate
            elapsed = time.time() - start_time
            rate = article_count / (elapsed / 60) if elapsed > 0 else 0
            
            # Estimate remaining time
            remaining = 47 - article_count
            eta_minutes = remaining / rate if rate > 0 else 0
            
            print(f"\r📈 Articles: {article_count}/47 | Chunks: {chunk_count} | Rate: {rate:.1f} articles/min | ETA: {eta_minutes:.1f} min", end="", flush=True)
            
            if article_count >= 47:
                print("\n\n✅ Ingestion complete!")
                break
                
            await asyncio.sleep(5)  # Update every 5 seconds
            
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(monitor_progress())
