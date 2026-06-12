from app.cache.response_cache import ResponseCache, build_cache_key
from app.prompts.asha_prompt import build_asha_prompt
from app.schemas.asha import AshaAssistResponse
from app.schemas.common import DISCLAIMER, Language
from app.services.openrouter_service import OpenRouterService, OpenRouterUnavailableError
from app.services.offline_knowledge_service import OfflineKnowledgeService
from app.services.translation_service import TranslationService
from app.services.triage_service import TriageService


class AshaService:
    def __init__(self) -> None:
        self.translation_service = TranslationService()
        self.triage_service = TriageService()
        self.openrouter_service = OpenRouterService()
        self.offline_service = OfflineKnowledgeService()
        self.cache = ResponseCache()

    def assist(self, patient_age: int, symptoms: str, language: Language) -> AshaAssistResponse:
        prompt_language = self.translation_service.prompt_language(language)
        cache_key = build_cache_key(
            "asha_assist",
            {"patientAge": patient_age, "symptoms": symptoms, "language": prompt_language},
        )
        cached = self.cache.get(cache_key)
        if cached:
            cached["source"] = "response_cache"
            return AshaAssistResponse.model_validate(cached)

        prompt = build_asha_prompt(patient_age, symptoms, prompt_language)
        try:
            response = self.openrouter_service.generate_json(prompt, AshaAssistResponse, "asha_assist")
            response = response.model_copy(update={"disclaimer": DISCLAIMER})
        except OpenRouterUnavailableError:
            response = self._offline_assist(patient_age, symptoms, language)

        self.cache.set(cache_key, response.model_dump(by_alias=True))
        return response

    def _offline_assist(self, patient_age: int, symptoms: str, language: Language) -> AshaAssistResponse:
        guide = self.offline_service.get_guide(symptoms, language)
        triage = self.triage_service.classify(symptoms)
        family_messages = {
            Language.english: "Please arrange urgent transport to a hospital and keep the patient calm.",
            Language.hindi: "कृपया तुरंत अस्पताल ले जाने की व्यवस्था करें और रोगी को शांत रखें।",
            Language.kannada: "ದಯವಿಟ್ಟು ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಸಾಗಿಸಲು ವ್ಯವಸ್ಥೆ ಮಾಡಿ ಮತ್ತು ರೋಗಿಯನ್ನು ಶಾಂತವಾಗಿರಿಸಿ.",
            Language.tamil: "உடனே மருத்துவமனைக்கு செல்ல ஏற்பாடு செய்து நோயாளியை அமைதியாக வைத்திருங்கள்.",
        }
        red_flags = {
            Language.english: ["Unconsciousness", "Breathing difficulty", "Worsening pain or weakness"],
            Language.hindi: ["बेहोशी", "सांस लेने में कठिनाई", "दर्द या कमजोरी बढ़ना"],
            Language.kannada: ["ಪ್ರಜ್ಞೆ ತಪ್ಪುವುದು", "ಉಸಿರಾಟದ ತೊಂದರೆ", "ನೋವು ಅಥವಾ ದೌರ್ಬಲ್ಯ ಹೆಚ್ಚಾಗುವುದು"],
            Language.tamil: ["மயக்கம்", "மூச்சுத் திணறல்", "வலி அல்லது பலவீனம் அதிகரித்தல்"],
        }
        return AshaAssistResponse(
            emergency=guide.emergency,
            severity=guide.severity if guide.severity.value != "Medium" else triage.severity,
            severityScore=max(guide.severity_score, triage.score),
            instructions=guide.first_aid[:5],
            redFlags=red_flags[language],
            referralRequired=guide.hospital_required,
            messageForFamily=family_messages[language],
            disclaimer=DISCLAIMER,
            source="offline_cache",
        )

