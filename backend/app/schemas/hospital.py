from pydantic import BaseModel, ConfigDict, Field


class HospitalResponse(BaseModel):
    name: str
    distance: str = Field(..., examples=["3.2 km"])
    distance_km: float = Field(..., alias="distanceKm")
    lat: float
    lng: float

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "Government Hospital",
                "distance": "3.2 km",
                "distanceKm": 3.2,
                "lat": 12.9716,
                "lng": 77.5946,
            }
        },
    )

