from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str
    
    # Meilisearch
    meili_host: str
    meili_master_key: str
    
    # Notion
    notion_token: str
    notion_index_page_id: str
    
    # Embeddings
    embeddings_provider: str = "openai"  # openai | local
    openai_api_key: Optional[str] = None
    
    # Revalidation
    revalidate_token: str
    web_base_url: str
    
    # API Settings
    api_prefix: str = "/api"
    cors_origins: list[str] = ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
