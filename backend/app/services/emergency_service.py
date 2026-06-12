from app.cache.response_cache import ResponseCache, build_cache_key
from app.prompts.emergency_prompt import build_emergency_prompt, build_sos_action
from app.schemas.common import DISCLAIMER, Language, Severity
from app.schemas.emergency import EmergencyAnalysisResponse, SOSResponse
from app.services.gemini_service import GeminiService, GeminiUnavailableError
from app.services.offline_knowledge_service import OfflineKnowledgeService
from app.services.translation_service import TranslationService
from app.services.triage_service import TriageService


class EmergencyService:
    def __init__(self) -> None:
        self.translation_service = TranslationService()
        self.triage_service = TriageService()
        self.gemini_service = GeminiService()
        self.offline_service = OfflineKnowledgeService()
        self.cache = ResponseCache()

    def analyze(self, message: str, language: Language) -> EmergencyAnalysisResponse:
        prompt_language = self.translation_service.prompt_language(language)
        cache_key = build_cache_key("emergency_analyze", {"message": message, "language": prompt_language})
        cached = self.cache.get(cache_key)
        if cached:
            cached["source"] = "response_cache"
            return EmergencyAnalysisResponse.model_validate(cached)

        prompt = build_emergency_prompt(message, prompt_language)
        try:
            response = self.gemini_service.generate_json(prompt, EmergencyAnalysisResponse, "emergency_analyze")
            response = self._enforce_guardrails(message, response)
        except GeminiUnavailableError:
            response = self.offline_service.get_guide(message, language)

        self.cache.set(cache_key, response.model_dump(by_alias=True))
        return response

    def sos(self, message: str) -> SOSResponse:
        triage = self.triage_service.classify(message)
        guide = self.offline_service.get_guide(message, Language.english)
        severity = self._max_severity(guide.severity, triage.severity)
        score = max(guide.severity_score, triage.score)
        return SOSResponse(
            emergency=triage.emergency if triage.emergency != "General Emergency" else guide.emergency,
            severity=severity,
            severityScore=score,
            action=build_sos_action(triage.emergency),
            hospitalRequired=True,
            disclaimer=DISCLAIMER,
        )

    def _enforce_guardrails(self, message: str, response: EmergencyAnalysisResponse) -> EmergencyAnalysisResponse:
        triage = self.triage_service.classify(f"{message} {response.emergency}")
        severity = self._max_severity(response.severity, triage.severity)
        score = max(response.severity_score, triage.score)
        hospital_required = response.hospital_required or triage.hospital_required
        return response.model_copy(
            update={
                "severity": severity,
                "severity_score": score,
                "hospital_required": hospital_required,
                "disclaimer": DISCLAIMER,
                "source": response.source or "gemini",
            }
        )

    @staticmethod
    def _max_severity(left: Severity, right: Severity) -> Severity:
        order = {
            Severity.low: 1,
            Severity.medium: 2,
            Severity.high: 3,
            Severity.critical: 4,
        }
        return left if order[left] >= order[right] else right

