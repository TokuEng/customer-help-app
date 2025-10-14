from fastapi import APIRouter, Request, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
import meilisearch
from datetime import datetime
import asyncpg

# Try both import paths to work in different contexts
try:
    from services.chunking import ChunkingService
    from services.embeddings import EmbeddingsService
    from core.settings import settings
except ImportError:
    from apps.api.services.chunking import ChunkingService
    from apps.api.services.embeddings import EmbeddingsService
    from apps.api.core.settings import settings

router = APIRouter()

class VisaArticleUpload(BaseModel):
    title: str
    content_md: str
    category: str = "General"
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

async def verify_admin_auth(authorization: str = Header(...)) -> str:
    """Verify admin authentication"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    if token != settings.admin_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    return token

@router.post("/visa/upload")
async def upload_visa_article(
    request: Request,
    article: VisaArticleUpload,
    admin_key: str = Depends(verify_admin_auth)
):
    """
    Upload a visa article with embeddings.
    Using text-embedding-3-small (1536 dimensions) due to pgvector limits.
    """
    try:
        # Initialize services
        chunking_service = ChunkingService()
        # Using text-embedding-3-small due to pgvector dimension limits
        embeddings_service = EmbeddingsService(model_type="text-embedding-3-small")
        
        # Get database pool and Meilisearch client
        db_pool = request.app.state.db_pool()
        meili_client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
        
        async with db_pool.acquire() as conn:
            # Get visa collection ID
            visa_collection = await conn.fetchrow(
                "SELECT id FROM collections WHERE collection_key = 'visa'"
            )
            
            if not visa_collection:
                raise HTTPException(status_code=500, detail="Visa collection not found")
            
            collection_id = visa_collection['id']
            
            # Create article ID
            article_id = uuid.uuid4()
            
            # Insert into visa_articles table
            await conn.execute("""
                INSERT INTO visa_articles (
                    id, collection_id, title, content_md, 
                    category, tags, metadata, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            """, 
                article_id,
                collection_id,
                article.title,
                article.content_md,
                article.category,
                article.tags,
                article.metadata
            )
            
            # Generate chunks
            chunks = chunking_service.to_chunks(article.content_md)
            
            # Generate embeddings for chunks
            chunk_texts = [chunk['text'] for chunk in chunks]
            embeddings = await embeddings_service.embed(chunk_texts)
            
            # Insert chunks with embeddings
            if chunks and embeddings:
                chunk_data = []
                for chunk, embedding in zip(chunks, embeddings):
                    # Convert embedding to pgvector format
                    if hasattr(embedding, 'tolist'):
                        embedding_list = embedding.tolist()
                    else:
                        embedding_list = list(embedding)
                    
                    embedding_str = f"[{','.join(map(str, embedding_list))}]"
                    
                    chunk_data.append((
                        article_id,
                        collection_id,
                        chunk['heading_path'],
                        chunk['text'],
                        embedding_str
                    ))
                
                # Batch insert all chunks
                await conn.executemany(
                    """
                    INSERT INTO chunks_visa (
                        article_id, collection_id, heading_path, text, embedding
                    ) VALUES ($1, $2, $3, $4, $5::vector)
                    """,
                    chunk_data
                )
            
            # Index in Meilisearch (visa_articles index)
            try:
                visa_index = meili_client.index('visa_articles')
                
                # Create index if it doesn't exist
                try:
                    visa_index.get_stats()
                except:
                    meili_client.create_index('visa_articles', {'primaryKey': 'id'})
                    visa_index = meili_client.index('visa_articles')
                    
                    # Configure searchable attributes
                    visa_index.update_searchable_attributes([
                        'title', 'content_md', 'category', 'tags'
                    ])
                    
                    # Configure filterable attributes
                    visa_index.update_filterable_attributes([
                        'category', 'tags'
                    ])
                
                # Add document to Meilisearch
                document = {
                    'id': str(article_id),
                    'title': article.title,
                    'content_md': article.content_md,
                    'category': article.category,
                    'tags': article.tags,
                    'created_at': datetime.now().isoformat(),
                    'slug': str(article_id)  # Use ID as slug for visa articles
                }
                
                visa_index.add_documents([document])
                
            except Exception as e:
                print(f"Meilisearch indexing error: {e}")
                # Continue even if Meilisearch fails
            
            return {
                "success": True,
                "article_id": str(article_id),
                "title": article.title,
                "chunks_created": len(chunks),
                "message": "Visa article uploaded successfully"
            }
            
    except Exception as e:
        print(f"Visa article upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visa/articles")
async def list_visa_articles(
    request: Request,
    admin_key: str = Depends(verify_admin_auth),
    limit: int = 20,
    offset: int = 0
):
    """List all visa articles"""
    try:
        db_pool = request.app.state.db_pool()
        
        async with db_pool.acquire() as conn:
            # Get visa collection ID
            visa_collection = await conn.fetchrow(
                "SELECT id FROM collections WHERE collection_key = 'visa'"
            )
            
            if not visa_collection:
                return {"articles": [], "total": 0}
            
            # Get articles
            articles = await conn.fetch("""
                SELECT 
                    id::text as id,
                    title,
                    category,
                    tags,
                    created_at,
                    updated_at
                FROM visa_articles
                WHERE collection_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            """, visa_collection['id'], limit, offset)
            
            # Get total count
            total = await conn.fetchval("""
                SELECT COUNT(*) FROM visa_articles
                WHERE collection_id = $1
            """, visa_collection['id'])
            
            return {
                "articles": [dict(article) for article in articles],
                "total": total,
                "limit": limit,
                "offset": offset
            }
            
    except Exception as e:
        print(f"Error listing visa articles: {e}")
        raise HTTPException(status_code=500, detail=str(e))
