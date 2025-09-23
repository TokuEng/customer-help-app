#!/usr/bin/env python3
"""
Regenerate AI summaries for all existing articles in the database
"""

import asyncio
import asyncpg
import sys
import os
from dotenv import load_dotenv

# Add parent directory to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# Load environment variables
api_env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(api_env_path):
    load_dotenv(api_env_path)

from apps.api.services.ai_summarizer import AISummarizerService

async def regenerate_all_summaries():
    """Regenerate AI summaries for all articles"""
    
    # Get database URL
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not set")
        return
    
    # Initialize AI summarizer
    summarizer = AISummarizerService()
    
    print("🤖 Starting AI summary regeneration...")
    print("=" * 50)
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Get all articles
        articles = await conn.fetch("""
            SELECT id, slug, title, content_md, category, type, summary
            FROM articles
            WHERE visibility = 'public'
            ORDER BY updated_at DESC
        """)
        
        print(f"Found {len(articles)} articles to process\n")
        
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for i, article in enumerate(articles, 1):
            try:
                title = article['title']
                print(f"[{i}/{len(articles)}] Processing: {title[:60]}...")
                
                # Check if article already has a good summary
                existing_summary = article['summary']
                if existing_summary and len(existing_summary) > 100 and len(existing_summary) <= 250:
                    # Check if it's not a broken summary
                    if not any(bad_text in existing_summary.lower() for bad_text in 
                              ['](', 'http', '.png', '.jpg', 'notion-images']):
                        print(f"  ✓ Already has good summary ({len(existing_summary)} chars)")
                        skip_count += 1
                        continue
                
                # Generate new AI summary
                new_summary = await summarizer.generate_summary(
                    title=article['title'],
                    content_md=article['content_md'] or '',
                    category=article['category'] or 'General',
                    article_type=article['type'] or 'info',
                    max_chars=250
                )
                
                if new_summary and len(new_summary) > 20:
                    # Update database
                    await conn.execute("""
                        UPDATE articles 
                        SET summary = $1
                        WHERE id = $2
                    """, new_summary, article['id'])
                    
                    print(f"  ✅ Summary updated ({len(new_summary)} chars)")
                    if existing_summary:
                        print(f"     Old: {existing_summary[:100]}...")
                    print(f"     New: {new_summary}")
                    success_count += 1
                else:
                    print(f"  ⚠️ Generated summary too short or empty")
                    error_count += 1
                
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")
                error_count += 1
            
            # Add a small delay to avoid rate limiting
            if i % 10 == 0:
                await asyncio.sleep(1)
        
        # Close connection
        await conn.close()
        
        # Print summary
        print("\n" + "=" * 50)
        print("🎉 Summary regeneration complete!")
        print(f"  ✅ Updated: {success_count} articles")
        print(f"  ✓ Skipped: {skip_count} articles (already had good summaries)")
        if error_count > 0:
            print(f"  ❌ Errors: {error_count} articles")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()

async def regenerate_single_article(slug: str):
    """Regenerate AI summary for a single article by slug"""
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not set")
        return
    
    summarizer = AISummarizerService()
    
    try:
        conn = await asyncpg.connect(database_url)
        
        # Get the article
        article = await conn.fetchrow("""
            SELECT id, slug, title, content_md, category, type, summary
            FROM articles
            WHERE slug = $1
        """, slug)
        
        if not article:
            print(f"❌ Article with slug '{slug}' not found")
            return
        
        print(f"🤖 Regenerating summary for: {article['title']}")
        
        # Generate new summary
        new_summary = await summarizer.generate_summary(
            title=article['title'],
            content_md=article['content_md'] or '',
            category=article['category'] or 'General',
            article_type=article['type'] or 'info',
            max_chars=250
        )
        
        if new_summary:
            # Update database
            await conn.execute("""
                UPDATE articles 
                SET summary = $1
                WHERE id = $2
            """, new_summary, article['id'])
            
            print(f"\n✅ Summary updated successfully!")
            if article['summary']:
                print(f"Old: {article['summary']}")
            print(f"New: {new_summary}")
        else:
            print("❌ Failed to generate summary")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Regenerate AI summaries for articles')
    parser.add_argument('--slug', help='Regenerate summary for a specific article by slug')
    parser.add_argument('--all', action='store_true', help='Regenerate summaries for all articles')
    
    args = parser.parse_args()
    
    if args.slug:
        asyncio.run(regenerate_single_article(args.slug))
    elif args.all:
        print("⚠️  This will regenerate summaries for ALL articles.")
        print("   This may take several minutes and will use OpenAI API credits.")
        confirm = input("Are you sure you want to continue? (yes/no): ")
        if confirm.lower() == 'yes':
            asyncio.run(regenerate_all_summaries())
        else:
            print("❌ Operation cancelled")
    else:
        print("Usage:")
        print("  Regenerate all summaries:      python scripts/regenerate-summaries.py --all")
        print("  Regenerate single article:     python scripts/regenerate-summaries.py --slug article-slug")
        print("")
        print("Examples:")
        print("  python scripts/regenerate-summaries.py --slug toku-us-workco-international")
        print("  python scripts/regenerate-summaries.py --all")
