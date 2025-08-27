#!/usr/bin/env python3
"""
Fix markdown display issues in existing articles
"""
import asyncio
import asyncpg
import os
import re
from dotenv import load_dotenv

# Load environment
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, 'apps', 'api', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/help_center')

def strip_markdown(text):
    """Strip markdown formatting from text"""
    # Remove bold/italic
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # Italic
    text = re.sub(r'__([^_]+)__', r'\1', text)      # Bold
    text = re.sub(r'_([^_]+)_', r'\1', text)        # Italic
    
    # Remove links but keep text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    
    # Remove images
    text = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', text)
    
    # Remove code blocks
    text = re.sub(r'```[^`]*```', '', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def clean_summary(content_md):
    """Create a clean summary from markdown content"""
    # Remove images first
    content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content_md)
    
    # Get first meaningful text (skip just numbers or short lines)
    lines = content.split('\n')
    summary_lines = []
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#') or len(line) < 10:
            continue
        
        # Clean the line
        clean_line = strip_markdown(line)
        if clean_line and len(clean_line) > 10:
            summary_lines.append(clean_line)
            
        if len(' '.join(summary_lines)) > 150:
            break
    
    summary = ' '.join(summary_lines)[:200]
    if len(summary) > 197:
        summary = summary[:197] + '...'
    
    return summary

async def fix_summaries():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Get all articles
        articles = await conn.fetch("SELECT id, content_md, summary FROM articles")
        
        for article in articles:
            # Generate clean summary
            clean_summary_text = clean_summary(article['content_md'])
            
            # Update summary
            await conn.execute(
                "UPDATE articles SET summary = $1 WHERE id = $2",
                clean_summary_text,
                article['id']
            )
            
            print(f"✅ Updated summary for article {article['id']}")
        
        print(f"\n✅ Updated {len(articles)} articles")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_summaries())
