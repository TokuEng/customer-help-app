"""
LangGraph nodes for agent workflow
"""
import os
import re
import httpx
import asyncio
from typing import Dict, Any, List
from openai import AsyncOpenAI
from .state import AgentState, Category
from core.config import get_agent_config


# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def classify_intent(state: AgentState) -> AgentState:
    """
    Classify user intent and determine category
    
    Uses keyword matching with fallback to LLM classification
    """
    query_lower = state.user_query.lower()
    
    # Keyword-based classification
    billing_keywords = ["invoice", "bill", "billing", "payment", "charge", "subscription", "refund"]
    benefits_keywords = ["benefit", "insurance", "health", "dental", "vision", "401k", "retirement", "pto", "vacation"]
    legal_keywords = ["visa", "legal", "contract", "agreement", "compliance", "immigration", "h1b", "green card"]
    payroll_keywords = ["payroll", "payslip", "salary", "wage", "pay stub", "direct deposit", "w2", "tax"]
    support_keywords = ["support", "help", "contact", "assistance", "problem", "issue"]
    
    # Check for keywords
    if any(keyword in query_lower for keyword in billing_keywords):
        state.category = "billing"
    elif any(keyword in query_lower for keyword in benefits_keywords):
        state.category = "benefits"
    elif any(keyword in query_lower for keyword in legal_keywords):
        state.category = "legal"
    elif any(keyword in query_lower for keyword in payroll_keywords):
        state.category = "payroll"
    elif any(keyword in query_lower for keyword in support_keywords):
        state.category = "customer_success"
    else:
        # Use LLM for more sophisticated classification
        try:
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """Classify the user query into one of these categories:
                        - billing: Invoices, payments, charges, subscriptions
                        - benefits: Insurance, health, retirement, PTO
                        - legal: Visa, immigration, contracts, compliance
                        - payroll: Salary, paystubs, taxes, direct deposit
                        - customer_success: General support requests
                        - none: Doesn't fit any category
                        
                        Respond with ONLY the category name."""
                    },
                    {
                        "role": "user",
                        "content": state.user_query
                    }
                ],
                temperature=0,
                max_tokens=50
            )
            
            category_text = response.choices[0].message.content.strip().lower()
            if category_text in ["billing", "benefits", "customer_success", "legal", "payroll"]:
                state.category = category_text  # type: ignore
            else:
                state.category = "none"
                
        except Exception as e:
            state.processing_errors.append(f"Intent classification error: {str(e)}")
            state.category = "none"
    
    return state


async def retrieve_context(state: AgentState) -> AgentState:
    """
    Retrieve relevant context from RAG system
    
    Calls the internal RAG endpoint to get relevant chunks
    """
    config = get_agent_config()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                config.internal_rag_url,
                json={
                    "query": state.user_query,
                    "top_k": 6
                }
            )
            response.raise_for_status()
            
            rag_response = response.json()
            
            # Extract hits from RAG response
            if "hits" in rag_response:
                state.retrieved = rag_response["hits"]
                # Extract scores for confidence calculation
                state.rag_scores = [hit.get("score", 0.0) for hit in rag_response["hits"]]
            else:
                state.retrieved = []
                state.rag_scores = []
                
    except httpx.TimeoutError:
        state.processing_errors.append("RAG retrieval timeout")
        state.retrieved = []
    except httpx.HTTPStatusError as e:
        state.processing_errors.append(f"RAG retrieval HTTP error: {e.response.status_code}")
        state.retrieved = []
    except Exception as e:
        state.processing_errors.append(f"RAG retrieval error: {str(e)}")
        state.retrieved = []
    
    return state


async def draft_answer(state: AgentState) -> AgentState:
    """
    Generate an answer using retrieved context
    
    Uses the same answering approach as the existing chat system
    """
    if not state.retrieved:
        # No context available
        state.answer = "I couldn't find specific information about your question in our help center. Would you like me to connect you with our support team?"
        state.confidence = 0.3
        return state
    
    # Format context for the prompt
    context_text = ""
    for i, hit in enumerate(state.retrieved[:6], 1):
        title = hit.get("title", "")
        content = hit.get("content_md", "")
        url = hit.get("url", "")
        
        if title:
            context_text += f"[{i}] Title: {title}\n"
        if url:
            context_text += f"Article Link: {url}\n"
        if content:
            # Truncate content if too long
            content_truncated = content[:2000] if len(content) > 2000 else content
            context_text += f"Content: {content_truncated}\n"
        context_text += "---\n"
    
    # Build the system prompt (similar to existing chat)
    system_prompt = """You are Toku's Help Center assistant. You help users with questions about Toku's benefits, payroll, policies, workplace tools, and contractor payment schedules.

RESPONSE GUIDELINES:
- Base your answers on the provided context from help center articles
- If you have relevant context, provide helpful answers using that information
- Extract and present the key steps, information, or instructions from the articles
- Don't just tell users to "refer to the article" - give them the actual answer
- Include article links at the END of your answer as "Learn more: [Article Title](/a/slug)"
- Be conversational and helpful
- If the context doesn't fully answer the question, acknowledge this"""
    
    # Add context to the prompt
    user_prompt = f"""Context from Toku Help Center:
{context_text}

User Question: {state.user_query}

IMPORTANT: Extract the actual steps, instructions, or information from the context above and present them directly to answer the user's question. Include citations [1], [2] and add article links at the end if they want more details."""
    
    try:
        # Generate the answer
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Add chat history if available
        for msg in state.chat_history[-4:]:  # Last 4 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )
        
        state.answer = response.choices[0].message.content
        
        # Calculate confidence based on RAG scores
        if state.rag_scores:
            avg_score = sum(state.rag_scores[:3]) / min(3, len(state.rag_scores))
            state.confidence = min(0.95, avg_score * 1.2)  # Scale and cap at 0.95
        else:
            state.confidence = 0.5
            
    except Exception as e:
        state.processing_errors.append(f"Answer generation error: {str(e)}")
        state.answer = "I encountered an issue while processing your request. Please try again or contact our support team for assistance."
        state.confidence = 0.0
    
    return state


async def decide_escalation(state: AgentState) -> AgentState:
    """
    Decide whether to escalate to support
    
    Escalation triggers:
    - User explicitly requests support (via user_meta.escalate)
    - Low confidence score (< 0.65)
    - No relevant context found
    - Processing errors occurred
    """
    # Check for explicit escalation request
    if state.user_meta.get("escalate", False):
        state.escalate = True
        # Allow category override from UI
        override_category = state.user_meta.get("category")
        if override_category in ["billing", "benefits", "customer_success", "legal", "payroll"]:
            state.category = override_category  # type: ignore
        return state
    
    # Check confidence threshold
    confidence_threshold = 0.65
    if state.confidence < confidence_threshold:
        state.escalate = True
        return state
    
    # Check for processing errors
    if state.processing_errors:
        state.escalate = True
        return state
    
    # Check if no context was retrieved
    if not state.retrieved:
        state.escalate = True
        return state
    
    # Check for explicit support request in the query
    support_phrases = [
        "contact support",
        "talk to someone",
        "speak with",
        "human agent",
        "real person",
        "customer service",
        "help me"
    ]
    
    query_lower = state.user_query.lower()
    if any(phrase in query_lower for phrase in support_phrases):
        state.escalate = True
        state.category = "customer_success"
        return state
    
    # No escalation needed
    state.escalate = False
    return state
