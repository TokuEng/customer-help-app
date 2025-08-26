from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class FeedbackRequest(BaseModel):
    article_id: str
    helpful: bool
    notes: Optional[str] = None

class FeedbackResponse(BaseModel):
    success: bool
    message: str

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: Request, feedback: FeedbackRequest):
    db_pool = request.app.state.db_pool()
    
    try:
        # Validate UUID
        article_uuid = uuid.UUID(feedback.article_id)
        
        async with db_pool.acquire() as conn:
            # Check if article exists
            article_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM articles WHERE id = $1)",
                article_uuid
            )
            
            if not article_exists:
                raise HTTPException(status_code=404, detail="Article not found")
            
            # Insert feedback
            await conn.execute(
                """
                INSERT INTO search_feedback (article_id, helpful, notes)
                VALUES ($1, $2, $3)
                """,
                article_uuid,
                feedback.helpful,
                feedback.notes
            )
            
            return FeedbackResponse(
                success=True,
                message="Thank you for your feedback!"
            )
            
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid article ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
