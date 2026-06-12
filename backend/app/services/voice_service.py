from fastapi import UploadFile

from app.services.gemini_service import GeminiService, GeminiUnavailableError


class VoiceService:
    def __init__(self) -> None:
        self.gemini_service = GeminiService()

    async def transcribe(self, file: UploadFile) -> str:
        content = await file.read()
        content_type = file.content_type or "application/octet-stream"

        if content_type.startswith("text/") or file.filename.lower().endswith(".txt"):
            return content.decode("utf-8").strip()

        try:
            return self.gemini_service.transcribe_audio(content, content_type)
        except GeminiUnavailableError as exc:
            raise GeminiUnavailableError(
                "Audio transcription requires GEMINI_API_KEY. The service is ready for Whisper adapter integration."
            ) from exc

