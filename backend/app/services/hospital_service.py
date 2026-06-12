import httpx

from app.config.settings import get_settings
from app.schemas.hospital import HospitalResponse
from app.utils.distance import haversine_km


class HospitalService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def nearby(self, lat: float, lng: float) -> list[HospitalResponse]:
        query = self._build_overpass_query(lat, lng)
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(self.settings.overpass_url, data={"data": query})
            response.raise_for_status()
        elements = response.json().get("elements", [])
        hospitals: list[HospitalResponse] = []
        for element in elements:
            point_lat = element.get("lat") or element.get("center", {}).get("lat")
            point_lng = element.get("lon") or element.get("center", {}).get("lon")
            if point_lat is None or point_lng is None:
                continue
            tags = element.get("tags", {})
            name = tags.get("name") or tags.get("operator") or "Hospital"
            distance_km = round(haversine_km(lat, lng, float(point_lat), float(point_lng)), 2)
            hospitals.append(
                HospitalResponse(
                    name=name,
                    distance=f"{distance_km:.1f} km",
                    distanceKm=distance_km,
                    lat=float(point_lat),
                    lng=float(point_lng),
                )
            )

        hospitals.sort(key=lambda hospital: hospital.distance_km)
        return hospitals[: self.settings.hospital_result_limit]

    def _build_overpass_query(self, lat: float, lng: float) -> str:
        radius = self.settings.hospital_search_radius_meters
        return f"""
        [out:json][timeout:15];
        (
          node["amenity"="hospital"](around:{radius},{lat},{lng});
          way["amenity"="hospital"](around:{radius},{lat},{lng});
          relation["amenity"="hospital"](around:{radius},{lat},{lng});
          node["healthcare"="hospital"](around:{radius},{lat},{lng});
          way["healthcare"="hospital"](around:{radius},{lat},{lng});
          relation["healthcare"="hospital"](around:{radius},{lat},{lng});
        );
        out center tags;
        """.strip()

