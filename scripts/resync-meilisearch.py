#!/usr/bin/env python3
"""
Resync Meilisearch from PostgreSQL to fix duplicates
"""
import asyncio
import asyncpg
import meilisearch
import os
from dotenv import load_dotenv

# Load environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/help_center')
MEILI_HOST = os.getenv('MEILI_HOST', 'http://localhost:7700')
MEILI_MASTER_KEY = os.getenv('MEILI_MASTER_KEY', 'masterKey')

async def resync_meilisearch():
    print("🔄 Resyncing Meilisearch from PostgreSQL...")
    
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Initialize Meilisearch
    meili_client = meilisearch.Client(MEILI_HOST, MEILI_MASTER_KEY)
    
    try:
        # Delete and recreate index to clear duplicates
        print("1️⃣ Clearing Meilisearch index...")
        try:
            meili_client.delete_index('articles')
            print("   ✅ Deleted existing index")
        except:
            print("   ℹ️  No existing index to delete")
        
        # Create new index
        meili_client.create_index('articles', {'primaryKey': 'id'})
        print("   ✅ Created new index")
        
        # Configure index settings
        index = meili_client.index('articles')
        index.update_settings({
            'searchableAttributes': ['title', 'summary', 'content_md'],
            'filterableAttributes': ['type', 'category', 'tags', 'persona'],
            'sortableAttributes': ['updated_at']
        })
        print("   ✅ Configured index settings")
        
        # Get all articles from PostgreSQL
        print("\n2️⃣ Fetching articles from PostgreSQL...")
        articles = await conn.fetch("""
            SELECT 
                id, slug, title, summary, content_md,
                type, category, tags, persona,
                reading_time_min, updated_at
            FROM articles
            ORDER BY updated_at DESC
        """)
        
        print(f"   Found {len(articles)} articles")
        
        if articles:
            # Prepare documents for Meilisearch
            documents = []
            for article in articles:
                doc = {
                    'id': str(article['id']),
                    'slug': article['slug'],
                    'title': article['title'],
                    'summary': article['summary'],
                    'content_md': article['content_md'][:10000],  # Limit content size
                    'type': article['type'],
                    'category': article['category'],
                    'tags': article['tags'] or [],
                    'persona': article['persona'],
                    'reading_time_min': article['reading_time_min'],
                    'updated_at': article['updated_at'].isoformat()
                }
                documents.append(doc)
            
            # Add documents to Meilisearch
            print("\n3️⃣ Indexing articles in Meilisearch...")
            index.add_documents(documents)
            print(f"   ✅ Indexed {len(documents)} articles")
        
        # Verify no duplicates
        print("\n4️⃣ Verifying data integrity...")
        search_results = index.search('*', {'limit': 1000})
        slugs = [hit['slug'] for hit in search_results['hits']]
        duplicates = [slug for slug in set(slugs) if slugs.count(slug) > 1]
        
        if duplicates:
            print(f"   ⚠️  Found duplicate slugs: {duplicates}")
        else:
            print(f"   ✅ No duplicates found! Total documents: {len(slugs)}")
        
    finally:
        await conn.close()
    
    print("\n✅ Resync complete!")

if __name__ == "__main__":
    asyncio.run(resync_meilisearch())
