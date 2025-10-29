"""
Application configuration using Pydantic settings.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    # Configuration for reading from .env file
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

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

    # CORS - comma-separated string from env, parsed to list
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    )

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    postgres_url: str = ""
    postgres_prisma_url: str = ""
    postgres_url_non_pooling: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse comma-separated origins string into list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()
