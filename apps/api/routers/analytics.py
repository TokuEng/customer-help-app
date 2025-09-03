from fastapi import APIRouter, Request, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncpg
from core.settings import settings
import json

router = APIRouter()

# Admin authentication
def verify_admin_access(admin_key: Optional[str] = Header(None)):
    """Simple admin key verification"""
    expected_key = settings.admin_key
    
    if not admin_key or admin_key != expected_key:
        raise HTTPException(
            status_code=401, 
            detail="Admin access required. Provide valid admin-key header."
        )

# Request Models
class TrackViewRequest(BaseModel):
    article_id: str

class TrackSearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    results_count: int = 0

class TrackChatRequest(BaseModel):
    session_id: Optional[str] = None
    user_message: str
    assistant_response: Optional[str] = None
    contexts_used: Optional[List[Dict[str, Any]]] = None
    response_time_ms: Optional[int] = None

class TrackPageVisitRequest(BaseModel):
    page_path: str
    page_title: Optional[str] = None
    referrer: Optional[str] = None

# Response Models
class PopularArticle(BaseModel):
    id: str
    slug: str
    title: str
    summary: Optional[str]
    reading_time_min: int
    view_count: int

class CategoryCount(BaseModel):
    category: str
    count: int

class SearchStatsResponse(BaseModel):
    total_searches: int
    unique_queries: int
    top_queries: List[Dict[str, Any]]
    avg_results_count: float

class ChatStatsResponse(BaseModel):
    total_chats: int
    unique_sessions: int
    avg_response_time_ms: Optional[float]
    top_questions: List[Dict[str, Any]]

class PageVisitStatsResponse(BaseModel):
    total_visits: int
    unique_pages: int
    top_pages: List[Dict[str, Any]]

class AnalyticsDashboardResponse(BaseModel):
    article_views: Dict[str, Any]
    searches: Dict[str, Any] 
    chats: Dict[str, Any]
    page_visits: Dict[str, Any]
    time_range: str

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

