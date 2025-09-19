"""
Agent configuration loader with validation
"""
import os
import json
from typing import Dict, Optional
from pydantic import BaseModel, Field, ValidationError


class LangSmithConfig(BaseModel):
    """LangSmith configuration"""
    api_key: str = Field(..., description="LangSmith API key")
    project: str = Field(default="help-center-agent", description="LangSmith project name")
    tracing_enabled: bool = Field(default=True, description="Enable LangSmith tracing")


class HubSpotConfig(BaseModel):
    """HubSpot configuration"""
    private_app_token: str = Field(..., description="HubSpot private app token")
    ticket_pipelines: Dict[str, str] = Field(..., description="Pipeline IDs for each category")
    default_stage: str = Field(default="", description="Default pipeline stage ID")


class AgentConfig(BaseModel):
    """Complete agent configuration"""
    feature_agent_chat: bool = Field(default=False, description="Enable agent chat feature")
    langsmith: Optional[LangSmithConfig] = None
    hubspot: Optional[HubSpotConfig] = None
    internal_rag_url: str = Field(
        default="http://localhost:8080/api/rag/search",
        description="Internal RAG endpoint URL"
    )


def load_agent_config() -> AgentConfig:
    """
    Load and validate agent configuration from environment variables
    
    Returns:
        AgentConfig: Validated configuration object
        
    Raises:
        ValueError: If required configuration is missing when feature is enabled
    """
    feature_enabled = os.getenv("FEATURE_AGENT_CHAT", "false").lower() == "true"
    
    config_dict = {
        "feature_agent_chat": feature_enabled,
        "internal_rag_url": os.getenv("INTERNAL_RAG_URL", "http://localhost:8080/api/rag/search")
    }
    
    if feature_enabled:
        # LangSmith configuration (required when feature enabled)
        langsmith_key = os.getenv("LANGSMITH_API_KEY")
        if not langsmith_key:
            raise ValueError(
                "FEATURE_AGENT_CHAT is enabled but LANGSMITH_API_KEY is missing. "
                "Please set LANGSMITH_API_KEY environment variable."
            )
        
        config_dict["langsmith"] = {
            "api_key": langsmith_key,
            "project": os.getenv("LANGSMITH_PROJECT", "help-center-agent"),
            "tracing_enabled": os.getenv("LANGSMITH_TRACING", "true").lower() == "true"
        }
        
        # HubSpot configuration (required when feature enabled)
        hubspot_token = os.getenv("HUBSPOT_PRIVATE_APP_TOKEN")
        if not hubspot_token:
            raise ValueError(
                "FEATURE_AGENT_CHAT is enabled but HUBSPOT_PRIVATE_APP_TOKEN is missing. "
                "Please set HUBSPOT_PRIVATE_APP_TOKEN environment variable."
            )
        
        # Parse pipeline mappings
        pipeline_json = os.getenv(
            "HUBSPOT_TICKET_PIPELINES",
            '{"billing":"","benefits":"29839424155","customer_success":"29763647900","legal":"","payroll":"29747165533"}'
        )
        
        try:
            pipelines = json.loads(pipeline_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid HUBSPOT_TICKET_PIPELINES JSON: {e}")
        
        # Validate that at least some pipelines are configured
        configured_pipelines = {k: v for k, v in pipelines.items() if v}
        if not configured_pipelines:
            raise ValueError(
                "No HubSpot pipelines configured. Please set at least one pipeline ID in HUBSPOT_TICKET_PIPELINES."
            )
        
        config_dict["hubspot"] = {
            "private_app_token": hubspot_token,
            "ticket_pipelines": pipelines,
            "default_stage": os.getenv("HUBSPOT_DEFAULT_STAGE", "")
        }
    
    try:
        return AgentConfig(**config_dict)
    except ValidationError as e:
        raise ValueError(f"Configuration validation failed: {e}")


# Singleton config instance
_config_instance: Optional[AgentConfig] = None


def get_agent_config() -> AgentConfig:
    """
    Get or create singleton configuration instance
    
    Returns:
        AgentConfig: The configuration instance
    """
    global _config_instance
    if _config_instance is None:
        _config_instance = load_agent_config()
    return _config_instance


# Initialize LangSmith if configured
def initialize_langsmith():
    """Initialize LangSmith tracing if configured"""
    config = get_agent_config()
    if config.feature_agent_chat and config.langsmith and config.langsmith.tracing_enabled:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = config.langsmith.api_key
        os.environ["LANGCHAIN_PROJECT"] = config.langsmith.project
        print(f"✅ LangSmith tracing initialized for project: {config.langsmith.project}")
