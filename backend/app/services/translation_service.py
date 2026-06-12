from app.schemas.common import Language


class TranslationService:
    _aliases = {
        "en": Language.english,
        "english": Language.english,
        "hi": Language.hindi,
        "hindi": Language.hindi,
        "kn": Language.kannada,
        "kannada": Language.kannada,
        "ta": Language.tamil,
        "tamil": Language.tamil,
    }

    def normalize_language(self, language: str | Language) -> Language:
        if isinstance(language, Language):
            return language
        normalized = language.strip().lower()
        if normalized not in self._aliases:
            supported = ", ".join(item.value for item in Language)
            raise ValueError(f"Unsupported language '{language}'. Supported languages: {supported}")
        return self._aliases[normalized]

    def prompt_language(self, language: str | Language) -> str:
        return self.normalize_language(language).value

