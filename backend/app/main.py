import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.logging import configure_logging
from app.config.settings import get_settings
from app.models.database import get_connection, init_db
from app.routes import asha, emergency, health, hospitals, voice

settings = get_settings()
configure_logging(settings)
logger = logging.getLogger("app")
access_logger = logging.getLogger("app.access")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logger.info("Jeevan AI backend started")
    yield
    logger.info("Jeevan AI backend stopped")


app = FastAPI(
    title="Jeevan AI Backend",
    description="Offline-first multilingual emergency healthcare assistant for rural India.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    started = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as exc:
        logger.exception("Unhandled error for %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    finally:
        duration_ms = (time.perf_counter() - started) * 1000
        access_logger.info(
            "",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
            },
        )
        try:
            with get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO request_logs (method, path, status_code, duration_ms, created_at)
                    VALUES (?, ?, ?, ?, strftime('%s', 'now'))
                    """,
                    (request.method, request.url.path, status_code, duration_ms),
                )
        except Exception as exc:
            logger.debug("Failed to persist request log: %s", exc)


app.include_router(health.router)
app.include_router(emergency.router)
app.include_router(asha.router)
app.include_router(hospitals.router)
app.include_router(voice.router)

