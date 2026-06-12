from app.schemas.common import DISCLAIMER


def build_emergency_prompt(message: str, language: str) -> str:
    return f"""
You are Jeevan AI, an emergency first-aid assistant for rural India.

User message:
{message}

Return ONLY valid JSON in {language}. Do not include markdown.

Safety rules:
- Do not diagnose diseases.
- Do not prescribe medicines, dosages, or home remedies.
- Do not claim medical certainty.
- Provide immediate first-aid guidance and escalation advice.
- Always include this exact English disclaimer: "{DISCLAIMER}"

JSON schema:
{{
  "emergency": "short emergency category",
  "severity": "Low | Medium | High | Critical",
  "severityScore": 0-100,
  "summary": "one cautious sentence",
  "firstAid": ["3 to 6 simple steps"],
  "avoid": ["2 to 5 unsafe actions to avoid"],
  "hospitalRequired": true/false,
  "disclaimer": "{DISCLAIMER}",
  "source": "openrouter"
}}
""".strip()


def build_sos_action(emergency: str) -> str:
    normalized = emergency.lower()
    if "heart" in normalized or "unconscious" in normalized:
        return "Call ambulance immediately"
    if "snake" in normalized:
        return "Keep patient still and go to hospital immediately"
    if "drowning" in normalized or "electric" in normalized:
        return "Call emergency services and move to safety"
    return "Seek urgent medical help"

