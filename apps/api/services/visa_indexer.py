"""
Visa document ingestion and indexing service.
Processes text/PDF/DOCX files and indexes into visa_articles + visa_chunks.
"""

import uuid
import re
from typing import Optional, List, Dict
import asyncpg
from fastapi import Depends, Request
# Import existing services
from services.chunking import ChunkingService
from services.embeddings import EmbeddingsService

# Try both import paths to work in different contexts
try:
    from core.settings import settings
except ImportError:
    from apps.api.core.settings import settings

class VisaIndexerService:
    """
    Handles ingestion of visa documents into the vector database.
    Parallel to existing article indexing, but for visa content.
    """
    
    def __init__(
        self,
        db_pool: asyncpg.Pool,
        embeddings_service: EmbeddingsService,
        chunking_service: ChunkingService
    ):
        self.db = db_pool
        self.embeddings = embeddings_service
        self.chunker = chunking_service
    
    async def index_document(
        self,
        title: str,
        content_md: str,
        country_code: Optional[str] = None,
        visa_type: Optional[str] = None,
        category: Optional[str] = None
    ) -> uuid.UUID:
        """
        Complete indexing pipeline for a visa document.
        
        Steps:
        1. Create article record
        2. Generate semantic chunks
        3. Create embeddings
        4. Store chunks with embeddings
        """
        
        # 1. Create article
        article_id = await self._create_article(
            title=title,
            content_md=content_md,
            country_code=country_code,
            visa_type=visa_type,
            category=category
        )
        
        # 2. Generate chunks
        chunks = self.chunker.to_chunks(content_md)
        
        if not chunks:
            raise ValueError("No chunks generated from content")
        
        # 3. Generate embeddings
        chunk_texts = [c['text'] for c in chunks]
        embeddings = await self.embeddings.embed(chunk_texts)
        
        # 4. Store chunks
        await self._store_chunks(article_id, chunks, embeddings)
        
        return article_id
    
    async def _create_article(
        self,
        title: str,
        content_md: str,
        country_code: Optional[str],
        visa_type: Optional[str],
        category: Optional[str]
    ) -> uuid.UUID:
        """Create visa article record"""
        
        slug = self._slugify(title)
        
        query = """
            INSERT INTO visa_articles (
                title, content_md, slug, country_code, visa_type, category
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (slug) 
            DO UPDATE SET
                title = EXCLUDED.title,
                content_md = EXCLUDED.content_md,
                country_code = EXCLUDED.country_code,
                visa_type = EXCLUDED.visa_type,
                category = EXCLUDED.category,
                updated_at = NOW()
            RETURNING id
        """
        
        async with self.db.acquire() as conn:
            article_id = await conn.fetchval(
                query,
                title,
                content_md,
                slug,
                country_code,
                visa_type,
                category
            )
        
        return article_id
    
    async def _store_chunks(
        self,
        article_id: uuid.UUID,
        chunks: List[Dict],
        embeddings: List[List[float]]
    ):
        """Store chunks with embeddings in visa_chunks table"""
        
        # First, delete existing chunks for this article
        async with self.db.acquire() as conn:
            await conn.execute(
                "DELETE FROM visa_chunks WHERE article_id = $1",
                article_id
            )
        
        # Then insert new chunks
        query = """
            INSERT INTO visa_chunks (
                article_id, chunk_index, content, heading_path, token_count, embedding
            )
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        # Prepare data for bulk insert
        records = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            # Convert embedding to string format for pgvector
            if hasattr(embedding, 'tolist'):
                embedding_list = embedding.tolist()
            else:
                embedding_list = embedding
            
            # Format as string for pgvector
            embedding_str = '[' + ','.join(map(str, embedding_list)) + ']'
            
            records.append((
                article_id,
                i,
                chunk['text'],
                chunk.get('heading_path'),
                len(self.chunker.encoding.encode(chunk['text'])),
                embedding_str
            ))
        
        async with self.db.acquire() as conn:
            await conn.executemany(query, records)
    
    @staticmethod
    def _slugify(text: str) -> str:
        """Convert title to URL-safe slug"""
        text = text.lower()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[-\s]+', '-', text)
        return text.strip('-')
    
    async def update_document(
        self,
        article_id: uuid.UUID,
        content_md: str
    ):
        """Update existing document (re-chunk and re-embed)"""
        
        # Delete old chunks
        async with self.db.acquire() as conn:
            await conn.execute(
                "DELETE FROM visa_chunks WHERE article_id = $1",
                article_id
            )
        
        # Re-process
        chunks = self.chunker.to_chunks(content_md)
        chunk_texts = [c['text'] for c in chunks]
        embeddings = await self.embeddings.embed(chunk_texts)
        
        await self._store_chunks(article_id, chunks, embeddings)
        
        # Update article
        async with self.db.acquire() as conn:
            await conn.execute(
                """
                UPDATE visa_articles
                SET content_md = $1, updated_at = NOW()
                WHERE id = $2
                """,
                content_md,
                article_id
            )
    
    async def list_articles(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """List visa articles with metadata"""
        
        query = """
            SELECT 
                id, title, slug, country_code, visa_type, category, 
                created_at, updated_at,
                char_length(content_md) as content_length
            FROM visa_articles
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        """
        
        async with self.db.acquire() as conn:
            rows = await conn.fetch(query, limit, offset)
        
        return [dict(row) for row in rows]


# Dependency injection
async def get_visa_indexer(
    request: Request
) -> VisaIndexerService:
    """FastAPI dependency to inject visa indexer service"""
    db_pool = request.app.state.db_pool()
    embeddings = EmbeddingsService()
    chunker = ChunkingService()
    return VisaIndexerService(db_pool, embeddings, chunker)
