import json
from pathlib import Path
from typing import Any

from app.schemas.common import DISCLAIMER, Language, Severity
from app.schemas.emergency import EmergencyAnalysisResponse
from app.services.translation_service import TranslationService
from app.services.triage_service import TriageService


class OfflineKnowledgeService:
    def __init__(self) -> None:
        self.translation_service = TranslationService()
        self.triage_service = TriageService()
        self.knowledge_path = Path(__file__).resolve().parents[1] / "cache" / "offline_knowledge.json"
        self.custom_path = Path(__file__).resolve().parents[1] / "cache" / "offline_knowledge_custom.json"
        self._knowledge = self._load()

    def _load(self) -> dict[str, Any]:
        with self.knowledge_path.open("r", encoding="utf-8") as handle:
            base = json.load(handle)
        if self.custom_path.exists():
            with self.custom_path.open("r", encoding="utf-8") as handle:
                custom = json.load(handle)
            base["emergencies"].update(custom.get("emergencies", {}))
        return base

    def get_guide(self, message: str, language: str | Language) -> EmergencyAnalysisResponse:
        normalized_language = self.translation_service.normalize_language(language)
        triage = self.triage_service.classify(message)
        key = self._match_key(triage.emergency)
        entry = self._knowledge["emergencies"].get(key) or self._knowledge["emergencies"]["general_emergency"]
        localized = entry["languages"].get(normalized_language.value) or entry["languages"]["English"]
        severity = Severity(entry.get("severity", triage.severity.value))
        score = int(entry.get("severityScore", self.triage_service.severity_score(severity)))

        return EmergencyAnalysisResponse(
            emergency=localized["emergency"],
            severity=severity,
            severityScore=max(score, triage.score if key != "general_emergency" else score),
            summary=localized["summary"],
            firstAid=localized["firstAid"],
            avoid=localized["avoid"],
            hospitalRequired=bool(entry.get("hospitalRequired", triage.hospital_required)),
            disclaimer=DISCLAIMER,
            source="offline_cache",
        )

    def _match_key(self, emergency: str) -> str:
        slug = emergency.lower().replace(" ", "_")
        if slug in self._knowledge["emergencies"]:
            return slug
        aliases: dict[str, str] = self._knowledge.get("aliases", {})
        return aliases.get(emergency.lower(), "general_emergency")

