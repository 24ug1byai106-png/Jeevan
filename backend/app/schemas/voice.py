from pydantic import BaseModel, ConfigDict, Field


class VoiceTranscriptionResponse(BaseModel):
    transcript: str = Field(..., examples=["snake bite"])

    model_config = ConfigDict(json_schema_extra={"example": {"transcript": "snake bite"}})

