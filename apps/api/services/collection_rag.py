from typing import List, Dict, Any, Optional
import asyncpg
import meilisearch
import numpy as np
import logging

# Try both import paths to work in different contexts
try:
    from services.embeddings import EmbeddingsService
    from core.settings import settings
except ImportError:
    from apps.api.services.embeddings import EmbeddingsService
    from apps.api.core.settings import settings

logger = logging.getLogger(__name__)

class CollectionRAGService:
    """Service for collection-aware RAG search with support for different embedding dimensions"""
    
    def __init__(self):
        self.embeddings_services = {}  # Cache embeddings services by model type
    
    async def get_collection(self, db_pool: asyncpg.pool.Pool, collection_key: str) -> Dict[str, Any]:
        """Get collection configuration by key"""
        async with db_pool.acquire() as conn:
            collection = await conn.fetchrow(
                """
                SELECT id, collection_key, name, description, embedding_model, 
                       embedding_dimensions, meili_index_name, is_active
                FROM collections
                WHERE collection_key = $1 AND is_active = true
                """,
                collection_key
            )
            
            if not collection:
                raise ValueError(f"Collection '{collection_key}' not found or inactive")
            
            return dict(collection)
    
    def get_embeddings_service(self, model_type: str) -> EmbeddingsService:
        """Get or create embeddings service for a specific model type"""
        if model_type not in self.embeddings_services:
            self.embeddings_services[model_type] = EmbeddingsService(model_type)
        return self.embeddings_services[model_type]
    
    async def search_chunks_1536(
        self, 
        db_pool: asyncpg.pool.Pool,
        query_embedding: np.ndarray, 
        collection_id: str,
        top_k: int = 6
    ) -> List[Dict[str, Any]]:
        """Search in the original chunks table (1536 dimensions)"""
        # Convert embedding to pgvector format
        if isinstance(query_embedding, np.ndarray):
            embedding_str = f"[{','.join(map(str, query_embedding.tolist()))}]"
        else:
            embedding_str = f"[{','.join(map(str, query_embedding))}]"
        
        async with db_pool.acquire() as conn:
            # Set search parameters for better performance
            await conn.execute("SET ivfflat.probes = 8;")
            
            # Search with collection filter
            rows = await conn.fetch("""
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
                WHERE a.collection_id = $2
                ORDER BY c.embedding <=> $1::vector
                LIMIT $3
            """, embedding_str, collection_id, top_k)
            
            return [dict(row) for row in rows]
    
    async def search_chunks_visa(
        self, 
        db_pool: asyncpg.pool.Pool,
        query_embedding: np.ndarray, 
        collection_id: str,
        top_k: int = 6
    ) -> List[Dict[str, Any]]:
        """Search in the chunks_visa table for visa-specific content"""
        # Convert embedding to pgvector format
        if isinstance(query_embedding, np.ndarray):
            embedding_str = f"[{','.join(map(str, query_embedding.tolist()))}]"
        else:
            embedding_str = f"[{','.join(map(str, query_embedding))}]"
        
        async with db_pool.acquire() as conn:
            # Set search parameters for better performance
            await conn.execute("SET ivfflat.probes = 8;")
            
            # Search with collection filter
            rows = await conn.fetch("""
                SELECT 
                    c.chunk_id::text as id,
                    c.article_id,
                    c.heading_path,
                    c.text as content_md,
                    va.title,
                    va.id::text as slug,  -- Using ID as slug for visa articles
                    1 - (c.embedding <=> $1::vector) AS score
                FROM chunks_visa c
                JOIN visa_articles va ON c.article_id = va.id
                WHERE c.collection_id = $2
                ORDER BY c.embedding <=> $1::vector
                LIMIT $3
            """, embedding_str, collection_id, top_k)
            
            return [dict(row) for row in rows]
    
    async def search_meilisearch(
        self, 
        query: str, 
        index_name: str,
        top_k: int = 12
    ) -> List[Dict[str, Any]]:
        """Search in collection-specific Meilisearch index"""
        try:
            if settings.meili_host and settings.meili_master_key:
                client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
                index = client.index(index_name)
                
                search_results = index.search(query, {
                    'limit': top_k,
                    'attributesToRetrieve': ['id', 'title', 'slug', 'summary', 'content_md', 'category']
                })
                
                hits = search_results.get('hits', []) if isinstance(search_results, dict) else search_results.hits
                return hits
            
        except Exception as e:
            logger.error(f"Meilisearch search failed for index {index_name}: {e}")
        
        return []
    
    def reciprocal_rank_fusion(
        self,
        vector_hits: List[Dict[str, Any]], 
        bm25_hits: List[Dict[str, Any]], 
        k_constant: int = 60
    ) -> List[Dict[str, Any]]:
        """Combine vector and BM25 results using Reciprocal Rank Fusion"""
        # Create rank mappings
        vector_ranks = {hit['id']: i + 1 for i, hit in enumerate(vector_hits)}
        bm25_ranks = {hit['id']: i + 1 for i, hit in enumerate(bm25_hits)}
        
        # Create lookup for hit objects
        all_hits = {}
        for hit in vector_hits:
            all_hits[hit['id']] = hit
        for hit in bm25_hits:
            if hit['id'] not in all_hits:
                all_hits[hit['id']] = hit
        
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
        
        # Sort by RRF score and return
        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        
        fused_results = []
        for hit_id in sorted_ids:
            hit = all_hits[hit_id].copy()
            hit['rrf_score'] = rrf_scores[hit_id]
            fused_results.append(hit)
        
        return fused_results
    
    async def search(
        self, 
        db_pool: asyncpg.pool.Pool,
        query: str, 
        collection_key: str = "help_center",
        top_k: int = 6,
        reranker = None  # Optional reranker service
    ) -> List[Dict[str, Any]]:
        """
        Perform collection-aware hybrid search
        
        Args:
            db_pool: Database connection pool
            query: Search query
            collection_key: Collection to search in
            top_k: Number of results to return
            reranker: Optional reranker service (e.g., CohereReranker)
        
        Returns:
            List of search results
        """
        try:
            # Get collection configuration
            collection = await self.get_collection(db_pool, collection_key)
            collection_id = collection['id']
            
            # Get appropriate embeddings service
            embeddings_service = self.get_embeddings_service(collection['embedding_model'])
            
            # Generate query embedding
            query_embeddings = await embeddings_service.embed([query])
            query_embedding = query_embeddings[0] if query_embeddings else None
            
            vector_hits = []
            if query_embedding is not None:
                # Search in appropriate chunks table based on collection
                if collection['collection_key'] == 'visa':
                    vector_hits = await self.search_chunks_visa(
                        db_pool, query_embedding, collection_id, top_k
                    )
                else:
                    vector_hits = await self.search_chunks_1536(
                        db_pool, query_embedding, collection_id, top_k
                    )
            
            # BM25 search in collection-specific Meilisearch index
            bm25_hits = await self.search_meilisearch(
                query, collection['meili_index_name'], top_k * 2
            )
            
            # Fuse results with RRF
            fused_results = self.reciprocal_rank_fusion(vector_hits, bm25_hits)
            
            # Apply reranking if available
            if reranker and fused_results:
                # Take more candidates for reranking
                candidates = fused_results[:top_k * 2]
                reranked_results = await reranker.rerank(query, candidates, top_k)
                return reranked_results
            
            # Return top K results
            return fused_results[:top_k]
            
        except Exception as e:
            logger.error(f"Collection RAG search error: {e}")
            raise
