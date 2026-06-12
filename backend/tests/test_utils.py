from app.services.triage_service import TriageService
from app.utils.distance import haversine_km
from app.utils.json_utils import extract_json_object


def test_haversine_distance():
    distance = haversine_km(12.9716, 77.5946, 12.9716, 77.5946)
    assert distance == 0


def test_extract_json_from_markdown():
    payload = extract_json_object('```json\n{"ok": true}\n```')
    assert payload == {"ok": True}


def test_triage_rules():
    result = TriageService().classify("patient has chest pain")
    assert result.emergency == "Heart Attack"
    assert result.severity.value == "Critical"
    assert result.score == 95

