# Jeevan AI Backend

Jeevan AI is an offline-first multilingual emergency healthcare assistant for rural India. The backend exposes a production-minded REST API built with Python 3.12, FastAPI, Pydantic, Gemini, SQLite, and an offline emergency knowledge cache.

## Features

- Emergency AI analysis with Gemini and JSON validation.
- Offline fallback for snake bite, heart attack, burns, fracture, electric shock, drowning, heat stroke, unconscious patient, and general emergencies.
- English, Hindi, Kannada, and Tamil responses.
- ASHA worker mode with simplified community healthcare instructions.
- SOS emergency cards.
- Voice transcription service layer, currently Gemini-backed and ready for Whisper replacement.
- Nearby hospital lookup through OpenStreetMap Overpass API.
- Haversine distance sorting.
- Deterministic triage rules with severity scores.
- Safety guardrails and emergency disclaimer.
- SQLite response cache, request logs, Gemini logs, and ingestion logs.
- Swagger docs at `/docs`.
- Docker and docker-compose deployment.

## Safety Disclaimer

This service provides emergency guidance only. It must not be used as a diagnosis, prescription, or replacement for professional medical care.

## Local Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Open:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

If `OPENROUTER_API_KEY` is not set, emergency and ASHA endpoints still work through the offline cache.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key. |
| `OPENROUTER_MODEL` | OpenRouter model name, default `openrouter/auto`. |
| `SQLITE_PATH` | SQLite database path, default `data/jeevan_ai.sqlite3`. |
| `ENABLE_RESPONSE_CACHE` | Enables SQLite response cache. |
| `RESPONSE_CACHE_TTL_SECONDS` | Cache TTL in seconds. |
| `OVERPASS_URL` | OpenStreetMap Overpass endpoint. |
| `HOSPITAL_SEARCH_RADIUS_METERS` | Radius for hospital lookup. |
| `LOG_LEVEL` | Python logging level. |

## API Examples

### Health

```bash
curl http://localhost:8000/health
```

### Emergency Analysis

```bash
curl -X POST http://localhost:8000/api/emergency/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"snake bite\",\"language\":\"Kannada\"}"
```

### SOS Card

```bash
curl -X POST http://localhost:8000/api/emergency/sos ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"heart attack\"}"
```

### ASHA Worker Mode

```bash
curl -X POST http://localhost:8000/api/asha/assist ^
  -H "Content-Type: application/json" ^
  -d "{\"patientAge\":55,\"symptoms\":\"chest pain\",\"language\":\"Hindi\"}"
```

### Voice Transcription

```bash
curl -X POST http://localhost:8000/api/voice/transcribe ^
  -F "file=@sample.wav"
```

### Nearby Hospitals

```bash
curl "http://localhost:8000/api/hospitals/nearby?lat=12.9716&lng=77.5946"
```

## Knowledge Ingestion Pipeline

The ingestion service is in `app/services/knowledge_ingestion_service.py`. It writes new first-aid guides to `app/cache/offline_knowledge_custom.json` and records the source in SQLite.

Example Python usage:

```python
from app.models.database import init_db
from app.services.knowledge_ingestion_service import KnowledgeIngestionService

init_db()
KnowledgeIngestionService().ingest_text(
    emergency_name="Severe Bleeding",
    source="district_first_aid_manual.pdf",
    summary="Severe bleeding needs firm pressure and urgent medical care.",
    first_aid=[
        "Apply firm direct pressure with a clean cloth.",
        "Keep pressure until help arrives.",
        "Call emergency services.",
    ],
    avoid=[
        "Do not remove soaked cloths; add more on top.",
        "Do not apply unknown powders or substances.",
    ],
    severity="High",
    severity_score=85,
    hospital_required=True,
)
```

## Tests

```bash
cd backend
pytest
```

Tests cover health, emergency fallback, ASHA fallback, SOS, voice text-file transcription, hospital sorting with mocked Overpass data, and utility behavior.

## Docker

```bash
cd backend
copy .env.example .env
docker compose up --build
```

## Deploy To Render

1. Create a new Web Service from this repository.
2. Set root directory to `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.example`, especially `OPENROUTER_API_KEY`.
6. Add a persistent disk if you want SQLite data to survive redeploys.

## Deploy To Railway

1. Create a new Railway project from the repository.
2. Set the service root to `backend`.
3. Railway will use the Dockerfile, or set start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Add `OPENROUTER_API_KEY` and other environment variables.
5. Mount persistent storage for `data/` if required.

## Deploy To VPS

```bash
git clone <your-repo-url>
cd <repo>/backend
cp .env.example .env
docker compose up -d --build
```

For production, place Nginx or Caddy in front of Uvicorn, terminate HTTPS there, and restrict CORS origins to the deployed frontend domain.

