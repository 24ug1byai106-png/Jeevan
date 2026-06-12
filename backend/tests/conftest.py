import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["ENVIRONMENT"] = "test"
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["SQLITE_PATH"] = "data/test_jeevan_ai.sqlite3"

from app.main import app
from app.models.database import init_db


@pytest.fixture(autouse=True)
def setup_database():
    db_path = Path("data/test_jeevan_ai.sqlite3")
    if db_path.exists():
        db_path.unlink()
    init_db()
    yield
    if db_path.exists():
        db_path.unlink()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

