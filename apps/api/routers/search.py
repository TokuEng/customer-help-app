from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import meilisearch_python_async as meilisearch
from services.snippets import build_snippet
from core.settings import settings
import asyncio

router = APIRouter()

class SearchRequest(BaseModel):
    q: str
    top_k: Optional[int] = 10
    filters: Optional[dict] = None

class SearchResult(BaseModel):
    title: str
    slug: str
    summary: Optional[str]
    type: str
    category: str
    reading_time_min: int
    updated_at: str
    snippet: str

@router.post("/search", response_model=List[SearchResult])
async def search(request: Request, body: SearchRequest):
    try:
        # Initialize Meilisearch client
        async with meilisearch.Client(settings.meili_host, settings.meili_master_key) as client:
            index = client.index('articles')
            
            # Build search parameters
            search_params = {
                'limit': min(body.top_k * 3, 100),  # Get more candidates for snippet building
                'attributesToHighlight': ['title', 'summary', 'content_md'],
                'highlightPreTag': '<mark>',
                'highlightPostTag': '</mark>',
                'attributesToRetrieve': ['id', 'slug', 'title', 'summary', 'type', 'category', 
                                       'reading_time_min', 'updated_at']
            }
            
            # Apply filters if provided
            if body.filters:
                filter_expressions = []
                if 'category' in body.filters:
                    filter_expressions.append(f'category = "{body.filters["category"]}"')
                if 'type' in body.filters:
                    filter_expressions.append(f'type = "{body.filters["type"]}"')
                if filter_expressions:
                    search_params['filter'] = ' AND '.join(filter_expressions)
            
            # Execute search
            search_results = await index.search(body.q, search_params)
            
            # Get database pool
            db_pool = request.app.state.db_pool()
            
            # Build results with snippets
            results = []
            for hit in search_results.hits[:body.top_k]:
                # Get chunks for this article to build snippet
                async with db_pool.acquire() as conn:
                    chunks = await conn.fetch(
                        """
                        SELECT heading_path, text 
                        FROM chunks 
                        WHERE article_id = $1
                        ORDER BY chunk_id
                        """,
                        hit['id']
                    )
                
                # Build snippet from chunks
                snippet = await build_snippet(body.q, [{'heading_path': c['heading_path'], 'text': c['text']} for c in chunks])
                
                results.append(SearchResult(
                    title=hit['title'],
                    slug=hit['slug'],
                    summary=hit.get('summary'),
                    type=hit['type'],
                    category=hit['category'],
                    reading_time_min=hit['reading_time_min'],
                    updated_at=hit['updated_at'],
                    snippet=snippet
                ))
            
            return results
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
