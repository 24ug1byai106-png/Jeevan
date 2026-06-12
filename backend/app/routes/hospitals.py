import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.hospital import HospitalResponse
from app.services.hospital_service import HospitalService

logger = logging.getLogger("app.hospitals")
router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


@router.get("/nearby", response_model=list[HospitalResponse], summary="Find nearby hospitals")
async def nearby_hospitals(
    lat: float = Query(..., ge=-90, le=90, examples=[12.9716]),
    lng: float = Query(..., ge=-180, le=180, examples=[77.5946]),
) -> list[HospitalResponse]:
    try:
        return await HospitalService().nearby(lat, lng)
    except httpx.HTTPError as exc:
        logger.exception("Overpass hospital lookup failed")
        raise HTTPException(status_code=503, detail="Hospital lookup is temporarily unavailable") from exc

