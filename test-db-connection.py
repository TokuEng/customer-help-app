#!/usr/bin/env python3
"""
Test database connection to verify environment setup
"""

import os
import sys
import asyncio
import asyncpg
from urllib.parse import urlparse
from dotenv import load_dotenv

async def test_connection():
    # Load environment from API .env file
    api_env_path = os.path.join(os.path.dirname(__file__), 'apps', 'api', '.env')
    
    if not os.path.exists(api_env_path):
        print("❌ No .env file found at apps/api/.env")
        print("   Run ./switch-env.sh to set up your environment")
        return False
    
    load_dotenv(api_env_path)
    
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    # Parse the database URL
    parsed = urlparse(database_url)
    
    print("🔍 Testing database connection...")
    print(f"   Host: {parsed.hostname}")
    print(f"   Port: {parsed.port or 5432}")
    print(f"   Database: {parsed.path[1:] if parsed.path else 'default'}")
    print(f"   User: {parsed.username}")
    
    # Determine if this is production or local
    is_production = 'digitalocean.com' in parsed.hostname if parsed.hostname else False
    
    if is_production:
        print("   Environment: 🔴 PRODUCTION")
    else:
        print("   Environment: 🟢 LOCAL")
    
    print("")
    
    try:
        # Connect to the database
        conn = await asyncpg.connect(database_url)
        
        print("✅ Successfully connected to database!")
        print("")
        
        # Run some basic queries
        print("📊 Database Statistics:")
        
        # Count articles
        article_count = await conn.fetchval("SELECT COUNT(*) FROM articles WHERE visibility = 'public'")
        print(f"   Articles: {article_count}")
        
        # Count chunks
        chunk_count = await conn.fetchval("SELECT COUNT(*) FROM chunks")
        print(f"   Chunks: {chunk_count}")
        
        # Get recent articles
        recent_articles = await conn.fetch("""
            SELECT title, updated_at, type, category
            FROM articles 
            WHERE visibility = 'public'
            ORDER BY updated_at DESC 
            LIMIT 5
        """)
        
        print("")
        print("📝 5 Most Recent Articles:")
        for article in recent_articles:
            print(f"   - {article['title'][:50]}...")
            print(f"     Type: {article['type']}, Category: {article['category']}")
            print(f"     Updated: {article['updated_at'].strftime('%Y-%m-%d %H:%M')}")
        
        # Check for articles with summaries
        summary_count = await conn.fetchval("""
            SELECT COUNT(*) 
            FROM articles 
            WHERE summary IS NOT NULL 
            AND summary != ''
            AND visibility = 'public'
        """)
        print("")
        print(f"📄 Articles with summaries: {summary_count}/{article_count}")
        
        # Get a sample article with summary for testing
        sample_article = await conn.fetchrow("""
            SELECT slug, title, LENGTH(summary) as summary_length
            FROM articles 
            WHERE summary IS NOT NULL 
            AND summary != ''
            AND visibility = 'public'
            ORDER BY updated_at DESC
            LIMIT 1
        """)
        
        if sample_article:
            print("")
            print("🔗 Sample article with summary to test:")
            print(f"   http://localhost:3000/a/{sample_article['slug']}")
            print(f"   Title: {sample_article['title']}")
            print(f"   Summary length: {sample_article['summary_length']} characters")
        
        await conn.close()
        
        print("")
        if is_production:
            print("⚠️  REMINDER: You're connected to PRODUCTION. Be careful with write operations!")
        else:
            print("✨ Ready for local development!")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        print("")
        
        if 'no pg_hba.conf entry' in str(e) or 'FATAL' in str(e):
            print("🔧 Possible fixes:")
            print("   1. Check if your IP is whitelisted in DigitalOcean")
            print("   2. Verify database credentials are correct")
            print("   3. Ensure SSL is enabled (sslmode=require)")
        elif 'Connection refused' in str(e):
            print("🔧 Possible fixes:")
            print("   1. Check if database server is running")
            print("   2. Verify host and port are correct")
            print("   3. Check network connectivity")
        elif 'password authentication failed' in str(e):
            print("🔧 Possible fixes:")
            print("   1. Verify password is correct")
            print("   2. Check username is correct")
        
        return False

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)
