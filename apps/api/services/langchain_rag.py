"""
LangChain-based RAG service for multi-collection chat support.
Supports both 'general' (help center) and 'visa' (immigration) collections.
Pydantic v2 compatible with proper model rebuilding.
"""

from typing import Literal, List, AsyncGenerator
import asyncpg
import logging
import os

# Import settings
try:
    from core.settings import settings
except ImportError:
    try:
        from apps.api.core.settings import settings
    except ImportError:
        from config import settings

logger = logging.getLogger(__name__)

# Set OpenAI API key early
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = settings.openai_api_key

# Fix Pydantic v2 compatibility by rebuilding models BEFORE import
from langchain_core.caches import InMemoryCache
from langchain_core.globals import set_llm_cache

# Set a cache to ensure BaseCache is defined
set_llm_cache(InMemoryCache())

# Now import LangChain components AFTER cache is set
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

# Rebuild models for Pydantic v2 compatibility
try:
    ChatOpenAI.model_rebuild()
    OpenAIEmbeddings.model_rebuild()
except Exception as e:
    logger.warning(f"Model rebuild warning (can be ignored): {e}")

CollectionType = Literal["general", "visa"]


class CustomVectorRetriever:
    """
    Custom async vector retriever that works directly with asyncpg.
    Avoids LangChain's PGVector integration issues with Pydantic v2.
    """
    
    def __init__(
        self, 
        db_pool: asyncpg.Pool, 
        embeddings: OpenAIEmbeddings, 
        collection_type: CollectionType, 
        k: int = 5
    ):
        self.db_pool = db_pool
        self.embeddings = embeddings
        self.collection_type = collection_type
        self.k = k
    
    async def aget_relevant_documents(self, query: str) -> List[Document]:
        """Async retrieval of relevant documents using vector search"""
        
        try:
            # Generate query embedding
            query_embedding = await self.embeddings.aembed_query(query)
            
            # Determine table names based on collection type
            if self.collection_type == "visa":
                chunks_table = "visa_chunks"
                articles_table = "visa_articles"
            else:
                chunks_table = "chunks"
                articles_table = "articles"
            
            # Perform vector similarity search
            # Note: general chunks table uses 'text' column, visa_chunks uses 'content'
            content_col = "content" if self.collection_type == "visa" else "text"
            query_sql = f"""
                SELECT 
                    c.{content_col} as content,
                    c.heading_path,
                    a.title,
                    a.slug,
                    1 - (c.embedding <=> $1::vector) as similarity
                FROM {chunks_table} c
                JOIN {articles_table} a ON c.article_id = a.id
                WHERE c.embedding IS NOT NULL
                ORDER BY c.embedding <=> $1::vector
                LIMIT $2
            """
            
            # Format embedding as pgvector array string
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
            
            docs = []
            async with self.db_pool.acquire() as conn:
                # Log the query for debugging
                logger.debug(f"Executing vector search with embedding length: {len(query_embedding)}")
                
                rows = await conn.fetch(query_sql, embedding_str, self.k)
                
                logger.info(f"Vector search query returned {len(rows)} rows")
                
                for row in rows:
                    doc = Document(
                        page_content=row['content'],
                        metadata={
                            'title': row['title'],
                            'slug': row['slug'],
                            'heading_path': row.get('heading_path', ''),
                            'similarity': float(row['similarity']) if row['similarity'] is not None else 0.0,
                            'source': self.collection_type
                        }
                    )
                    docs.append(doc)
            
            logger.info(f"Vector search returned {len(docs)} documents for {self.collection_type}")
            return docs
            
        except Exception as e:
            logger.error(f"Error in vector retrieval: {type(e).__name__}: {str(e)}")
            logger.error(f"Query: {query}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def get_relevant_documents(self, query: str) -> List[Document]:
        """Synchronous wrapper for compatibility"""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Create new loop if current one is running
                import nest_asyncio
                nest_asyncio.apply()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.aget_relevant_documents(query))


