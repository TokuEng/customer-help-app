from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

# Request models
class ArticleViewRequest(BaseModel):
    article_id: str

class SearchTrackRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    results_count: int = 0

class ChatTrackRequest(BaseModel):
    session_id: Optional[str] = None
    user_message: str
    assistant_response: Optional[str] = None
    contexts_used: Optional[List[Any]] = None
    response_time_ms: Optional[int] = None

class PageVisitRequest(BaseModel):
    page_path: str
    page_title: Optional[str] = None
    referrer: Optional[str] = None

# Analytics endpoints
@router.post("/track-view")
async def track_article_view(request: Request, data: ArticleViewRequest):
    """Track article view"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO article_views (article_id, viewed_at)
                VALUES ($1, NOW())
                """,
                data.article_id
            )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking article view: {e}")
        # Return success even on error to not disrupt user experience
        return {"success": True}

@router.post("/track-search")
async def track_search(request: Request, data: SearchTrackRequest):
    """Track search query"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO search_logs (query, filters, results_count, searched_at)
                VALUES ($1, $2, $3, NOW())
                """,
                data.query,
                json.dumps(data.filters) if data.filters else None,
                data.results_count
            )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking search: {e}")
        return {"success": True}

@router.post("/track-chat")
async def track_chat(request: Request, data: ChatTrackRequest):
    """Track chat interaction"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            # Generate session ID if not provided
            session_id = data.session_id or str(uuid.uuid4())
            
            await conn.execute(
                """
                INSERT INTO chat_interactions (
                    session_id, user_message, assistant_response, 
                    contexts_used, response_time_ms, created_at
                )
                VALUES ($1, $2, $3, $4, $5, NOW())
                """,
                session_id,
                data.user_message,
                data.assistant_response,
                json.dumps(data.contexts_used) if data.contexts_used else None,
                data.response_time_ms
            )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking chat: {e}")
        return {"success": True}

@router.post("/track-page-visit")
async def track_page_visit(request: Request, data: PageVisitRequest):
    """Track page visit"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO page_visits (page_path, page_title, referrer, visited_at)
                VALUES ($1, $2, $3, NOW())
                """,
                data.page_path,
                data.page_title,
                data.referrer
            )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking page visit: {e}")
        return {"success": True}

@router.get("/popular-articles")
async def get_popular_articles(request: Request, limit: int = 5):
    """Get popular articles based on view count"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
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
                WHERE av.viewed_at >= NOW() - INTERVAL '30 days'
                GROUP BY a.id, a.slug, a.title, a.summary, a.reading_time_min
                ORDER BY view_count DESC
                LIMIT $1
                """,
                limit
            )
            
            return [
                {
                    "id": row['id'],
                    "slug": row['slug'],
                    "title": row['title'],
                    "summary": row['summary'],
                    "reading_time_min": row['reading_time_min'],
                    "view_count": row['view_count']
                }
                for row in rows
            ]
    except Exception as e:
        logger.error(f"Error getting popular articles: {e}")
        # Return empty list on error
        return []

@router.get("/page-visit-stats")
async def get_page_visit_stats(request: Request, days: int = 7):
    """Get page visit statistics"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            stats = await conn.fetchrow(
                """
                SELECT 
                    COUNT(*) as total_visits,
                    COUNT(DISTINCT page_path) as unique_pages,
                    COUNT(DISTINCT DATE(visited_at)) as active_days
                FROM page_visits
                WHERE visited_at >= NOW() - INTERVAL '%s days'
                """,
                days
            )
            
            return {
                "total_visits": stats['total_visits'],
                "unique_pages": stats['unique_pages'],
                "active_days": stats['active_days'],
                "period_days": days
            }
    except Exception as e:
        logger.error(f"Error getting page visit stats: {e}")
        return {
            "total_visits": 0,
            "unique_pages": 0,
            "active_days": 0,
            "period_days": days
        }

@router.get("/category-counts")
async def get_category_counts(request: Request):
    """Get article counts by category"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    category,
                    COUNT(*) as count
                FROM articles
                WHERE visibility = 'public'
                AND category IS NOT NULL
                GROUP BY category
                ORDER BY category
                """
            )
            
            return [
                {
                    "category": row['category'],
                    "count": row['count']
                }
                for row in rows
            ]
    except Exception as e:
        logger.error(f"Error getting category counts: {e}")
        # Return empty list on error
        return []


