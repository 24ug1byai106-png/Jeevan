from io import BytesIO


def test_voice_transcribe_accepts_text_file_adapter(client):
    response = client.post(
        "/api/voice/transcribe",
        files={"file": ("sample.txt", BytesIO(b"snake bite"), "text/plain")},
    )
    assert response.status_code == 200
    assert response.json() == {"transcript": "snake bite"}

