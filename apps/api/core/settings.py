from pydantic_settings import BaseSettings
from typing import Optional
import os

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
    
    # Admin access for analytics dashboard
    admin_key: str = os.getenv("ADMIN_KEY", "admin_access_token_2024")
    
    # DigitalOcean Spaces (for permanent image storage)
    spaces_key: Optional[str] = None
    spaces_secret: Optional[str] = None
    spaces_bucket: Optional[str] = None
    spaces_region: str = "sfo3"
    spaces_cdn_endpoint: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables

settings = Settings()
