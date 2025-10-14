from typing import List, Dict, Any, Optional
import cohere
import asyncio
import logging

# Try both import paths to work in different contexts
try:
    from core.settings import settings
except ImportError:
    from apps.api.core.settings import settings

logger = logging.getLogger(__name__)

class CohereReranker:
    """Service for reranking search results using Cohere's Rerank API"""
    
    def __init__(self):
        """Initialize Cohere client with API key from settings"""
        self.client = None
        if hasattr(settings, 'cohere_api_key') and settings.cohere_api_key:
            try:
                self.client = cohere.AsyncClient(settings.cohere_api_key)
                self.model = "rerank-english-v3.0"  # Latest stable model
                logger.info("Cohere reranker initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Cohere client: {e}")
                self.client = None
        else:
            logger.warning("Cohere API key not found in settings")
    
    async def rerank(
        self, 
        query: str, 
        documents: List[Dict[str, Any]], 
        top_k: int = 6,
        return_documents: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents based on relevance to query
        
        Args:
            query: The search query
            documents: List of documents with 'content_md' or 'text' field
            top_k: Number of top results to return
            return_documents: Whether to return full documents or just scores
            
        Returns:
            Reranked list of documents with scores
        """
        if not self.client:
            logger.warning("Cohere client not initialized, returning original order")
            return documents[:top_k]
        
        if not documents:
            return []
        
        try:
            # Extract text content from documents
            doc_texts = []
            for doc in documents:
                # Try different field names for content
                content = (
                    doc.get('content_md') or 
                    doc.get('text') or 
                    doc.get('summary') or 
                    doc.get('content', '')
                )
                
                # Include title if available
                title = doc.get('title', '')
                if title and content:
                    doc_text = f"{title}\n\n{content}"
                else:
                    doc_text = title or content
                
                # Limit content length to avoid API limits
                doc_texts.append(doc_text[:4000])  # Cohere has char limits
            
            # Call Cohere rerank API
            response = await self.client.rerank(
                model=self.model,
                query=query,
                documents=doc_texts,
                top_n=top_k,
                return_documents=False  # We'll map back to original docs
            )
            
            # Map reranked results back to original documents
            reranked_docs = []
            for result in response.results:
                idx = result.index
                if 0 <= idx < len(documents):
                    doc = documents[idx].copy()
                    doc['rerank_score'] = result.relevance_score
                    reranked_docs.append(doc)
            
            logger.info(f"Successfully reranked {len(reranked_docs)} documents")
            return reranked_docs
            
        except Exception as e:
            logger.error(f"Cohere reranking failed: {e}")
            # Fallback to original order
            return documents[:top_k]
    
    def is_available(self) -> bool:
        """Check if Cohere reranker is available"""
        return self.client is not None

