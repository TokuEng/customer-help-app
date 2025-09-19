"""
LangGraph workflow definition for the agent
"""
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import (
    classify_intent,
    retrieve_context,
    draft_answer,
    decide_escalation
)
from .tools.hubspot import create_ticket


def build_graph():
    """
    Build the LangGraph workflow
    
    The workflow follows this sequence:
    1. Classify user intent/category
    2. Retrieve relevant context from RAG
    3. Draft an answer using the context
    4. Decide if escalation is needed
    5. If escalation needed, create a HubSpot ticket
    
    Returns:
        Compiled LangGraph workflow
    """
    # Initialize the state graph
    graph = StateGraph(AgentState)
    
    # Add nodes
    graph.add_node("classify_intent", classify_intent)
    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("draft_answer", draft_answer)
    graph.add_node("decide_escalation", decide_escalation)
    graph.add_node("create_ticket", create_ticket)
    
    # Define the flow
    graph.set_entry_point("classify_intent")
    
    # Sequential edges
    graph.add_edge("classify_intent", "retrieve_context")
    graph.add_edge("retrieve_context", "draft_answer")
    graph.add_edge("draft_answer", "decide_escalation")
    
    # Conditional edge based on escalation decision
    def route_escalation(state: AgentState) -> str:
        """Route based on escalation decision"""
        if state.escalate:
            return "create_ticket"
        else:
            return END
    
    graph.add_conditional_edges(
        "decide_escalation",
        route_escalation,
        {
            "create_ticket": "create_ticket",
            END: END
        }
    )
    
    # After creating ticket, end the flow
    graph.add_edge("create_ticket", END)
    
    # Compile the graph
    return graph.compile()


# Create a singleton instance
_graph_instance = None

def get_graph():
    """
    Get or create the singleton graph instance
    
    Returns:
        Compiled LangGraph workflow
    """
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = build_graph()
    return _graph_instance
