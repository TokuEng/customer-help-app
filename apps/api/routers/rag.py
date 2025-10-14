from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.collection_rag import CollectionRAGService
from services.reranker import CohereReranker
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    collection_key: str = "help_center"
    top_k: int = 6

class RAGHit(BaseModel):
    id: str
    title: Optional[str] = None
    url: Optional[str] = None
    heading_path: Optional[str] = None
    content_md: str
    score: float
    source: str  # "vector" or "bm25"

class RAGResponse(BaseModel):
    hits: List[RAGHit]

@router.post("/rag/search", response_model=RAGResponse)
async def rag_search(request: Request, payload: SearchRequest):
    """
    Collection-aware hybrid RAG search with optional Cohere reranking.
    Supports multiple collections with different embedding dimensions.
    """
    try:
        query = payload.query.strip()
        if not query:
            return RAGResponse(hits=[])
            
        k = max(1, min(payload.top_k, 10))  # Clamp between 1-10
        
        # Initialize services
        rag_service = CollectionRAGService()
        reranker = CohereReranker()
        db_pool = request.app.state.db_pool()
        
        # Perform collection-aware search
        search_results = await rag_service.search(
            db_pool=db_pool,
            query=query,
            collection_key=payload.collection_key,
            top_k=k,
            reranker=reranker if reranker.is_available() else None
        )
        
        # Convert to RAGHit format
        hits = []
        for result in search_results:
            # Map fields appropriately
            hit = RAGHit(
                id=result.get('id', ''),
                title=result.get('title'),
                url=result.get('url') or (f"/a/{result.get('slug')}" if result.get('slug') else None),
                heading_path=result.get('heading_path'),
                content_md=result.get('content_md', '') or result.get('text', ''),
                score=result.get('rerank_score', result.get('rrf_score', result.get('score', 0.0))),
                source=result.get('source', 'hybrid')
            )
            hits.append(hit)
        
        return RAGResponse(hits=hits)
        
    except ValueError as e:
        # Collection not found
        logger.error(f"Collection error: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        raise HTTPException(status_code=500, detail="RAG search failed")


