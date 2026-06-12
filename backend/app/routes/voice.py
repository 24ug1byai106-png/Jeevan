from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.voice import VoiceTranscriptionResponse
from app.services.openrouter_service import OpenRouterUnavailableError
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe", response_model=VoiceTranscriptionResponse, summary="Transcribe emergency audio")
async def transcribe_voice(file: UploadFile = File(...)) -> VoiceTranscriptionResponse:
    try:
        transcript = await VoiceService().transcribe(file)
    except OpenRouterUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return VoiceTranscriptionResponse(transcript=transcript)

