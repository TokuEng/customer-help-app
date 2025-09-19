"""
HubSpot integration for ticket creation
"""
import os
import json
import httpx
from typing import Optional, Dict, Any
from ..state import AgentState
from core.config import get_agent_config


HUBSPOT_BASE = "https://api.hubapi.com"


async def _get_stage_id(pipeline_id: str, token: str, default_stage: str) -> str:
    """
    Get the stage ID for a pipeline
    
    If no default stage is configured, fetch the first stage from the pipeline
    """
    if default_stage:
        return default_stage
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{HUBSPOT_BASE}/crm/v3/pipelines/tickets/{pipeline_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            pipeline_data = response.json()
            if pipeline_data.get("stages") and len(pipeline_data["stages"]) > 0:
                return pipeline_data["stages"][0]["id"]
            else:
                raise ValueError(f"No stages found in pipeline {pipeline_id}")
                
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Failed to fetch pipeline stages: HTTP {e.response.status_code}")
    except Exception as e:
        raise ValueError(f"Failed to fetch pipeline stages: {str(e)}")


async def create_ticket(state: AgentState) -> AgentState:
    """
    Create a HubSpot ticket based on the agent state
    
    This function:
    1. Checks if ticket creation is appropriate
    2. Maps the category to a pipeline
    3. Creates the ticket with relevant information
    4. Updates the state with the ticket ID
    """
    config = get_agent_config()
    
    # Check if HubSpot is configured
    if not config.hubspot:
        state.processing_errors.append("HubSpot integration not configured")
        return state
    
    # Check if we have a valid category
    if state.category == "none":
        state.processing_errors.append("No category determined for ticket routing")
        return state
    
    # Get the pipeline ID for this category
    pipeline_id = config.hubspot.ticket_pipelines.get(state.category)
    if not pipeline_id:
        state.processing_errors.append(f"No pipeline configured for category: {state.category}")
        return state
    
    try:
        # Get the stage ID
        stage_id = await _get_stage_id(
            pipeline_id,
            config.hubspot.private_app_token,
            config.hubspot.default_stage
        )
        
        # Prepare ticket subject
        subject = f"[Help Center] {state.user_query[:80]}"
        if len(state.user_query) > 80:
            subject += "..."
        
        # Build chat transcript
        transcript_lines = []
        for msg in state.chat_history[-20:]:  # Last 20 messages
            role = "User" if msg["role"] == "user" else "Assistant"
            content = msg["content"][:500]  # Truncate long messages
            transcript_lines.append(f"{role}: {content}")
        
        transcript = "\n".join(transcript_lines)
        
        # Build ticket content
        content_parts = []
        
        # Add the AI's answer if available
        if state.answer:
            content_parts.append("**AI Assistant Response:**")
            content_parts.append(state.answer)
            content_parts.append("")
        
        # Add confidence information
        content_parts.append(f"**Confidence Score:** {state.confidence:.2%}")
        content_parts.append(f"**Detected Category:** {state.category}")
        content_parts.append("")
        
        # Add user metadata if available
        if state.user_meta:
            if state.user_meta.get("url"):
                content_parts.append(f"**Page URL:** {state.user_meta['url']}")
            if state.user_meta.get("org"):
                content_parts.append(f"**Organization:** {state.user_meta['org']}")
            content_parts.append("")
        
        # Add processing errors if any
        if state.processing_errors:
            content_parts.append("**Processing Issues:**")
            for error in state.processing_errors:
                content_parts.append(f"- {error}")
            content_parts.append("")
        
        # Add chat transcript
        content_parts.append("**Chat Transcript:**")
        content_parts.append("---")
        content_parts.append(transcript)
        
        content = "\n".join(content_parts)
        
        # Build ticket properties
        ticket_properties: Dict[str, Any] = {
            "subject": subject,
            "content": content,
            "hs_pipeline": pipeline_id,
            "hs_pipeline_stage": stage_id,
        }
        
        # Add optional fields
        if email := state.user_meta.get("email"):
            ticket_properties["hs_ticket_email"] = email
            
        if priority := state.user_meta.get("priority"):
            # Map priority values to HubSpot format
            priority_map = {
                "low": "LOW",
                "medium": "MEDIUM", 
                "high": "HIGH",
                "urgent": "HIGH"  # HubSpot doesn't have "urgent", map to HIGH
            }
            hs_priority = priority_map.get(priority.lower(), "MEDIUM")
            ticket_properties["hs_ticket_priority"] = hs_priority
        
        # Create the ticket
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{HUBSPOT_BASE}/crm/v3/objects/tickets",
                headers={
                    "Authorization": f"Bearer {config.hubspot.private_app_token}",
                    "Content-Type": "application/json"
                },
                json={"properties": ticket_properties}
            )
            
            if response.status_code == 201:
                ticket_data = response.json()
                state.ticket_id = ticket_data.get("id")
                print(f"✅ HubSpot ticket created: {state.ticket_id} in pipeline {pipeline_id}")
            else:
                error_detail = response.text
                state.processing_errors.append(
                    f"HubSpot ticket creation failed: HTTP {response.status_code} - {error_detail}"
                )
                
    except ValueError as e:
        state.processing_errors.append(f"Ticket creation error: {str(e)}")
    except httpx.TimeoutError:
        state.processing_errors.append("HubSpot API timeout")
    except httpx.HTTPStatusError as e:
        state.processing_errors.append(f"HubSpot API error: HTTP {e.response.status_code}")
    except Exception as e:
        state.processing_errors.append(f"Unexpected error creating ticket: {str(e)}")
    
    return state
