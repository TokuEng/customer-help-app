from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncpg
from core.settings import settings

router = APIRouter()

class TrackViewRequest(BaseModel):
    article_id: str

class PopularArticle(BaseModel):
    id: str
    slug: str
    title: str
    summary: Optional[str]
    reading_time_min: int
    view_count: int

@router.post("/track-view")
async def track_article_view(request: Request, body: TrackViewRequest):
    """Track an article view for analytics"""
    try:
        # Get database pool
        db_pool = request.app.state.db_pool()
        
        # Get client IP and user agent for basic tracking
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        async with db_pool.acquire() as conn:
            # Insert view record
            await conn.execute(
                """
                INSERT INTO article_views (article_id, ip_address, user_agent)
                VALUES ($1, $2, $3)
                """,
                body.article_id, client_ip, user_agent
            )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/popular-articles", response_model=List[PopularArticle])
async def get_popular_articles(request: Request, limit: int = 5):
    """Get most popular articles based on view count"""
    try:
        # Get database pool
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Get popular articles with view counts from last 30 days
            popular_articles = await conn.fetch(
                """
                SELECT 
                    a.id,
                    a.slug,
                    a.title,
                    a.summary,
                    a.reading_time_min,
                    COUNT(av.id) as view_count
                FROM articles a
                LEFT JOIN article_views av ON a.id = av.article_id 
                    AND av.viewed_at >= NOW() - INTERVAL '30 days'
                WHERE a.visibility = 'public'
                GROUP BY a.id, a.slug, a.title, a.summary, a.reading_time_min
                ORDER BY view_count DESC, a.updated_at DESC
                LIMIT $1
                """,
                limit
            )
            
            return [
                PopularArticle(
                    id=str(row['id']),
                    slug=row['slug'],
                    title=row['title'],
                    summary=row['summary'],
                    reading_time_min=row['reading_time_min'],
                    view_count=row['view_count']
                )
                for row in popular_articles
            ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
