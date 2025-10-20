"""
Admin API for visa document ingestion.
Supports text input, file upload (PDF, DOCX, MD).
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from services.auth import get_current_user
import io
import pypdf
import docx
from services.visa_indexer import VisaIndexerService, get_visa_indexer
from core.settings import settings

router = APIRouter(prefix="/admin/visa", tags=["admin"])

class VisaDocumentInput(BaseModel):
    """Text-based visa document input"""
    title: str = Field(..., min_length=3, max_length=500)
    content: str = Field(..., min_length=10)
    country_code: Optional[str] = Field(None, max_length=2)
    visa_type: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=50)

@router.post("/ingest")
async def ingest_text_document(
    doc: VisaDocumentInput,
    current_user: Dict[str, Any] = Depends(get_current_user),
    indexer: VisaIndexerService = Depends(get_visa_indexer)
):
    """
    Ingest a visa document from text input.
    Accessible only to authenticated admin users.
    """
    try:
        article_id = await indexer.index_document(
            title=doc.title,
            content=doc.content,
            country_code=doc.country_code,
            visa_type=doc.visa_type,
            category=doc.category
        )
        
        return {
            "success": True,
            "article_id": str(article_id),
            "message": f"Successfully indexed: {doc.title}"
        }
    
    except Exception as e:
        # Error logging removed(f"Error ingesting text document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest-file")
async def ingest_file_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    country_code: Optional[str] = Form(None),
    visa_type: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    indexer: VisaIndexerService = Depends(get_visa_indexer)
):
    """
    Ingest a visa document from file upload (PDF, DOCX, MD, TXT).
    Accessible only to authenticated admin users.
    """
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    
    # Extract content based on file type
    try:
        if file.filename.endswith('.pdf'):
            content = await _extract_pdf_text(file)
        elif file.filename.endswith('.docx'):
            content = await _extract_docx_text(file)
        elif file.filename.endswith(('.md', '.txt')):
            file_bytes = await file.read()
            content = file_bytes.decode('utf-8')
        else:
            raise HTTPException(400, "Unsupported file type. Use PDF, DOCX, MD, or TXT")
        
        # Generate title from filename if not provided
        if not title:
            title = file.filename.rsplit('.', 1)[0].replace('-', ' ').replace('_', ' ').title()
        
        # Index document
        article_id = await indexer.index_document(
            title=title,
            content_md=content,
            country_code=country_code,
            visa_type=visa_type,
            category=category
        )
        
        return {
            "success": True,
            "article_id": str(article_id),
            "filename": file.filename,
            "message": f"Successfully indexed from file: {file.filename}"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        # Error logging removed(f"Error ingesting file document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/articles")
async def list_visa_articles(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    indexer: VisaIndexerService = Depends(get_visa_indexer),
    limit: int = 50,
    offset: int = 0
):
    """List all visa articles with pagination"""
    try:
        db_pool = request.app.state.db_pool()
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    a.id::text as id,
                    a.title,
                    a.slug,
                    a.country_code,
                    a.visa_type,
                    a.category,
                    COUNT(c.article_id) as chunks_count,
                    a.created_at,
                    a.updated_at
                FROM visa_articles a
                LEFT JOIN visa_chunks c ON a.id = c.article_id
                GROUP BY a.id, a.title, a.slug, a.country_code, a.visa_type, a.category, a.created_at, a.updated_at
                ORDER BY a.updated_at DESC
                LIMIT $1 OFFSET $2
            """, limit, offset)
        
        return [dict(row) for row in rows]
    except Exception as e:
        # Error logging removed(f"Error listing visa articles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def _extract_pdf_text(file: UploadFile) -> str:
    """Extract text from PDF file"""
    pdf_bytes = await file.read()
    pdf_reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    
    text_parts = []
    for page in pdf_reader.pages:
        text = page.extract_text()
        if text.strip():
            text_parts.append(text)
    
    return "\n\n".join(text_parts)

async def _extract_docx_text(file: UploadFile) -> str:
    """Extract text from DOCX file"""
    docx_bytes = await file.read()
    doc = docx.Document(io.BytesIO(docx_bytes))
    
    text_parts = []
    for para in doc.paragraphs:
        if para.text.strip():
            text_parts.append(para.text)
    
    return "\n\n".join(text_parts)
