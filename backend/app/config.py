"""
Application configuration using Pydantic settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings."""

    # App info
    app_name: str = "Orapa Mine"
    app_version: str = "1.0.0"
    debug: bool = True

    # Database
    database_url: str = "postgresql://orapa_user:orapa_pass@localhost:5432/orapa_mine"
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "orapa_mine"
    database_user: str = "orapa_user"
    database_password: str = "orapa_pass"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
