from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DISCLAIMER, Language, Severity


class AshaAssistRequest(BaseModel):
    patient_age: int = Field(..., alias="patientAge", ge=0, le=120, examples=[55])
    symptoms: str = Field(..., min_length=10, max_length=2000, examples=["chest pain"])
    language: Language = Field(default=Language.hindi, examples=["Hindi"])

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {"patientAge": 55, "symptoms": "chest pain", "language": "Hindi"}
        },
    )


class AshaAssistResponse(BaseModel):
    condition: str
    severity: Severity
    severity_score: int = Field(..., alias="severityScore", ge=0, le=100)
    confidence: str
    immediate_risk: str = Field(..., alias="immediateRisk")
    first_aid: list[str] = Field(..., alias="firstAid")
    avoid: list[str]
    hospital_required: bool = Field(..., alias="hospitalRequired")
    nearest_facility: str = Field(..., alias="nearestFacility")
    referral_recommendation: str = Field(..., alias="referralRecommendation")
    message_for_family: str = Field(..., alias="messageForFamily")
    disclaimer: str = DISCLAIMER
    source: str = "openrouter"

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "condition": "Heat Stroke",
                "severity": "Critical",
                "severityScore": 95,
                "confidence": "92%",
                "immediateRisk": "Patient may become unconscious if untreated.",
                "firstAid": [
                    "Move patient to shade immediately",
                    "Give cool water slowly",
                    "Remove excess clothing",
                    "Cool body with wet cloth"
                ],
                "avoid": [
                    "Do not leave patient in direct sunlight",
                    "Do not force large amounts of water quickly"
                ],
                "hospitalRequired": True,
                "nearestFacility": "District Hospital 4.2 km away",
                "referralRecommendation": "Urgent transport recommended within 30 minutes.",
                "messageForFamily": "तुरंत अस्पताल ले जाएं और देरी न करें।",
                "disclaimer": DISCLAIMER,
                "source": "openrouter",
            }
        },
    )

