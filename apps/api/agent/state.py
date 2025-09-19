"""
Agent state definitions for LangGraph workflow
"""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


Category = Literal["billing", "benefits", "customer_success", "legal", "payroll", "none"]


class AgentState(BaseModel):
    """
    State object that flows through the LangGraph workflow
    
    Attributes:
        user_query: The original user question
        chat_history: Previous conversation messages
        retrieved: RAG search results (chunks)
        answer: Generated answer from the model
        category: Detected or assigned category for routing
        confidence: Confidence score (0.0 to 1.0)
        escalate: Whether to create a support ticket
        ticket_id: HubSpot ticket ID if created
        user_meta: Additional metadata from the UI
    """
    user_query: str = Field(..., description="User's question or request")
    chat_history: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Chat history with role and content"
    )
    retrieved: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="RAG search results"
    )
    answer: Optional[str] = Field(None, description="Generated answer")
    category: Category = Field("none", description="Issue category for routing")
    confidence: float = Field(0.0, description="Answer confidence score", ge=0.0, le=1.0)
    escalate: bool = Field(False, description="Whether to escalate to support")
    ticket_id: Optional[str] = Field(None, description="Created ticket ID")
    user_meta: Dict[str, Any] = Field(
        default_factory=dict,
        description="User metadata (email, priority, org, etc.)"
    )
    
    # Additional fields for tracking
    rag_scores: List[float] = Field(
        default_factory=list,
        description="RAG relevance scores for debugging"
    )
    processing_errors: List[str] = Field(
        default_factory=list,
        description="Any errors encountered during processing"
    )
    
    class Config:
        """Pydantic configuration"""
        json_encoders = {
            # Custom encoders if needed
        }
