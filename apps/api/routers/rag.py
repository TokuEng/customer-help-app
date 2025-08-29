from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import meilisearch
import numpy as np
from services.embeddings import EmbeddingsService
from core.settings import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
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
    Hybrid RAG search combining pgvector similarity and Meilisearch BM25.
    Returns the most relevant chunks and articles for question answering.
    """
    try:
        query = payload.query.strip()
        if not query:
            return RAGResponse(hits=[])
            
        k = max(1, min(payload.top_k, 10))  # Clamp between 1-10
        
        # Initialize services
        embeddings_service = EmbeddingsService()
        db_pool = request.app.state.db_pool()
        
        # 1. Vector search on chunks
        try:
            # Generate query embedding
            query_embeddings = await embeddings_service.embed([query])
            query_embedding = query_embeddings[0] if query_embeddings else None
            
            vector_hits = []
            if query_embedding is not None:
                # Convert embedding to pgvector format: '[0.1, 0.2, ...]'
                if isinstance(query_embedding, np.ndarray):
                    embedding_str = f"[{','.join(map(str, query_embedding.tolist()))}]"
                else:
                    embedding_str = f"[{','.join(map(str, query_embedding))}]"
                
                async with db_pool.acquire() as conn:
                    # Set search parameters for better performance
                    await conn.execute("SET ivfflat.probes = 8;")
                    
                    # Vector similarity search with article metadata
                    vector_rows = await conn.fetch("""
                        SELECT 
                            c.chunk_id::text as id,
                            c.article_id,
                            c.heading_path,
                            c.text as content_md,
                            a.title,
                            a.slug,
                            1 - (c.embedding <=> $1::vector) AS score
                        FROM chunks c
                        JOIN articles a ON c.article_id = a.id
                        WHERE 1=1  -- Remove visibility filter since it's not available
                        ORDER BY c.embedding <=> $1::vector
                        LIMIT $2
                    """, embedding_str, k)
                    
                    for row in vector_rows:
                        vector_hits.append(RAGHit(
                            id=row['id'],
                            title=row['title'],
                            url=f"/a/{row['slug']}" if row['slug'] else None,
                            heading_path=row['heading_path'],
                            content_md=row['content_md'] or '',
                            score=float(row['score']),
                            source="vector"
                        ))
                        
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            vector_hits = []
        
        # 2. BM25 search on articles via Meilisearch
        bm25_hits = []
        try:
            if settings.meili_host and settings.meili_master_key:
                client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
                index = client.index('articles')
                
                search_results = index.search(query, {
                    'limit': k * 2,  # Get more candidates for better fusion
                    'attributesToRetrieve': ['id', 'title', 'slug', 'summary', 'content_md', 'category']
                    # Remove visibility filter - not available in current Meilisearch setup
                })
                
                hits = search_results.get('hits', []) if isinstance(search_results, dict) else search_results.hits
                
                for i, hit in enumerate(hits[:k]):
                    # Use summary as primary content, fall back to content_md
                    content = hit.get('summary') or hit.get('content_md', '')
                    
                    bm25_hits.append(RAGHit(
                        id=hit['id'],
                        title=hit.get('title'),
                        url=f"/a/{hit['slug']}" if hit.get('slug') else None,
                        heading_path=None,
                        content_md=content,
                        score=0.6,  # Fixed score for BM25 results
                        source="bm25"
                    ))
                    
        except Exception as e:
            logger.error(f"BM25 search failed: {e}")
            bm25_hits = []
        
        # 3. Fusion using Reciprocal Rank Fusion (RRF)
        fused_hits = _reciprocal_rank_fusion(vector_hits, bm25_hits, k)
        
        return RAGResponse(hits=fused_hits)
        
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        raise HTTPException(status_code=500, detail="RAG search failed")


def _reciprocal_rank_fusion(
    vector_hits: List[RAGHit], 
    bm25_hits: List[RAGHit], 
    k: int,
    k_constant: int = 60
) -> List[RAGHit]:
    """
    Combine vector and BM25 results using Reciprocal Rank Fusion.
    
    Args:
        vector_hits: Results from vector similarity search
        bm25_hits: Results from BM25 search
        k: Number of final results to return
        k_constant: RRF constant (typically 60)
        
    Returns:
        List of fused results ranked by RRF score
    """
    # Create rank mappings
    vector_ranks = {hit.id: i + 1 for i, hit in enumerate(vector_hits)}
    bm25_ranks = {hit.id: i + 1 for i, hit in enumerate(bm25_hits)}
    
    # Create lookup for hit objects
    all_hits = {}
    for hit in vector_hits + bm25_hits:
        if hit.id not in all_hits:
            all_hits[hit.id] = hit
    
    # Calculate RRF scores
    rrf_scores = {}
    for hit_id in all_hits.keys():
        score = 0.0
        
        # Add vector component
        if hit_id in vector_ranks:
            score += 1.0 / (k_constant + vector_ranks[hit_id])
            
        # Add BM25 component  
        if hit_id in bm25_ranks:
            score += 1.0 / (k_constant + bm25_ranks[hit_id])
            
        rrf_scores[hit_id] = score
    
    # Sort by RRF score and return top k
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
    
    fused_results = []
    for hit_id in sorted_ids[:k]:
        hit = all_hits[hit_id]
        # Update score to RRF score for transparency
        hit.score = rrf_scores[hit_id]
        fused_results.append(hit)
    
    return fused_results
