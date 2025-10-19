from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import meilisearch
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

class SuggestionRequest(BaseModel):
    q: str
    limit: Optional[int] = 5

class Suggestion(BaseModel):
    text: str
    type: str  # 'title', 'category', 'tag', 'phrase'
    highlight: Optional[str] = None

@router.post("/search", response_model=List[SearchResult])
async def search(request: Request, body: SearchRequest):
    try:
        # Initialize Meilisearch client
        client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
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
        search_results = index.search(body.q, search_params)
        
        # Get database pool
        db_pool = request.app.state.db_pool()
        
        # Track search query
        async with db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO search_queries (query, results_count, searched_at)
                VALUES ($1, $2, NOW())
            """, body.q, search_results.get('estimatedTotalHits', 0) if isinstance(search_results, dict) else len(search_results.hits))
        
        # Build results with snippets
        results = []
        hits = search_results.get('hits', []) if isinstance(search_results, dict) else search_results.hits
        
        # Deduplicate by slug to avoid showing the same article multiple times
        seen_slugs = set()
        unique_hits = []
        for hit in hits:
            if hit['slug'] not in seen_slugs:
                seen_slugs.add(hit['slug'])
                unique_hits.append(hit)
                if len(unique_hits) >= body.top_k:
                    break
        
        for hit in unique_hits:
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

@router.post("/suggestions", response_model=List[Suggestion])
async def get_suggestions(request: Request, body: SuggestionRequest):
    """Get smart autocomplete suggestions based on user input"""
    try:
        if len(body.q.strip()) < 2:
            return []
        
        client = meilisearch.Client(settings.meili_host, settings.meili_master_key)
        index = client.index('articles')
        suggestions = []
        
        # 1. Search for matching article titles
        title_results = index.search(body.q, {
            'limit': body.limit,
            'attributesToRetrieve': ['title', 'type', 'category'],
            'attributesToSearchOn': ['title'],
            'attributesToHighlight': ['title'],
            'highlightPreTag': '<mark>',
            'highlightPostTag': '</mark>'
        })
        
        hits = title_results.get('hits', []) if isinstance(title_results, dict) else title_results.hits
        for hit in hits:
            formatted_title = hit.get('_formatted', {}).get('title', hit['title'])
            suggestions.append(Suggestion(
                text=hit['title'],
                type='title',
                highlight=formatted_title
            ))
        
        # 2. Add category suggestions
        categories = ['Payroll', 'HR', 'Compliance', 'Benefits', 'Onboarding', 'Tax', 'Leave', 'Expenses']
        for category in categories:
            if body.q.lower() in category.lower():
                suggestions.append(Suggestion(
                    text=f"Articles in {category}",
                    type='category'
                ))
        
        # 3. Add common search phrases
        common_phrases = [
            "How to submit an invoice",
            "How to view payslips", 
            "How to add an employee",
            "Background check process",
            "Tax documentation",
            "Leave policy",
            "Expense reimbursement"
        ]
        
        for phrase in common_phrases:
            if body.q.lower() in phrase.lower():
                suggestions.append(Suggestion(
                    text=phrase,
                    type='phrase'
                ))
        
        # Remove duplicates and limit results
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion.text not in seen:
                seen.add(suggestion.text)
                unique_suggestions.append(suggestion)
                if len(unique_suggestions) >= body.limit:
                    break
        
        return unique_suggestions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
