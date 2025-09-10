"""
AI rendering API endpoints for intelligent article formatting
Temporarily disabled - using original content rendering
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid

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

# AI rendering temporarily disabled - using original content
# All endpoints commented out to prevent usage

# @router.post("/render", response_model=RenderResponse)
# @router.get("/render/{render_id}/status", response_model=RenderStatus)  
# @router.post("/render/batch")