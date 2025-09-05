from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from services.chunking import ChunkingService

router = APIRouter()

class Article(BaseModel):
    id: str
    slug: str
    title: str
    summary: Optional[str]
    content_html: str
    reading_time_min: int
    type: str
    category: str
    tags: List[str]
    persona: str
    updated_at: datetime
    toc: List[dict]  # List of {id: str, text: str, level: int}

class RelatedArticle(BaseModel):
    slug: str
    title: str
    summary: Optional[str]
    type: str
    category: str
    reading_time_min: int

@router.get("/articles/{slug}", response_model=Article)
async def get_article(request: Request, slug: str):
    db_pool = request.app.state.db_pool()
    
    async with db_pool.acquire() as conn:
        # Get article
        article = await conn.fetchrow(
            """
            SELECT id, slug, title, summary, content_html, ai_rendered_html, reading_time_min,
                   type, category, tags, persona, updated_at
            FROM articles
            WHERE slug = $1 AND visibility = 'public'
            """,
            slug
        )
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Build TOC from HTML content
        chunking_service = ChunkingService()
        toc = chunking_service.extract_headings_from_html(article['content_html'])
        
        # Use AI-rendered content if available, otherwise fall back to regular content
        content_to_use = article['ai_rendered_html'] or article['content_html']
        
        return Article(
            id=str(article['id']),
            slug=article['slug'],
            title=article['title'],
            summary=article['summary'],
            content_html=content_to_use,
            reading_time_min=article['reading_time_min'],
            type=article['type'],
            category=article['category'],
            tags=article['tags'] or [],
            persona=article['persona'],
            updated_at=article['updated_at'],
            toc=toc
        )

@router.get("/related", response_model=List[RelatedArticle])
async def get_related_articles(request: Request, slug: str, k: int = Query(default=5, le=10)):
    db_pool = request.app.state.db_pool()
    
    async with db_pool.acquire() as conn:
        # Get the article ID
        article = await conn.fetchrow(
            "SELECT id FROM articles WHERE slug = $1",
            slug
        )
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Get related articles using vector similarity
        related = await conn.fetch(
            """
            WITH article_embeddings AS (
                SELECT article_id, AVG(embedding) as avg_embedding
                FROM chunks
                WHERE article_id = $1
                GROUP BY article_id
            ),
            other_embeddings AS (
                SELECT c.article_id, AVG(c.embedding) as avg_embedding
                FROM chunks c
                WHERE c.article_id != $1
                GROUP BY c.article_id
            )
            SELECT a.slug, a.title, a.summary, a.type, a.category, a.reading_time_min,
                   1 - (ae.avg_embedding <=> oe.avg_embedding) as similarity
            FROM article_embeddings ae
            CROSS JOIN other_embeddings oe
            JOIN articles a ON a.id = oe.article_id
            WHERE a.visibility = 'public'
            ORDER BY similarity DESC
            LIMIT $2
            """,
            article['id'],
            k
        )
        
        return [
            RelatedArticle(
                slug=r['slug'],
                title=r['title'],
                summary=r['summary'],
                type=r['type'],
                category=r['category'],
                reading_time_min=r['reading_time_min']
            )
            for r in related
        ]
