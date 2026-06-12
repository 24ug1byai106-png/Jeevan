from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import DISCLAIMER, Language, Severity


class AshaAssistRequest(BaseModel):
    patient_age: int = Field(..., alias="patientAge", ge=0, le=120, examples=[55])
    symptoms: str = Field(..., min_length=2, max_length=2000, examples=["chest pain"])
    language: Language = Field(default=Language.hindi, examples=["Hindi"])

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {"patientAge": 55, "symptoms": "chest pain", "language": "Hindi"}
        },
    )


class AshaAssistResponse(BaseModel):
    emergency: str
    severity: Severity
    severity_score: int = Field(..., alias="severityScore", ge=0, le=100)
    instructions: list[str]
    red_flags: list[str] = Field(..., alias="redFlags")
    referral_required: bool = Field(..., alias="referralRequired")
    message_for_family: str = Field(..., alias="messageForFamily")
    disclaimer: str = DISCLAIMER
    source: str = "gemini"

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "emergency": "Heart Attack",
                "severity": "Critical",
                "severityScore": 95,
                "instructions": [
                    "रोगी को आराम से बैठाएं या लिटाएं।",
                    "तुरंत एम्बुलेंस बुलाएं।",
                    "सांस और होश की निगरानी करें।",
                ],
                "redFlags": ["बेहोशी", "तेज सीने का दर्द", "सांस लेने में कठिनाई"],
                "referralRequired": True,
                "messageForFamily": "तुरंत अस्पताल ले जाएं और देरी न करें।",
                "disclaimer": DISCLAIMER,
                "source": "gemini",
            }
        },
    )

