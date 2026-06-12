from app.schemas.common import DISCLAIMER


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_emergency_analyze_uses_offline_cache_when_gemini_missing(client):
    response = client.post(
        "/api/emergency/analyze",
        json={"message": "snake bite", "language": "Kannada"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["severity"] == "High"
    assert payload["severityScore"] >= 80
    assert payload["hospitalRequired"] is True
    assert payload["disclaimer"] == DISCLAIMER
    assert payload["source"] in {"offline_cache", "response_cache"}
    assert len(payload["firstAid"]) >= 3


def test_sos_heart_attack_is_critical(client):
    response = client.post("/api/emergency/sos", json={"message": "heart attack"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["emergency"] == "Heart Attack"
    assert payload["severity"] == "Critical"
    assert payload["hospitalRequired"] is True
    assert "ambulance" in payload["action"].lower()


def test_asha_assist_falls_back_to_offline_hindi(client):
    response = client.post(
        "/api/asha/assist",
        json={"patientAge": 55, "symptoms": "chest pain", "language": "Hindi"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["severity"] == "Critical"
    assert payload["referralRequired"] is True
    assert payload["disclaimer"] == DISCLAIMER
    assert len(payload["instructions"]) >= 3

