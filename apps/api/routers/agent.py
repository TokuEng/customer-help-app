"""
Agent router with SSE streaming for interactive chat
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import json
import asyncio
from agent.state import AgentState
from agent.graph import get_graph
from core.config import get_agent_config, initialize_langsmith


# Initialize LangSmith tracing if configured
initialize_langsmith()

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentRequest(BaseModel):
    """Request payload for agent interaction"""
    user_query: str = Field(..., description="User's question")
    chat_history: List[Dict[str, str]] = Field(default_factory=list, description="Previous messages")
    user_meta: Dict[str, Any] = Field(default_factory=dict, description="User metadata")


class AgentHealthResponse(BaseModel):
    """Health check response"""
    enabled: bool
    configured: bool
    pipelines: Dict[str, str] = {}


@router.get("/health", response_model=AgentHealthResponse)
async def agent_health():
    """
    Check agent health and configuration status
    
    Returns configuration status without exposing sensitive data
    """
    config = get_agent_config()
    
    response = AgentHealthResponse(
        enabled=config.feature_agent_chat,
        configured=bool(config.langsmith and config.hubspot)
    )
    
    if config.hubspot:
        # Return which pipelines are configured (not the IDs)
        response.pipelines = {
            category: "configured" if pipeline_id else "not_configured"
            for category, pipeline_id in config.hubspot.ticket_pipelines.items()
        }
    
    return response


@router.post("/stream")
async def agent_stream(request: AgentRequest):
    """
    Stream agent processing steps via Server-Sent Events (SSE)
    
    This endpoint:
    1. Validates the feature flag
    2. Initializes the agent state
    3. Runs the LangGraph workflow
    4. Streams each step as SSE events
    """
    config = get_agent_config()
    
    # Check if feature is enabled
    if not config.feature_agent_chat:
        raise HTTPException(
            status_code=404,
            detail="Agent chat feature is not enabled"
        )
    
    # Validate configuration
    if not config.langsmith or not config.hubspot:
        raise HTTPException(
            status_code=503,
            detail="Agent service is not properly configured"
        )
    
    # Create initial state from request
    try:
        initial_state = AgentState(
            user_query=request.user_query,
            chat_history=request.chat_history,
            user_meta=request.user_meta
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request data: {str(e)}"
        )
    
    async def generate_events():
        """Generate SSE events from the agent workflow"""
        try:
            # Get the compiled graph
            graph = get_graph()
            
            # Send initial event
            yield f"event: start\ndata: {json.dumps({'status': 'processing'})}\n\n"
            
            # Track the current node for debugging
            current_node = None
            
            # Run the graph and stream state updates
            async for update in graph.astream(initial_state):
                # The update contains the state after each node
                if isinstance(update, dict):
                    # Extract node name and state
                    for node_name, node_state in update.items():
                        current_node = node_name
                        
                        # Convert state to dict for serialization
                        if hasattr(node_state, 'model_dump'):
                            state_dict = node_state.model_dump()
                        else:
                            state_dict = {"node": node_name, "data": str(node_state)}
                        
                        # Send step event
                        event_data = {
                            "node": node_name,
                            "state": state_dict,
                            "timestamp": asyncio.get_event_loop().time()
                        }
                        
                        yield f"event: step\ndata: {json.dumps(event_data)}\n\n"
                        
                        # Small delay to prevent overwhelming the client
                        await asyncio.sleep(0.1)
                
                elif hasattr(update, 'model_dump'):
                    # Direct state update
                    state_dict = update.model_dump()
                    event_data = {
                        "node": current_node or "unknown",
                        "state": state_dict,
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    
                    yield f"event: step\ndata: {json.dumps(event_data)}\n\n"
                    await asyncio.sleep(0.1)
            
            # Send completion event
            yield f"event: complete\ndata: {json.dumps({'status': 'completed'})}\n\n"
            
        except Exception as e:
            # Send error event
            error_data = {
                "error": str(e),
                "node": current_node or "unknown"
            }
            yield f"event: error\ndata: {json.dumps(error_data)}\n\n"
    
    # Return SSE response
    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        }
    )


@router.post("/process")
async def agent_process(request: AgentRequest):
    """
    Non-streaming endpoint for agent processing
    
    Returns the final state after all processing is complete
    """
    config = get_agent_config()
    
    # Check if feature is enabled
    if not config.feature_agent_chat:
        raise HTTPException(
            status_code=404,
            detail="Agent chat feature is not enabled"
        )
    
    # Create initial state
    initial_state = AgentState(
        user_query=request.user_query,
        chat_history=request.chat_history,
        user_meta=request.user_meta
    )
    
    try:
        # Get the compiled graph
        graph = get_graph()
        
        # Run the graph to completion
        final_state = None
        async for update in graph.astream(initial_state):
            # Keep the last state
            if isinstance(update, dict):
                for node_name, node_state in update.items():
                    final_state = node_state
            else:
                final_state = update
        
        # Return the final state
        if final_state and hasattr(final_state, 'model_dump'):
            return final_state.model_dump()
        else:
            raise HTTPException(
                status_code=500,
                detail="Agent processing failed to produce a valid state"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent processing error: {str(e)}"
        )
