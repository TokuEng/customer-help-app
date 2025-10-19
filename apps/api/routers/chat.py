"""
Chat API router with LangChain RAG support
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Literal, Optional
import time
from datetime import datetime
import json

from services.langchain_rag import MultiCollectionRAG, CollectionType

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Chat request with collection type selector"""
    message: str = Field(..., max_length=1000, min_length=1, description="User message")
    collection_type: CollectionType = Field(default="general", description="Knowledge base to query")
    chat_id: Optional[str] = Field(None, description="Session ID for tracking")


class ChatResponse(BaseModel):
    """Non-streaming chat response"""
    response: str
    collection_type: CollectionType
    chat_id: str


def get_rag_service_dependency(request: Request) -> MultiCollectionRAG:
    """Dependency to get RAG service with database pool"""
    db_pool = request.app.state.db_pool()
    return MultiCollectionRAG(db_pool)


@router.post("/stream")
async def chat_stream(
    request: Request,
    chat_request: ChatRequest,
    rag: MultiCollectionRAG = Depends(get_rag_service_dependency)
):
    """
    Stream chat responses using LangChain RAG.
    Supports both 'general' and 'visa' collections.
    """
    
    # Use session_id from request or generate new one
    session_id = chat_request.chat_id or f"chat_{int(time.time())}_{hash(chat_request.message) % 1000}"
    
    # Track response time
    start_time = time.time()
    
    # Log user message (using bigserial id, not UUID)
    db_pool = request.app.state.db_pool()
    async with db_pool.acquire() as conn:
        interaction_id = await conn.fetchval(
            """
            INSERT INTO chat_interactions 
            (session_id, user_message, collection_type, created_at)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            session_id,
            chat_request.message,
            chat_request.collection_type,
            datetime.utcnow()
        )
    
    # Stream response
    async def generate():
        full_response = []
        buffer = ""
        
        try:
            async for chunk in rag.stream_response(
                query=chat_request.message,
                collection_type=chat_request.collection_type
            ):
                full_response.append(chunk)
                buffer += chunk
                
                # Stream complete words or lines to preserve markdown
                if chunk.endswith(' ') or chunk.endswith('\n') or chunk.endswith('.') or chunk.endswith(':') or chunk.endswith('-'):
                    # Use JSON to properly encode the data including newlines
                    json_data = json.dumps({"content": buffer})
                    yield f"data: {json_data}\n\n"
                    buffer = ""
            
            # Flush any remaining buffer
            if buffer:
                json_data = json.dumps({"content": buffer})
                yield f"data: {json_data}\n\n"
            
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log complete response
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE chat_interactions
                    SET assistant_response = $1, response_time_ms = $2
                    WHERE id = $3
                    """,
                    "".join(full_response),
                    response_time_ms,
                    interaction_id
                )
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Chat-ID": session_id,
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: Request,
    chat_request: ChatRequest,
    rag: MultiCollectionRAG = Depends(get_rag_service_dependency)
):
    """
    Non-streaming chat endpoint for simple queries.
    """
    
    try:
        response = await rag.get_response(
            query=chat_request.message,
            collection_type=chat_request.collection_type
        )
        
        return ChatResponse(
            response=response,
            collection_type=chat_request.collection_type,
            chat_id=chat_request.chat_id or f"chat_{int(time.time())}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))