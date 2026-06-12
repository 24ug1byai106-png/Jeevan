import re
from dataclasses import dataclass

from app.schemas.common import Severity


@dataclass(frozen=True)
class TriageResult:
    emergency: str
    severity: Severity
    score: int
    hospital_required: bool


class TriageService:
    def classify(self, text: str) -> TriageResult:
        normalized = text.lower()

        if self._has(normalized, "heart attack", "chest pain", "cardiac", "heart pain"):
            return TriageResult("Heart Attack", Severity.critical, 95, True)
        if self._has(normalized, "unconscious", "not waking", "fainted and not waking"):
            return TriageResult("Unconscious Patient", Severity.critical, 95, True)
        if self._has(normalized, "snake", "snakebite", "snake bite"):
            return TriageResult("Snake Bite", Severity.high, 80, True)
        if self._has(normalized, "electric", "shock", "electrocution"):
            return TriageResult("Electric Shock", Severity.high, 85, True)
        if self._has(normalized, "drowning", "water inhaled", "near drowning"):
            return TriageResult("Drowning", Severity.critical, 95, True)
        if self._has(normalized, "heat stroke", "heatstroke", "very hot", "confusion in heat"):
            return TriageResult("Heat Stroke", Severity.high, 85, True)
        if self._has(normalized, "burn", "burns", "fire burn", "scald"):
            if self._has(normalized, "face", "large", "deep", "child", "electric", "chemical"):
                return TriageResult("Burns", Severity.high, 80, True)
            return TriageResult("Burns", Severity.medium, 55, True)
        if self._has(normalized, "fracture", "broken bone", "bone broken"):
            return TriageResult("Fracture", Severity.medium, 55, True)

        return TriageResult("General Emergency", Severity.medium, 50, True)

    @staticmethod
    def _has(text: str, *terms: str) -> bool:
        return any(re.search(rf"\b{re.escape(term)}\b", text) for term in terms)

    @staticmethod
    def severity_score(severity: Severity) -> int:
        return {
            Severity.low: 25,
            Severity.medium: 50,
            Severity.high: 80,
            Severity.critical: 95,
        }[severity]

