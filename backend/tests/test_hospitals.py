import httpx
import pytest

from app.services.hospital_service import HospitalService


class FakeResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "elements": [
                {
                    "lat": 12.9716,
                    "lon": 77.5946,
                    "tags": {"name": "Nearest Hospital"},
                },
                {
                    "lat": 13.05,
                    "lon": 77.65,
                    "tags": {"name": "Far Hospital"},
                },
            ]
        }


@pytest.mark.asyncio
async def test_hospital_service_sorts_by_distance(monkeypatch):
    async def fake_post(self, url, data):
        return FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    hospitals = await HospitalService().nearby(12.9716, 77.5946)
    assert hospitals[0].name == "Nearest Hospital"
    assert hospitals[0].distance_km == 0.0
    assert hospitals[1].distance_km > hospitals[0].distance_km

