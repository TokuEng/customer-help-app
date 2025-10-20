from typing import Dict, Any
from services.auth import get_current_user
from fastapi import APIRouter, Request, HTTPException, Header, Depends
from pydantic import BaseModel
import httpx
from core.settings import settings

router = APIRouter()

class RevalidateRequest(BaseModel):
    slug: str

class RevalidateResponse(BaseModel):
    success: bool
    message: str

@router.post("/revalidate", response_model=RevalidateResponse)
async def revalidate(
    request: Request, 
    body: RevalidateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Revalidate a specific article page"""
    try:
        # Call Next.js ISR endpoint
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.web_base_url}/api/revalidate",
                json={"slug": body.slug},
                headers={"x-revalidate-token": settings.revalidate_token},
                timeout=30.0
            )
            
            if response.status_code == 200:
                return RevalidateResponse(
                    success=True,
                    message=f"Successfully revalidated article: {body.slug}"
                )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Revalidation failed: {response.text}"
                )
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
