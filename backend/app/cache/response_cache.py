import hashlib
import json
import time
from typing import Any

from app.config.settings import get_settings
from app.models.database import get_connection


def build_cache_key(namespace: str, payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(f"{namespace}:{serialized}".encode("utf-8")).hexdigest()


class ResponseCache:
    def __init__(self, ttl_seconds: int | None = None) -> None:
        settings = get_settings()
        self.enabled = settings.enable_response_cache
        self.ttl_seconds = ttl_seconds or settings.response_cache_ttl_seconds

    def get(self, cache_key: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        now = int(time.time())
        with get_connection() as conn:
            row = conn.execute(
                "SELECT payload FROM response_cache WHERE cache_key = ? AND expires_at > ?",
                (cache_key, now),
            ).fetchone()
        if not row:
            return None
        return json.loads(row["payload"])

    def set(self, cache_key: str, payload: dict[str, Any]) -> None:
        if not self.enabled:
            return
        now = int(time.time())
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO response_cache (cache_key, payload, created_at, expires_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    payload = excluded.payload,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at
                """,
                (
                    cache_key,
                    json.dumps(payload, ensure_ascii=False),
                    now,
                    now + self.ttl_seconds,
                ),
            )

