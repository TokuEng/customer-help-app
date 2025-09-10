"""
AI rendering API endpoints for intelligent article formatting
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid
from services.ai_renderer import AIRendererService

router = APIRouter()

class RenderRequest(BaseModel):
    article_id: str
    force_rerender: bool = False

class RenderResponse(BaseModel):
    success: bool
    message: str
    render_id: Optional[str] = None

class RenderStatus(BaseModel):
    render_id: str
    status: str  # "pending", "processing", "completed", "failed"
    progress: int  # 0-100
    message: str

# In-memory store for render progress (in production, use Redis)
render_progress = {}

# Temporarily commented out - using original content rendering
# @router.post("/render", response_model=RenderResponse)
# async def trigger_ai_render(
#     request: Request, 
#     body: RenderRequest,
#     background_tasks: BackgroundTasks
# ):
#     """
#     Trigger AI rendering for an article
#     Returns immediately with render_id for progress tracking
#     """
    db_pool = request.app.state.db_pool()
    
    async with db_pool.acquire() as conn:
        # Get article data
        article = await conn.fetchrow(
            """
            SELECT id, slug, title, summary, content_md, content_html, 
                   ai_rendered_html, type, category, updated_at
            FROM articles 
            WHERE id = $1
            """,
            uuid.UUID(body.article_id)
        )
        
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Check if re-render is needed
        ai_service = AIRendererService()
        
        if not body.force_rerender:
            should_render = await ai_service.should_rerender(dict(article))
            if not should_render:
                return RenderResponse(
                    success=True,
                    message="Article already has up-to-date AI rendering"
                )
        
        # Generate render ID and start background task
        render_id = str(uuid.uuid4())
        render_progress[render_id] = {
            "status": "pending",
            "progress": 0,
            "message": "Queued for AI rendering..."
        }
        
        # Start background rendering
        background_tasks.add_task(
            render_article_background,
            render_id,
            dict(article),
            db_pool
        )
        
        return RenderResponse(
            success=True,
            message="AI rendering started",
            render_id=render_id
        )

@router.get("/render/{render_id}/status", response_model=RenderStatus)
async def get_render_status(render_id: str):
    """Get the status of an AI rendering task"""
    
    if render_id not in render_progress:
        raise HTTPException(status_code=404, detail="Render task not found")
    
    progress_data = render_progress[render_id]
    
    return RenderStatus(
        render_id=render_id,
        status=progress_data["status"],
        progress=progress_data["progress"],
        message=progress_data["message"]
    )

async def render_article_background(render_id: str, article_data: dict, db_pool):
    """Background task to render article content with AI"""
    
    try:
        # Update progress
        render_progress[render_id].update({
            "status": "processing",
            "progress": 10,
            "message": "Analyzing article content..."
        })
        
        ai_service = AIRendererService()
        
        # Update progress
        render_progress[render_id].update({
            "progress": 30,
            "message": "Generating AI-optimized HTML..."
        })
        
        # Render with AI
        ai_html = await ai_service.render_article_content(
            title=article_data['title'],
            content_md=article_data['content_md'] or article_data['content_html'],
            article_type=article_data['type'],
            category=article_data['category'],
            summary=article_data['summary']
        )
        
        # Update progress
        render_progress[render_id].update({
            "progress": 80,
            "message": "Saving optimized content..."
        })
        
        # Save to database
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE articles 
                SET ai_rendered_html = $1
                WHERE id = $2
                """,
                ai_html,
                article_data['id']
            )
        
        # Complete
        render_progress[render_id].update({
            "status": "completed",
            "progress": 100,
            "message": "AI rendering completed successfully!"
        })
        
    except Exception as e:
        render_progress[render_id].update({
            "status": "failed",
            "progress": 0,
            "message": f"AI rendering failed: {str(e)}"
        })

# @router.post("/render/batch")
# async def trigger_batch_render(
#     request: Request,
#     background_tasks: BackgroundTasks,
#     category: Optional[str] = None,
#     article_type: Optional[str] = None,
#     force_rerender: bool = False
# ):
#     """
#     Trigger AI rendering for multiple articles based on filters
#     """
    db_pool = request.app.state.db_pool()
    
    # Build query based on filters
    where_conditions = ["visibility = 'public'"]
    params = []
    
    if category:
        where_conditions.append(f"category = ${len(params) + 1}")
        params.append(category)
    
    if article_type:
        where_conditions.append(f"type = ${len(params) + 1}")
        params.append(article_type)
    
    if not force_rerender:
        where_conditions.append("ai_rendered_html IS NULL")
    
    query = f"""
        SELECT id, slug, title 
        FROM articles 
        WHERE {' AND '.join(where_conditions)}
        ORDER BY updated_at DESC
        LIMIT 50
    """
    
    async with db_pool.acquire() as conn:
        articles = await conn.fetch(query, *params)
    
    render_ids = []
    for article in articles:
        render_id = str(uuid.uuid4())
        render_progress[render_id] = {
            "status": "pending",
            "progress": 0,
            "message": f"Queued: {article['title'][:50]}..."
        }
        render_ids.append(render_id)
        
        # Add background task
        background_tasks.add_task(
            render_article_background,
            render_id,
            dict(article),
            db_pool
        )
    
    return {
        "success": True,
        "message": f"Started AI rendering for {len(articles)} articles",
        "render_ids": render_ids
    }
