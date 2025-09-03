#!/usr/bin/env python3
"""
Monitor automatic ingestion status and health
"""
import os
import sys
import asyncio
import asyncpg
import httpx
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import argparse

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
load_dotenv(env_path)

# For DigitalOcean deployment
if os.getenv('DO_DATABASE_URL'):
    os.environ['DATABASE_URL'] = os.getenv('DO_DATABASE_URL')

class IngestionMonitor:
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')
        self.api_url = os.getenv('API_URL', 'http://localhost:8080')
        self.revalidate_token = os.getenv('REVALIDATE_TOKEN')
        
    async def get_ingestion_stats(self):
        """Get ingestion statistics from database"""
        conn = await asyncpg.connect(self.database_url)
        try:
            # Get last sync time
            last_synced = await conn.fetchval(
                "SELECT last_synced FROM ingestion_state WHERE id = 1"
            )
            
            # Get article counts
            total_articles = await conn.fetchval("SELECT COUNT(*) FROM articles")
            
            # Get articles updated in last 24 hours
            recent_updates = await conn.fetchval(
                """
                SELECT COUNT(*) FROM articles 
                WHERE updated_at > $1
                """,
                datetime.now(timezone.utc) - timedelta(days=1)
            )
            
            # Get category distribution
            categories = await conn.fetch(
                """
                SELECT category, COUNT(*) as count 
                FROM articles 
                GROUP BY category 
                ORDER BY count DESC
                """
            )
            
            return {
                'last_synced': last_synced,
                'total_articles': total_articles,
                'recent_updates': recent_updates,
                'categories': dict(categories)
            }
        finally:
            await conn.close()
    
    async def check_api_status(self):
        """Check if ingestion API is running"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_url}/api/ingestion/status",
                    headers={"Authorization": f"Bearer {self.revalidate_token}"}
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
        except Exception as e:
            return None
    
    async def get_recent_logs(self, limit=20):
        """Get recent ingestion logs (if using a logging table)"""
        # This would require a logging table to be set up
        # For now, we'll return placeholder
        return []
    
    async def check_health(self):
        """Check overall health of ingestion system"""
        health = {
            'status': 'unknown',
            'checks': {},
            'warnings': [],
            'errors': []
        }
        
        # Check database connectivity
        try:
            stats = await self.get_ingestion_stats()
            health['checks']['database'] = 'ok'
            
            # Check if last sync is recent
            if stats['last_synced']:
                time_since_sync = datetime.now(timezone.utc) - stats['last_synced']
                if time_since_sync > timedelta(hours=1):
                    health['warnings'].append(f"Last sync was {time_since_sync.total_seconds() / 3600:.1f} hours ago")
                elif time_since_sync > timedelta(hours=24):
                    health['errors'].append(f"No sync in last 24 hours!")
            else:
                health['errors'].append("No sync history found")
                
        except Exception as e:
            health['checks']['database'] = 'error'
            health['errors'].append(f"Database error: {str(e)}")
        
        # Check API availability
        api_status = await self.check_api_status()
        if api_status:
            health['checks']['api'] = 'ok'
            if api_status['is_running']:
                health['checks']['ingestion_running'] = True
        else:
            health['checks']['api'] = 'error'
            health['warnings'].append("API endpoint not reachable")
        
        # Determine overall status
        if health['errors']:
            health['status'] = 'error'
        elif health['warnings']:
            health['status'] = 'warning'
        else:
            health['status'] = 'healthy'
        
        return health

async def main():
    parser = argparse.ArgumentParser(description='Monitor automatic ingestion')
    parser.add_argument('--watch', action='store_true', help='Continuously monitor')
    parser.add_argument('--interval', type=int, default=60, help='Watch interval in seconds')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    args = parser.parse_args()
    
    monitor = IngestionMonitor()
    
    while True:
        print("\n" + "=" * 60)
        print(f"Ingestion Monitor - {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print("=" * 60)
        
        # Get stats
        stats = await monitor.get_ingestion_stats()
        
        print("\n📊 Database Statistics:")
        print(f"   Total Articles: {stats['total_articles']}")
        print(f"   Recent Updates (24h): {stats['recent_updates']}")
        if stats['last_synced']:
            print(f"   Last Sync: {stats['last_synced'].strftime('%Y-%m-%d %H:%M:%S UTC')}")
            time_ago = datetime.now(timezone.utc) - stats['last_synced']
            print(f"   Time Since Sync: {time_ago.total_seconds() / 60:.1f} minutes")
        else:
            print("   Last Sync: Never")
        
        print("\n📁 Categories:")
        for category, count in stats['categories'].items():
            print(f"   {category}: {count} articles")
        
        # Check API status
        api_status = await monitor.check_api_status()
        print("\n🔌 API Status:")
        if api_status:
            print(f"   Status: {api_status['status']}")
            print(f"   Running: {'Yes' if api_status['is_running'] else 'No'}")
            print(f"   Message: {api_status['message']}")
        else:
            print("   Status: Unreachable")
        
        # Health check
        health = await monitor.check_health()
        print(f"\n🏥 Health Status: {health['status'].upper()}")
        
        if health['warnings']:
            print("\n⚠️  Warnings:")
            for warning in health['warnings']:
                print(f"   - {warning}")
        
        if health['errors']:
            print("\n❌ Errors:")
            for error in health['errors']:
                print(f"   - {error}")
        
        if not args.watch:
            break
        
        print(f"\n⏰ Next check in {args.interval} seconds... (Ctrl+C to stop)")
        await asyncio.sleep(args.interval)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Monitor stopped")
