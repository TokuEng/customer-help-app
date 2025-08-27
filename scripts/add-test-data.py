#!/usr/bin/env python3
"""
Add test data to the database for local testing
"""
import asyncio
import asyncpg
import os
from datetime import datetime
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def add_test_data():
    # Connect to database
    DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/help_center')
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Test articles
        articles = [
            {
                'title': 'How to Submit Expenses',
                'slug': 'how-to-submit-expenses',
                'summary': 'Learn how to submit your expenses for reimbursement through our platform.',
                'content': '''
<h2>Submitting Expenses</h2>
<p>Follow these steps to submit your expenses:</p>
<ol>
<li>Log into the expense portal</li>
<li>Click "New Expense"</li>
<li>Fill in the details</li>
<li>Attach receipts</li>
<li>Submit for approval</li>
</ol>
<h3>Important Notes</h3>
<ul>
<li>Submit expenses within 30 days</li>
<li>Keep original receipts</li>
<li>Include business purpose</li>
</ul>
                ''',
                'category': 'Token Payroll',
                'type': 'how-to',
                'reading_time_min': 3,
                'notion_id': 'test-1',
                'notion_url': 'https://notion.so/test',
            },
            {
                'title': 'Health Benefits Overview',
                'slug': 'health-benefits-overview',
                'summary': 'Comprehensive guide to your health benefits package.',
                'content': '''
<h2>Your Health Benefits</h2>
<p>We offer comprehensive health coverage including:</p>
<ul>
<li>Medical insurance</li>
<li>Dental coverage</li>
<li>Vision care</li>
<li>Mental health support</li>
</ul>
                ''',
                'category': 'Benefits',
                'type': 'guide',
                'reading_time_min': 5,
                'notion_id': 'test-2',
                'notion_url': 'https://notion.so/test',
            },
            {
                'title': 'Remote Work Policy',
                'slug': 'remote-work-policy',
                'summary': 'Guidelines and expectations for remote work arrangements.',
                'content': '''
<h2>Remote Work Guidelines</h2>
<p>Our remote work policy allows flexibility while maintaining productivity.</p>
<h3>Key Points</h3>
<ul>
<li>Core hours: 10 AM - 3 PM your local time</li>
<li>Weekly team sync required</li>
<li>Home office stipend available</li>
</ul>
                ''',
                'category': 'Policy',
                'type': 'policy',
                'reading_time_min': 4,
                'notion_id': 'test-3',
                'notion_url': 'https://notion.so/test',
            }
        ]
        
        # Insert articles
        for article in articles:
            await conn.execute('''
                INSERT INTO articles (
                    title, slug, summary, content, content_html,
                    category, type, reading_time_min,
                    notion_id, notion_url, notion_last_edited,
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $4,
                    $5, $6, $7,
                    $8, $9, $10,
                    $11, $11
                )
                ON CONFLICT (slug) DO UPDATE SET
                    title = EXCLUDED.title,
                    content = EXCLUDED.content,
                    content_html = EXCLUDED.content_html,
                    updated_at = EXCLUDED.updated_at
            ''', 
                article['title'],
                article['slug'],
                article['summary'],
                article['content'],
                article['category'],
                article['type'],
                article['reading_time_min'],
                article['notion_id'],
                article['notion_url'],
                datetime.utcnow(),
                datetime.utcnow()
            )
        
        print(f"✅ Added {len(articles)} test articles")
        
        # Also need to index in Meilisearch
        import meilisearch
        meili_client = meilisearch.Client('http://localhost:7700', 'masterKey')
        
        # Get articles from DB with proper format
        db_articles = await conn.fetch('SELECT * FROM articles')
        
        # Format for Meilisearch
        docs = []
        for row in db_articles:
            docs.append({
                'id': str(row['id']),
                'title': row['title'],
                'slug': row['slug'],
                'summary': row['summary'],
                'content': row['content'],
                'category': row['category'],
                'type': row['type'],
                'reading_time_min': row['reading_time_min'],
                'updated_at': row['updated_at'].isoformat(),
            })
        
        # Index in Meilisearch
        index = meili_client.index('articles')
        index.add_documents(docs)
        
        print("✅ Indexed articles in Meilisearch")
        
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(add_test_data())
