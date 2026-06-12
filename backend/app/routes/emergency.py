from fastapi import APIRouter

from app.schemas.emergency import EmergencyAnalysisResponse, EmergencyAnalyzeRequest, SOSRequest, SOSResponse
from app.services.emergency_service import EmergencyService

router = APIRouter(prefix="/api/emergency", tags=["emergency"])


@router.post(
    "/analyze",
    response_model=EmergencyAnalysisResponse,
    summary="Analyze an emergency message",
)
def analyze_emergency(payload: EmergencyAnalyzeRequest) -> EmergencyAnalysisResponse:
    return EmergencyService().analyze(payload.message, payload.language)


@router.post("/sos", response_model=SOSResponse, summary="Create a concise SOS emergency card")
def sos(payload: SOSRequest) -> SOSResponse:
    return EmergencyService().sos(payload.message)

