import logging
import time
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from app.config.settings import get_settings
from app.models.database import get_connection
from app.utils.json_utils import extract_json_object

logger = logging.getLogger("app.gemini")
T = TypeVar("T", bound=BaseModel)


class GeminiUnavailableError(RuntimeError):
    pass


class GeminiService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None

    def _get_client(self):
        if not self.settings.gemini_api_key:
            raise GeminiUnavailableError("GEMINI_API_KEY is not configured")
        if self._client is None:
            try:
                from google import genai
            except ImportError as exc:
                raise GeminiUnavailableError("google-genai package is not installed") from exc
            self._client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._client

    def generate_json(self, prompt: str, response_model: type[T], prompt_type: str) -> T:
        last_error: Exception | None = None
        for attempt in range(self.settings.gemini_max_retries + 1):
            started = time.perf_counter()
            try:
                client = self._get_client()
                response = client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "temperature": 0.15,
                    },
                )
                text = getattr(response, "text", "") or ""
                payload = extract_json_object(text)
                model = response_model.model_validate(payload)
                self._log(prompt_type, True, started, text, None)
                logger.info("Gemini %s succeeded on attempt %s", prompt_type, attempt + 1)
                return model
            except (ValidationError, ValueError, GeminiUnavailableError, Exception) as exc:
                last_error = exc
                self._log(prompt_type, False, started, "", str(exc))
                logger.warning("Gemini %s failed on attempt %s: %s", prompt_type, attempt + 1, exc)
                if isinstance(exc, GeminiUnavailableError):
                    break
                if attempt < self.settings.gemini_max_retries:
                    time.sleep(0.5 * (2**attempt))

        raise GeminiUnavailableError(str(last_error) if last_error else "Gemini request failed")

    def transcribe_audio(self, audio_bytes: bytes, mime_type: str) -> str:
        prompt = "Transcribe this emergency audio into plain text. Return only the transcript."
        started = time.perf_counter()
        try:
            client = self._get_client()
            try:
                from google.genai import types

                audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
            except Exception:
                audio_part = {"inline_data": {"mime_type": mime_type, "data": audio_bytes}}

            response = client.models.generate_content(
                model=self.settings.gemini_model,
                contents=[prompt, audio_part],
                config={"temperature": 0.0},
            )
            transcript = (getattr(response, "text", "") or "").strip()
            self._log("voice_transcription", True, started, transcript, None)
            if not transcript:
                raise GeminiUnavailableError("Gemini returned an empty transcript")
            return transcript
        except Exception as exc:
            self._log("voice_transcription", False, started, "", str(exc))
            raise GeminiUnavailableError(str(exc)) from exc

    @staticmethod
    def _log(
        prompt_type: str,
        success: bool,
        started: float,
        response_text: str,
        error: str | None,
    ) -> None:
        latency_ms = (time.perf_counter() - started) * 1000
        try:
            with get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO gemini_logs
                    (prompt_type, success, latency_ms, response_preview, error, created_at)
                    VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
                    """,
                    (prompt_type, int(success), latency_ms, response_text[:1000], error),
                )
        except Exception as exc:
            logger.debug("Failed to persist Gemini log: %s", exc)

