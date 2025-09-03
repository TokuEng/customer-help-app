from fastapi import APIRouter, HTTPException, Header, Query, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import asyncpg
import json
import uuid
from core.settings import settings

router = APIRouter()

class IngestionLogResponse(BaseModel):
    id: int
    started_at: datetime
    completed_at: Optional[datetime]
    status: str
    trigger_type: str
    trigger_source: Optional[str]
    pages_processed: int
    pages_skipped: int
    pages_updated: int
    pages_failed: int
    force_full_sync: bool
    error_message: Optional[str]
    duration_seconds: Optional[int]

class IngestionEventResponse(BaseModel):
    id: int
    timestamp: datetime
    event_type: str
    page_id: Optional[str]
    page_title: Optional[str]
    category: Optional[str]
    message: Optional[str]

class IngestionSummaryResponse(BaseModel):
    date: str
    total_runs: int
    successful_runs: int
    failed_runs: int
    total_pages_processed: int
    total_pages_updated: int
    avg_duration_seconds: Optional[float]

class DashboardStatsResponse(BaseModel):
    total_articles: int
    last_sync_time: Optional[datetime]
    ingestions_today: int
    ingestions_this_week: int
    success_rate_7d: float
    avg_duration_7d: Optional[float]
    recent_logs: List[IngestionLogResponse]

# Work Submissions Models
class WorkSubmissionRequest(BaseModel):
    request_type: str
    title: str
    description: str
    priority: Optional[str] = "medium"
    submitter_name: str
    submitter_email: EmailStr
    submitter_role: Optional[str] = None
    department: Optional[str] = None
    tags: Optional[List[str]] = []
    attachments: Optional[List[dict]] = []

class WorkSubmissionResponse(BaseModel):
    id: str
    request_type: str
    title: str
    description: str
    priority: str
    status: str
    submitter_name: str
    submitter_email: str
    submitter_role: Optional[str]
    department: Optional[str]
    tags: List[str]
    attachments: Optional[List[dict]]
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

# Analytics Models
class PopularArticle(BaseModel):
    id: str
    slug: str
    title: str
    summary: Optional[str]
    reading_time_min: int
    view_count: int

class SearchAnalytics(BaseModel):
    total_searches: int
    unique_queries: int
    avg_results_per_search: float
    no_results_rate: float
    top_queries: List[Dict[str, Any]]

