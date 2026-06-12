from fastapi import APIRouter

from app.schemas.asha import AshaAssistRequest, AshaAssistResponse
from app.services.asha_service import AshaService

router = APIRouter(prefix="/api/asha", tags=["asha"])


@router.post("/assist", response_model=AshaAssistResponse, summary="ASHA worker emergency assistance")
def asha_assist(payload: AshaAssistRequest) -> AshaAssistResponse:
    return AshaService().assist(payload.patient_age, payload.symptoms, payload.language)