@router.get("/category-counts", response_model=List[CategoryCount])
async def get_category_counts(request: Request):
    """Get article counts by category"""
    try:
        # Get database pool
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Get article counts by category
            category_counts = await conn.fetch(
                """
                SELECT 
                    category,
                    COUNT(*) as count
                FROM articles
                WHERE visibility = 'public' AND category IS NOT NULL
                GROUP BY category
                ORDER BY category
                """
            )
            
            return [
                CategoryCount(
                    category=row['category'],
                    count=row['count']
                )
                for row in category_counts
            ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New tracking endpoints
@router.post("/track-search")
async def track_search_query(request: Request, body: TrackSearchRequest):
    """Track a search query for analytics"""
    try:
        db_pool = request.app.state.db_pool()
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO search_queries (query, filters, results_count, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5)
                """,
                body.query, 
                json.dumps(body.filters) if body.filters else None,
                body.results_count,
                client_ip, 
                user_agent
            )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track-chat")
async def track_chat_interaction(request: Request, body: TrackChatRequest):
    """Track a chat interaction for analytics"""
    try:
        db_pool = request.app.state.db_pool()
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO chat_interactions (session_id, user_message, assistant_response, contexts_used, response_time_ms, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                body.session_id,
                body.user_message,
                body.assistant_response,
                json.dumps(body.contexts_used) if body.contexts_used else None,
                body.response_time_ms,
                client_ip,
                user_agent
            )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track-page-visit")
async def track_page_visit(request: Request, body: TrackPageVisitRequest):
    """Track a page visit for analytics"""
    try:
        db_pool = request.app.state.db_pool()
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO page_visits (page_path, page_title, referrer, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5)
                """,
                body.page_path,
                body.page_title,
                body.referrer,
                client_ip,
                user_agent
            )
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics dashboard endpoints
@router.get("/search-stats", response_model=SearchStatsResponse)
async def get_search_stats(request: Request, days: int = 30, admin_access=Depends(verify_admin_access)):
    """Get search analytics stats"""
    try:
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Basic search stats
            stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_searches,
                    COUNT(DISTINCT query) as unique_queries,
                    AVG(results_count)::float as avg_results_count
                FROM search_queries
                WHERE searched_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Top queries
            top_queries = await conn.fetch(
                f"""
                SELECT 
                    query,
                    COUNT(*) as count,
                    AVG(results_count)::float as avg_results
                FROM search_queries
                WHERE searched_at >= NOW() - INTERVAL '{days} days'
                GROUP BY query
                ORDER BY count DESC
                LIMIT 10
                """
            )
            
            return SearchStatsResponse(
                total_searches=stats['total_searches'],
                unique_queries=stats['unique_queries'],
                top_queries=[{
                    "query": row['query'],
                    "count": row['count'],
                    "avg_results": row['avg_results']
                } for row in top_queries],
                avg_results_count=stats['avg_results_count'] or 0.0
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat-stats", response_model=ChatStatsResponse)
async def get_chat_stats(request: Request, days: int = 30, admin_access=Depends(verify_admin_access)):
    """Get chat analytics stats"""
    try:
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Basic chat stats
            stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_chats,
                    COUNT(DISTINCT session_id) as unique_sessions,
                    AVG(response_time_ms)::float as avg_response_time_ms
                FROM chat_interactions
                WHERE created_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Top questions (grouped by similar messages)
            top_questions = await conn.fetch(
                f"""
                SELECT 
                    user_message,
                    COUNT(*) as count
                FROM chat_interactions
                WHERE created_at >= NOW() - INTERVAL '{days} days'
                GROUP BY user_message
                ORDER BY count DESC
                LIMIT 10
                """
            )
            
            return ChatStatsResponse(
                total_chats=stats['total_chats'],
                unique_sessions=stats['unique_sessions'] or 0,
                avg_response_time_ms=stats['avg_response_time_ms'],
                top_questions=[{
                    "question": row['user_message'],
                    "count": row['count']
                } for row in top_questions]
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/page-visit-stats", response_model=PageVisitStatsResponse)
async def get_page_visit_stats(request: Request, days: int = 30, admin_access=Depends(verify_admin_access)):
    """Get page visit analytics stats"""
    try:
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Basic page visit stats
            stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_visits,
                    COUNT(DISTINCT page_path) as unique_pages
                FROM page_visits
                WHERE visited_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Top pages
            top_pages = await conn.fetch(
                f"""
                SELECT 
                    page_path,
                    page_title,
                    COUNT(*) as count
                FROM page_visits
                WHERE visited_at >= NOW() - INTERVAL '{days} days'
                GROUP BY page_path, page_title
                ORDER BY count DESC
                LIMIT 10
                """
            )
            
            return PageVisitStatsResponse(
                total_visits=stats['total_visits'],
                unique_pages=stats['unique_pages'],
                top_pages=[{
                    "path": row['page_path'],
                    "title": row['page_title'],
                    "count": row['count']
                } for row in top_pages]
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
async def get_analytics_dashboard(request: Request, days: int = 30, admin_access=Depends(verify_admin_access)):
    """Get comprehensive analytics dashboard data"""
    try:
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Article views stats
            article_stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_views,
                    COUNT(DISTINCT article_id) as unique_articles
                FROM article_views
                WHERE viewed_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Search stats
            search_stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_searches,
                    COUNT(DISTINCT query) as unique_queries
                FROM search_queries
                WHERE searched_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Chat stats
            chat_stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_chats,
                    COUNT(DISTINCT session_id) as unique_sessions
                FROM chat_interactions
                WHERE created_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Page visit stats
            page_stats = await conn.fetchrow(
                f"""
                SELECT 
                    COUNT(*) as total_visits,
                    COUNT(DISTINCT page_path) as unique_pages
                FROM page_visits
                WHERE visited_at >= NOW() - INTERVAL '{days} days'
                """
            )
            
            # Daily activity trends
            daily_trends = await conn.fetch(
                f"""
                SELECT 
                    DATE(viewed_at) as date,
                    COUNT(*) as article_views
                FROM article_views
                WHERE viewed_at >= NOW() - INTERVAL '{days} days'
                GROUP BY DATE(viewed_at)
                ORDER BY date
                """
            )
            
            return AnalyticsDashboardResponse(
                article_views={
                    "total": article_stats['total_views'],
                    "unique_articles": article_stats['unique_articles']
                },
                searches={
                    "total": search_stats['total_searches'],
                    "unique_queries": search_stats['unique_queries']
                },
                chats={
                    "total": chat_stats['total_chats'],
                    "unique_sessions": chat_stats['unique_sessions'] or 0
                },
                page_visits={
                    "total": page_stats['total_visits'],
                    "unique_pages": page_stats['unique_pages']
                },
                time_range=f"Last {days} days"
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
