import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from app.config.settings import get_settings


def _database_path() -> Path:
    path = Path(get_settings().sqlite_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(_database_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS response_cache (
                cache_key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT NOT NULL,
                path TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                duration_ms REAL NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS openrouter_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_type TEXT NOT NULL,
                success INTEGER NOT NULL,
                latency_ms REAL NOT NULL,
                response_preview TEXT NOT NULL,
                error TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS ingestion_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emergency_name TEXT NOT NULL,
                source TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            """
        )


def insert_json_log(table: str, payload: dict[str, Any]) -> None:
    allowed_tables = {"ingestion_documents"}
    if table not in allowed_tables:
        raise ValueError(f"Unsupported log table: {table}")

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO ingestion_documents (emergency_name, source, payload, created_at)
            VALUES (?, ?, ?, strftime('%s', 'now'))
            """,
            (
                payload["emergency_name"],
                payload["source"],
                json.dumps(payload["payload"], ensure_ascii=False),
            ),
        )

