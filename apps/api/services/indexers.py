import asyncpg
import meilisearch_python_async as meilisearch
from typing import List, Dict, Tuple
import uuid
import re
from datetime import datetime
from services.chunking import ChunkingService
from services.embeddings import EmbeddingsService
import numpy as np

class IndexerService:
    def __init__(self):
        self.chunking_service = ChunkingService()
        self.embeddings_service = EmbeddingsService()
    
    async def upsert_article(
        self, 
        pg_conn: asyncpg.Connection,
        meili_client: meilisearch.Client,
        article_data: Dict,
        category: str
    ) -> str:
        """Upsert article and its chunks to PostgreSQL and Meilisearch"""
        
        # Generate slug from title
        slug = self._generate_slug(article_data['title'])
        
        # Infer metadata
        article_type = self._infer_type(article_data['title'])
        persona = self._infer_persona(article_data['title'])
        tags = self._extract_tags(article_data['title'])
        
        # Calculate reading time
        word_count = len(article_data['content_md'].split())
        reading_time_min = max(1, round(word_count / 200))
        
        # Generate summary if not provided
        summary = self._generate_summary(article_data['content_md'])
        
        # Chunk the content
        chunks = self.chunking_service.to_chunks(article_data['content_md'])
        
        # Generate embeddings for chunks
        chunk_texts = [chunk['text'] for chunk in chunks]
        embeddings = await self.embeddings_service.embed(chunk_texts)
        
        # Upsert article to PostgreSQL
        article_id = await pg_conn.fetchval(
            """
            INSERT INTO articles (
                slug, title, summary, content_md, content_html, 
                reading_time_min, type, category, tags, persona, 
                updated_at, notion_page_id, visibility
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (notion_page_id) 
            DO UPDATE SET
                slug = EXCLUDED.slug,
                title = EXCLUDED.title,
                summary = EXCLUDED.summary,
                content_md = EXCLUDED.content_md,
                content_html = EXCLUDED.content_html,
                reading_time_min = EXCLUDED.reading_time_min,
                type = EXCLUDED.type,
                category = EXCLUDED.category,
                tags = EXCLUDED.tags,
                persona = EXCLUDED.persona,
                updated_at = EXCLUDED.updated_at,
                visibility = EXCLUDED.visibility
            RETURNING id
            """,
            slug, article_data['title'], summary, article_data['content_md'],
            article_data['content_html'], reading_time_min, article_type,
            category, tags, persona, article_data['last_edited_time'],
            article_data['page_id'], 'public'
        )
        
        # Delete existing chunks
        await pg_conn.execute(
            "DELETE FROM chunks WHERE article_id = $1",
            article_id
        )
        
        # Insert new chunks with embeddings
        for chunk, embedding in zip(chunks, embeddings):
            await pg_conn.execute(
                """
                INSERT INTO chunks (article_id, heading_path, text, embedding)
                VALUES ($1, $2, $3, $4)
                """,
                article_id, chunk['heading_path'], chunk['text'], 
                embedding.tolist()  # Convert numpy array to list for storage
            )
        
        # Index in Meilisearch
        await self._index_to_meilisearch(
            meili_client, article_id, slug, article_data['title'],
            summary, article_data['content_md'], chunks,
            article_type, category, tags, persona,
            reading_time_min, article_data['last_edited_time']
        )
        
        return slug
    
    async def _index_to_meilisearch(
        self, client: meilisearch.Client, article_id: uuid.UUID,
        slug: str, title: str, summary: str, content: str,
        chunks: List[Dict], article_type: str, category: str,
        tags: List[str], persona: str, reading_time_min: int,
        updated_at: datetime
    ):
        """Index article to Meilisearch"""
        index = client.index('articles')
        
        # Prepare document
        doc = {
            'id': str(article_id),
            'slug': slug,
            'title': title,
            'summary': summary,
            'content_md': content[:10000],  # Limit content size for search
            'type': article_type,
            'category': category,
            'tags': tags,
            'persona': persona,
            'reading_time_min': reading_time_min,
            'updated_at': updated_at.isoformat(),
            'headings': [chunk['heading_path'] for chunk in chunks if chunk['heading_path']]
        }
        
        # Add or update document
        await index.add_documents([doc])
        
        # Update index settings if needed
        await index.update_settings({
            'searchableAttributes': [
                'title',
                'summary',
                'content_md',
                'headings',
                'tags'
            ],
            'filterableAttributes': [
                'type',
                'category',
                'persona',
                'reading_time_min'
            ],
            'sortableAttributes': [
                'updated_at',
                'reading_time_min'
            ],
            'displayedAttributes': [
                'id', 'slug', 'title', 'summary', 'type', 'category',
                'tags', 'persona', 'reading_time_min', 'updated_at'
            ]
        })
    
    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title"""
        # Convert to lowercase
        slug = title.lower()
        
        # Replace special characters with hyphens
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        
        # Limit length
        if len(slug) > 50:
            slug = slug[:50].rsplit('-', 1)[0]
        
        return slug
    
    def _infer_type(self, title: str) -> str:
        """Infer article type from title"""
        title_lower = title.lower()
        
        if re.search(r'how\s+to', title_lower):
            return 'how-to'
        elif any(word in title_lower for word in ['guide', 'overview', 'advantages', 'calendar']):
            return 'guide'
        elif 'policy' in title_lower:
            return 'policy'
        elif any(word in title_lower for word in ['process', 'background']):
            return 'process'
        elif 'faq' in title_lower or 'frequently asked' in title_lower:
            return 'faq'
        else:
            return 'info'
    
    def _infer_persona(self, title: str) -> str:
        """Infer target persona from title"""
        title_lower = title.lower()
        
        if any(term in title_lower for term in ['org admin', 'organization administrators', 'admin']):
            return 'Employer/Admin'
        elif 'employee' in title_lower:
            return 'Employee'
        elif any(term in title_lower for term in ['contractor', 'client-managed contractors']):
            return 'Contractor'
        elif 'partner' in title_lower:
            return 'Partner'
        else:
            return 'General'
    
    def _extract_tags(self, title: str) -> List[str]:
        """Extract relevant tags from title"""
        tags = []
        title_lower = title.lower()
        
        # Define tag mappings
        tag_keywords = {
            'Payslips': ['payslip', 'pay slip'],
            'Invoices': ['invoice', 'invoicing'],
            'Expenses': ['expense', 'reimbursement'],
            'FX': ['fx', 'foreign exchange', 'currency'],
            'Background Checks': ['background check', 'screening'],
            'Token Payroll': ['token payroll', 'token'],
            'Benefits': ['benefit', 'insurance', 'health'],
            'Compliance': ['compliance', 'regulation'],
            'Onboarding': ['onboarding', 'setup'],
            'Tax': ['tax', 'taxation'],
            'Leave': ['leave', 'time off', 'vacation'],
            'Integration': ['integration', 'api']
        }
        
        for tag, keywords in tag_keywords.items():
            if any(keyword in title_lower for keyword in keywords):
                tags.append(tag)
        
        return tags
    
    def _generate_summary(self, content: str, max_length: int = 200) -> str:
        """Generate a summary from content"""
        # Simple approach: take first paragraph or first N characters
        paragraphs = content.strip().split('\n\n')
        
        for para in paragraphs:
            # Skip headers and very short paragraphs
            if para.startswith('#') or len(para) < 50:
                continue
            
            # Use first substantial paragraph
            summary = para.strip()
            if len(summary) > max_length:
                summary = summary[:max_length].rsplit(' ', 1)[0] + '...'
            
            return summary
        
        # Fallback: use beginning of content
        summary = content[:max_length].strip()
        if len(content) > max_length:
            summary = summary.rsplit(' ', 1)[0] + '...'
        
        return summary
