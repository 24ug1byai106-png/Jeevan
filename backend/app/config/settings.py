from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Jeevan AI"
    environment: Literal["development", "test", "production"] = "development"
    api_prefix: str = "/api"

    openrouter_api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    openrouter_model: str = "openrouter/auto"
    openrouter_timeout_seconds: float = 20.0
    openrouter_max_retries: int = 2

    sqlite_path: str = "data/jeevan_ai.sqlite3"
    response_cache_ttl_seconds: int = 3600
    enable_response_cache: bool = True

    overpass_url: str = "https://overpass-api.de/api/interpreter"
    hospital_search_radius_meters: int = 25000
    hospital_result_limit: int = 20

    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