@router.get("/admin/ingestion/logs", response_model=List[IngestionLogResponse])
async def get_ingestion_logs(
    authorization: str = Header(..., description="Bearer token"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Get ingestion logs with optional filtering"""
    # Validate token
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = await asyncpg.connect(settings.database_url)
    try:
        query = """
            SELECT id, started_at, completed_at, status, trigger_type, trigger_source,
                   pages_processed, pages_skipped, pages_updated, pages_failed,
                   force_full_sync, error_message, duration_seconds
            FROM ingestion_logs
        """
        params = []
        
        if status:
            query += " WHERE status = $1"
            params.append(status)
        
        query += " ORDER BY started_at DESC LIMIT $" + str(len(params) + 1) + " OFFSET $" + str(len(params) + 2)
        params.extend([limit, offset])
        
        rows = await conn.fetch(query, *params)
        
        return [
            IngestionLogResponse(**dict(row))
            for row in rows
        ]
    finally:
        await conn.close()

@router.get("/admin/ingestion/logs/{log_id}/events", response_model=List[IngestionEventResponse])
async def get_ingestion_events(
    log_id: int,
    authorization: str = Header(..., description="Bearer token"),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    """Get events for a specific ingestion log"""
    # Validate token
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = await asyncpg.connect(settings.database_url)
    try:
        query = """
            SELECT id, timestamp, event_type, page_id, page_title, category, message
            FROM ingestion_events
            WHERE ingestion_log_id = $1
        """
        params = [log_id]
        
        if event_type:
            query += " AND event_type = $2"
            params.append(event_type)
        
        query += " ORDER BY timestamp DESC LIMIT $" + str(len(params) + 1)
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
        
        return [
            IngestionEventResponse(**dict(row))
            for row in rows
        ]
    finally:
        await conn.close()

@router.get("/admin/ingestion/summary", response_model=List[IngestionSummaryResponse])
async def get_ingestion_summary(
    authorization: str = Header(..., description="Bearer token"),
    days: int = Query(30, ge=1, le=365)
):
    """Get ingestion summary statistics by day"""
    # Validate token
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = await asyncpg.connect(settings.database_url)
    try:
        rows = await conn.fetch(
            """
            SELECT 
                date::text,
                total_runs,
                successful_runs,
                failed_runs,
                total_pages_processed,
                total_pages_updated,
                avg_duration_seconds
            FROM ingestion_summary
            WHERE date >= CURRENT_DATE - INTERVAL '%s days'
            LIMIT %s
            """,
            days, days
        )
        
        return [
            IngestionSummaryResponse(**dict(row))
            for row in rows
        ]
    finally:
        await conn.close()

@router.get("/admin/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    authorization: str = Header(..., description="Bearer token")
):
    """Get dashboard statistics for the admin UI"""
    # Validate token
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    conn = await asyncpg.connect(settings.database_url)
    try:
        # Get various stats in parallel using a single query
        stats = await conn.fetchrow(
            """
            WITH stats AS (
                SELECT 
                    (SELECT COUNT(*) FROM articles) as total_articles,
                    (SELECT last_synced FROM ingestion_state WHERE id = 1) as last_sync_time,
                    (SELECT COUNT(*) FROM ingestion_logs WHERE DATE(started_at) = CURRENT_DATE) as ingestions_today,
                    (SELECT COUNT(*) FROM ingestion_logs WHERE started_at >= CURRENT_DATE - INTERVAL '7 days') as ingestions_this_week,
                    (SELECT 
                        CASE 
                            WHEN COUNT(*) = 0 THEN 0
                            ELSE COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100
                        END
                     FROM ingestion_logs 
                     WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
                    ) as success_rate_7d,
                    (SELECT AVG(duration_seconds) 
                     FROM ingestion_logs 
                     WHERE started_at >= CURRENT_DATE - INTERVAL '7 days' 
                       AND status = 'completed'
                    ) as avg_duration_7d
            )
            SELECT * FROM stats
            """
        )
        
        # Get recent logs
        recent_logs = await conn.fetch(
            """
            SELECT id, started_at, completed_at, status, trigger_type, trigger_source,
                   pages_processed, pages_skipped, pages_updated, pages_failed,
                   force_full_sync, error_message, duration_seconds
            FROM ingestion_logs
            ORDER BY started_at DESC
            LIMIT 10
            """
        )
        
        return DashboardStatsResponse(
            total_articles=stats['total_articles'],
            last_sync_time=stats['last_sync_time'],
            ingestions_today=stats['ingestions_today'],
            ingestions_this_week=stats['ingestions_this_week'],
            success_rate_7d=round(stats['success_rate_7d'], 1),
            avg_duration_7d=stats['avg_duration_7d'],
            recent_logs=[IngestionLogResponse(**dict(row)) for row in recent_logs]
        )
    finally:
        await conn.close()

# Work Submissions Endpoints
@router.get("/admin/work-submissions", response_model=List[WorkSubmissionResponse])
async def get_work_submissions(
    request: Request,
    authorization: str = Header(..., description="Bearer token"),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Get all work submissions with optional filtering"""
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db_pool = request.app.state.db_pool()
    async with db_pool.acquire() as conn:
        query = """
            SELECT * FROM work_submissions
            WHERE 1=1
        """
        params = []
        param_count = 0
        
        if status:
            param_count += 1
            query += f" AND status = ${param_count}"
            params.append(status)
        
        if priority:
            param_count += 1
            query += f" AND priority = ${param_count}"
            params.append(priority)
        
        query += f" ORDER BY created_at DESC LIMIT ${param_count + 1} OFFSET ${param_count + 2}"
        params.extend([limit, offset])
        
        rows = await conn.fetch(query, *params)
        
        return [
            WorkSubmissionResponse(
                id=row['id'],
                request_type=row['request_type'],
                title=row['title'],
                description=row['description'],
                priority=row['priority'],
                status=row['status'],
                submitter_name=row['submitter_name'],
                submitter_email=row['submitter_email'],
                submitter_role=row.get('submitter_role'),
                department=row.get('department'),
                tags=json.loads(row.get('tags', '[]')),
                attachments=json.loads(row.get('attachments', '[]')),
                assigned_to=row.get('assigned_to'),
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                completed_at=row.get('completed_at')
            )
            for row in rows
        ]

@router.get("/admin/analytics/overview")
async def get_analytics_overview(
    request: Request,
    authorization: str = Header(..., description="Bearer token"),
    days: int = Query(7, ge=1, le=90)
):
    """Get analytics overview for the admin dashboard"""
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db_pool = request.app.state.db_pool()
    async with db_pool.acquire() as conn:
        # Get various analytics
        overview = await conn.fetchrow("""
            WITH date_range AS (
                SELECT 
                    CURRENT_DATE - INTERVAL '%s days' as start_date,
                    CURRENT_DATE as end_date
            )
            SELECT 
                -- Article views
                (SELECT COUNT(*) FROM article_views av, date_range dr 
                 WHERE av.viewed_at >= dr.start_date) as total_views,
                (SELECT COUNT(DISTINCT article_id) FROM article_views av, date_range dr 
                 WHERE av.viewed_at >= dr.start_date) as unique_articles_viewed,
                 
                -- Search analytics
                (SELECT COUNT(*) FROM search_logs sl, date_range dr 
                 WHERE sl.searched_at >= dr.start_date) as total_searches,
                (SELECT COUNT(DISTINCT query) FROM search_logs sl, date_range dr 
                 WHERE sl.searched_at >= dr.start_date) as unique_queries,
                 
                -- Chat analytics
                (SELECT COUNT(*) FROM chat_logs cl, date_range dr 
                 WHERE cl.created_at >= dr.start_date) as total_chats,
                (SELECT COUNT(DISTINCT session_id) FROM chat_logs cl, date_range dr 
                 WHERE cl.created_at >= dr.start_date) as unique_sessions,
                 
                -- Page visits
                (SELECT COUNT(*) FROM page_visits pv, date_range dr 
                 WHERE pv.visited_at >= dr.start_date) as total_page_visits
        """, days)
        
        # Get popular articles
        popular_articles = await conn.fetch("""
            SELECT 
                a.id,
                a.slug,
                a.title,
                a.summary,
                a.reading_time_min,
                COUNT(av.id) as view_count
            FROM articles a
            JOIN article_views av ON a.id = av.article_id
            WHERE av.viewed_at >= CURRENT_DATE - INTERVAL '%s days'
            GROUP BY a.id, a.slug, a.title, a.summary, a.reading_time_min
            ORDER BY view_count DESC
            LIMIT 10
        """, days)
        
        # Get top search queries
        top_queries = await conn.fetch("""
            SELECT 
                query,
                COUNT(*) as search_count,
                AVG(results_count) as avg_results
            FROM search_logs
            WHERE searched_at >= CURRENT_DATE - INTERVAL '%s days'
            GROUP BY query
            ORDER BY search_count DESC
            LIMIT 10
        """, days)
        
        return {
            "period_days": days,
            "article_metrics": {
                "total_views": overview['total_views'],
                "unique_articles_viewed": overview['unique_articles_viewed']
            },
            "search_metrics": {
                "total_searches": overview['total_searches'],
                "unique_queries": overview['unique_queries']
            },
            "chat_metrics": {
                "total_chats": overview['total_chats'],
                "unique_sessions": overview['unique_sessions']
            },
            "page_visits": overview['total_page_visits'],
            "popular_articles": [
                PopularArticle(**dict(row))
                for row in popular_articles
            ],
            "top_search_queries": [
                {
                    "query": row['query'],
                    "count": row['search_count'],
                    "avg_results": float(row['avg_results'])
                }
                for row in top_queries
            ]
        }

@router.get("/admin/analytics/trends")
async def get_analytics_trends(
    request: Request,
    authorization: str = Header(..., description="Bearer token"),
    days: int = Query(30, ge=1, le=90),
    metric: str = Query("all", regex="^(all|views|searches|chats)$")
):
    """Get analytics trends over time"""
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db_pool = request.app.state.db_pool()
    async with db_pool.acquire() as conn:
        trends_data = {}
        
        if metric in ["all", "views"]:
            views_trend = await conn.fetch("""
                SELECT 
                    DATE(viewed_at) as date,
                    COUNT(*) as count
                FROM article_views
                WHERE viewed_at >= CURRENT_DATE - INTERVAL '%s days'
                GROUP BY DATE(viewed_at)
                ORDER BY date
            """, days)
            trends_data["views"] = [
                {"date": row['date'].isoformat(), "count": row['count']}
                for row in views_trend
            ]
        
        if metric in ["all", "searches"]:
            searches_trend = await conn.fetch("""
                SELECT 
                    DATE(searched_at) as date,
                    COUNT(*) as count
                FROM search_logs
                WHERE searched_at >= CURRENT_DATE - INTERVAL '%s days'
                GROUP BY DATE(searched_at)
                ORDER BY date
            """, days)
            trends_data["searches"] = [
                {"date": row['date'].isoformat(), "count": row['count']}
                for row in searches_trend
            ]
        
        if metric in ["all", "chats"]:
            chats_trend = await conn.fetch("""
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM chat_logs
                WHERE created_at >= CURRENT_DATE - INTERVAL '%s days'
                GROUP BY DATE(created_at)
                ORDER BY date
            """, days)
            trends_data["chats"] = [
                {"date": row['date'].isoformat(), "count": row['count']}
                for row in chats_trend
            ]
        
        return trends_data