class MultiCollectionRAG:
    """
    Hybrid search RAG with LangChain for multiple knowledge bases.
    Uses pgvector for semantic search and BM25 for lexical search.
    """
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        
        # Initialize OpenAI embeddings with explicit API key
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            dimensions=1536,
            openai_api_key=settings.openai_api_key
        )
        
        # Initialize LLM for chat with explicit API key
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            streaming=True,
            temperature=0.7,
            openai_api_key=settings.openai_api_key
        )
        
        logger.info("✅ MultiCollectionRAG initialized successfully")
    
    async def get_vector_retriever(
        self, 
        collection_type: CollectionType, 
        k: int = 5
    ) -> CustomVectorRetriever:
        """Get vector similarity retriever for specified collection"""
        return CustomVectorRetriever(
            self.db_pool, 
            self.embeddings, 
            collection_type, 
            k
        )
    
    async def get_bm25_retriever(
        self,
        collection_type: CollectionType,
        k: int = 5
    ) -> BM25Retriever:
        """Get BM25 retriever from database CHUNKS (not articles)"""
        
        try:
            # Fetch CHUNKS for BM25 indexing - this is the key change!
            if collection_type == "visa":
                query_sql = """
                    SELECT 
                        c.content,
                        c.chunk_index,
                        a.title,
                        a.slug,
                        a.country_code,
                        a.visa_type,
                        a.category
                    FROM visa_chunks c
                    JOIN visa_articles a ON c.article_id = a.id
                    ORDER BY a.updated_at DESC, c.chunk_index
                """
            else:
                query_sql = """
                    SELECT 
                        c.text as content,
                        c.heading_path,
                        a.title,
                        a.slug
                    FROM chunks c
                    JOIN articles a ON c.article_id = a.id
                    WHERE a.content_md IS NOT NULL
                    ORDER BY a.updated_at DESC
                    LIMIT 200
                """
            
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(query_sql)
            
            # Convert to LangChain documents
            documents = []
            for row in rows:
                content = row.get('content', '') or ''
                if not content.strip():
                    continue
                
                metadata = {
                    'title': row.get('title', ''),
                    'slug': row.get('slug', ''),
                    'source': collection_type
                }
                
                if collection_type == "visa":
                    metadata.update({
                        'country': row.get('country_code', ''),
                        'visa_type': row.get('visa_type', ''),
                        'category': row.get('category', ''),
                        'chunk_index': row.get('chunk_index', 0)
                    })
                
                documents.append(Document(page_content=content, metadata=metadata))
            
            # Create BM25 retriever
            if not documents:
                logger.warning(f"No chunks found for BM25 indexing ({collection_type})")
                documents = [Document(page_content="No content available", metadata={})]
            
            bm25_retriever = BM25Retriever.from_documents(documents, k=k)
            
            logger.info(f"BM25 retriever created with {len(documents)} chunks for {collection_type}")
            return bm25_retriever
            
        except Exception as e:
            logger.error(f"Error creating BM25 retriever: {e}")
            fallback_doc = Document(page_content="Error loading content", metadata={})
            return BM25Retriever.from_documents([fallback_doc], k=k)
    
    async def get_hybrid_results(
        self,
        query: str,
        collection_type: CollectionType,
        k: int = 5
    ) -> List[Document]:
        """
        Perform hybrid search combining vector and BM25 results.
        Manual combination since EnsembleRetriever has async issues.
        """
        
        # Get both retrievers - increase k to get more candidates
        vector_retriever = await self.get_vector_retriever(collection_type, k * 2)
        bm25_retriever = await self.get_bm25_retriever(collection_type, k * 2)
        
        # Get results from both
        vector_docs = await vector_retriever.aget_relevant_documents(query)
        
        # BM25 is synchronous - use invoke instead of deprecated get_relevant_documents
        try:
            bm25_docs = bm25_retriever.invoke(query)
        except Exception as e:
            logger.warning(f"BM25 retrieval failed: {e}")
            bm25_docs = []
        
        # Log what we're retrieving for debugging
        logger.info(f"Vector search returned {len(vector_docs)} docs for query: {query}")
        logger.info(f"BM25 search returned {len(bm25_docs)} docs")
        
        # Combine and deduplicate results
        seen_content = set()
        combined_docs = []
        
        # Add vector results first (prioritize semantic search)
        for doc in vector_docs:
            content_hash = hash(doc.page_content[:100])
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                combined_docs.append(doc)
                # Log relevant chunks
                if any(term in doc.page_content.lower() for term in ['german', 'blue card', 'fee', '€']):
                    logger.info(f"Found relevant chunk: {doc.page_content[:200]}...")
        
        # Add BM25 results if we have room
        for doc in bm25_docs:
            if len(combined_docs) >= k * 2:
                break
            content_hash = hash(doc.page_content[:100])
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                combined_docs.append(doc)
        
        logger.info(f"Hybrid search returned {len(combined_docs)} unique documents")
        return combined_docs[:k]
    
    def _get_system_prompt(self, collection_type: CollectionType) -> str:
        """Get collection-specific system prompt"""
        
        if collection_type == "visa":
            return """You are Toku's AI Visa & Immigration Support Assistant.

Your role is to help contributors and clients with visa-related questions using the provided context.

IMPORTANT GUIDELINES:
- Format your responses using proper markdown for better readability
- Use proper line breaks between sections (double newline)
- For lists, use "- " for bullet points or "1. " for numbered lists
- Bold important information using **text**
- Always cite specific visa types, countries, and requirements from the context
- Mention fees, timelines, and eligibility criteria when available
- For H-1B specifically, mention the 2025 $100,000 annual fee reform if relevant
- Be precise about eligibility requirements and documentation
- If information is not in the context, say: "I don't have specific information about that in my knowledge base. Please contact legal@toku.com for assistance."

FORMATTING EXAMPLE:
The fees for the **German EU Blue Card** are:

**Government Fees:**
- Entry Visa: €75–€100
- Residence Permit: €100–€110

ALWAYS end responses with this disclaimer after two line breaks:

⚠️ **Disclaimer**: Visa rules change frequently. Always confirm with Toku's immigration team (legal@toku.com) before taking action.

Context from knowledge base:
{context}

Provide accurate, helpful responses in well-formatted markdown."""
        
        else:  # general
            return """You are Toku's Customer Support AI Assistant.

Help users with questions about payroll, benefits, HR policies, and general Toku services using the provided context.

GUIDELINES:
- Format your responses using proper markdown for better readability
- Use proper line breaks between sections (double newline)
- For lists, use "- " for bullet points or "1. " for numbered lists
- Bold important information using **text**
- Be friendly and professional
- Cite specific articles or policies from context when possible
- If unsure, direct users to appropriate resources
- Keep responses concise and actionable

FORMATTING EXAMPLE:
**Contractor Payments** work as follows:

1. **Invoice Submission**: Submit by the 21st of each month
2. **Approval Process**: Admin reviews and approves
3. **Payment Timeline**: Processed within 10 business days

Context from knowledge base:
{context}

Provide helpful, accurate responses in well-formatted markdown."""
    
    @staticmethod
    def _format_docs(docs: List[Document]) -> str:
        """Format retrieved documents for context"""
        
        if not docs:
            return "No relevant context found."
        
        formatted = []
        for i, doc in enumerate(docs, 1):
            title = doc.metadata.get('title', 'Unknown')
            content = doc.page_content
            
            # Increase content length to ensure we get full information
            if len(content) > 1000:
                content = content[:1000] + "..."
            
            formatted.append(f"[Source {i}: {title}]\n{content}\n")
        
        return "\n".join(formatted)
    
    async def create_chain(
        self,
        collection_type: CollectionType,
        query: str
    ):
        """Create RAG chain with LangChain Expression Language (LCEL)"""
        
        # Get hybrid search results
        docs = await self.get_hybrid_results(query, collection_type, k=5)
        context = self._format_docs(docs)
        
        # Create prompt template
        system_prompt_template = self._get_system_prompt(collection_type)
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt_template),
            ("human", "{question}")
        ])
        
        # Create chain using LCEL with pre-retrieved context
        chain = (
            {
                "context": lambda x: context,
                "question": RunnablePassthrough()
            }
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        return chain
    
    async def stream_response(
        self,
        query: str,
        collection_type: CollectionType
    ) -> AsyncGenerator[str, None]:
        """Stream chat response using LangChain"""
        
        try:
            chain = await self.create_chain(collection_type, query)
            
            async for chunk in chain.astream(query):
                # Ensure we're yielding the actual content from the chunk
                if hasattr(chunk, 'content'):
                    yield chunk.content
                else:
                    yield str(chunk)
                
        except Exception as e:
            logger.error(f"Error in stream_response: {e}")
            yield f"I encountered an error processing your request. Please try again or contact support."
    
    async def get_response(
        self,
        query: str,
        collection_type: CollectionType
    ) -> str:
        """Get complete response (non-streaming)"""
        
        try:
            chain = await self.create_chain(collection_type, query)
            response = await chain.ainvoke(query)
            return response
            
        except Exception as e:
            logger.error(f"Error in get_response: {e}")
            return "I encountered an error processing your request. Please try again or contact support."


# FastAPI dependency injection
def get_rag_service(db_pool: asyncpg.Pool = None) -> MultiCollectionRAG:
    """
    FastAPI dependency to inject RAG service.
    """
    if db_pool is None:
        raise ValueError("Database pool is required")
    
    return MultiCollectionRAG(db_pool)