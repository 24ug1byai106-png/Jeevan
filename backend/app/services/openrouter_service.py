import json
import logging
import time
from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.config.settings import get_settings
from app.models.database import get_connection
from app.utils.json_utils import extract_json_object

logger = logging.getLogger("app.openrouter")
T = TypeVar("T", bound=BaseModel)


class OpenRouterUnavailableError(RuntimeError):
    pass


class OpenRouterService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None

    def _get_client(self):
        if not self.settings.openrouter_api_key:
            raise OpenRouterUnavailableError("OPENROUTER_API_KEY is not configured")
        if self._client is None:
            self._client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.settings.openrouter_api_key,
            )
        return self._client

    def generate_json(self, prompt: str, response_model: type[T], prompt_type: str) -> T:
        last_error: Exception | None = None
        for attempt in range(self.settings.openrouter_max_retries + 1):
            started = time.perf_counter()
            try:
                client = self._get_client()
                response = client.chat.completions.create(
                    model=self.settings.openrouter_model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.15,
                )
                text = response.choices[0].message.content or ""
                payload = extract_json_object(text)
                model = response_model.model_validate(payload)
                self._log(prompt_type, True, started, text, None)
                logger.info("OpenRouter %s succeeded on attempt %s", prompt_type, attempt + 1)
                return model
            except (ValidationError, ValueError, OpenRouterUnavailableError, Exception) as exc:
                last_error = exc
                self._log(prompt_type, False, started, "", str(exc))
                logger.warning("OpenRouter %s failed on attempt %s: %s", prompt_type, attempt + 1, exc)
                if isinstance(exc, OpenRouterUnavailableError):
                    break
                if attempt < self.settings.openrouter_max_retries:
                    time.sleep(0.5 * (2**attempt))

        raise OpenRouterUnavailableError(str(last_error) if last_error else "OpenRouter request failed")

    def transcribe_audio(self, audio_bytes: bytes, mime_type: str) -> str:
        # OpenRouter does not currently support audio parts for transcriptions in the same way Google Gemini does.
        # It requires text-only inputs or image URLs for vision models.
        # If whisper integration is needed, standard OpenAI API should be used.
        raise OpenRouterUnavailableError(
            "Audio transcription is not supported via OpenRouter text models. "
            "Please use a standard OpenAI API key with Whisper for transcription."
        )

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
                    INSERT INTO openrouter_logs
                    (prompt_type, success, latency_ms, response_preview, error, created_at)
                    VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
                    """,
                    (prompt_type, int(success), latency_ms, response_text[:1000], error),
                )
        except Exception as exc:
            logger.debug("Failed to persist OpenRouter log: %s", exc)
