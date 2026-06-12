import json
from pathlib import Path

from app.models.database import insert_json_log
from app.schemas.common import Language


class KnowledgeIngestionService:
    def __init__(self) -> None:
        self.custom_path = Path(__file__).resolve().parents[1] / "cache" / "offline_knowledge_custom.json"

    def ingest_text(
        self,
        emergency_name: str,
        source: str,
        summary: str,
        first_aid: list[str],
        avoid: list[str],
        severity: str = "Medium",
        severity_score: int = 50,
        hospital_required: bool = True,
    ) -> dict:
        key = emergency_name.lower().replace(" ", "_")
        existing = self._load_existing()
        existing.setdefault("emergencies", {})
        existing["emergencies"][key] = {
            "severity": severity,
            "severityScore": severity_score,
            "hospitalRequired": hospital_required,
            "languages": {
                Language.english.value: {
                    "emergency": emergency_name,
                    "summary": summary,
                    "firstAid": first_aid,
                    "avoid": avoid,
                }
            },
        }
        self.custom_path.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
        insert_json_log(
            "ingestion_documents",
            {
                "emergency_name": emergency_name,
                "source": source,
                "payload": existing["emergencies"][key],
            },
        )
        return existing["emergencies"][key]

    def _load_existing(self) -> dict:
        if not self.custom_path.exists():
            return {"emergencies": {}}
        return json.loads(self.custom_path.read_text(encoding="utf-8"))

