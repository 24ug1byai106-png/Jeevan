from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DISCLAIMER, Language, Severity


class EmergencyAnalyzeRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=2000, examples=["snake bite"])
    language: Language = Field(default=Language.english, examples=["Kannada"])

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"message": "snake bite", "language": "Kannada"}
        }
    )


class EmergencyAnalysisResponse(BaseModel):
    emergency: str = Field(..., examples=["Snake Bite"])
    severity: Severity = Field(..., examples=["High"])
    severity_score: int = Field(..., ge=0, le=100, alias="severityScore", examples=[80])
    summary: str
    first_aid: list[str] = Field(..., alias="firstAid")
    avoid: list[str]
    hospital_required: bool = Field(..., alias="hospitalRequired")
    disclaimer: str = DISCLAIMER
    source: str = Field(default="gemini", examples=["gemini"])

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "emergency": "Snake Bite",
                "severity": "High",
                "severityScore": 80,
                "summary": "Possible venomous snake bite.",
                "firstAid": [
                    "Keep the person calm and still.",
                    "Immobilize the bitten limb below heart level.",
                    "Go to the nearest hospital immediately.",
                ],
                "avoid": ["Do not cut the wound.", "Do not suck out venom."],
                "hospitalRequired": True,
                "disclaimer": DISCLAIMER,
                "source": "gemini",
            }
        },
    )


class SOSRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000, examples=["heart attack"])

    model_config = ConfigDict(json_schema_extra={"example": {"message": "heart attack"}})


class SOSResponse(BaseModel):
    emergency: str
    severity: Severity
    severity_score: int = Field(..., alias="severityScore", ge=0, le=100)
    action: str
    hospital_required: bool = Field(..., alias="hospitalRequired")
    disclaimer: str = DISCLAIMER

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "emergency": "Heart Attack",
                "severity": "Critical",
                "severityScore": 95,
                "action": "Call ambulance immediately",
                "hospitalRequired": True,
                "disclaimer": DISCLAIMER,
            }
        },
    )

