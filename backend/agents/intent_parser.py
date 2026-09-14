import os
from typing import Dict, Any
from .base import BaseAgent
from providers.llm.gemini_provider import GeminiProvider
from providers.llm.groq_provider import GroqProvider
from providers.llm.openai_provider import OpenAIProvider
from providers.llm.mock_llm import MockLLMProvider
from leads.models import SearchJob, SystemSetting


class IntentParserAgent(BaseAgent):
    """
    Agent 0 — Intent Parser
    Interprets natural language queries into structured search criteria using Google Gemini / Groq / OpenAI.
    """

    def __init__(self):
        super().__init__(name="IntentParserAgent")

    def _get_llm_provider(self):
        try:
            setting = SystemSetting.objects.filter(key="llm_provider").first()
            provider_type = setting.value.get("provider", "gemini") if setting else "gemini"
            gemini_key = setting.value.get("gemini_api_key") or os.getenv("GEMINI_API_KEY", "") if setting else os.getenv("GEMINI_API_KEY", "")
            groq_key = setting.value.get("groq_api_key") or os.getenv("GROQ_API_KEY", "") if setting else os.getenv("GROQ_API_KEY", "")
            openai_key = setting.value.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "") if setting else os.getenv("OPENAI_API_KEY", "")
        except Exception:
            provider_type = "gemini"
            gemini_key = os.getenv("GEMINI_API_KEY", "")
            groq_key = os.getenv("GROQ_API_KEY", "")
            openai_key = os.getenv("OPENAI_API_KEY", "")

        if provider_type == "gemini" or gemini_key:
            return GeminiProvider(api_key=gemini_key)
        elif provider_type == "groq" or groq_key:
            return GroqProvider(api_key=groq_key)
        elif provider_type == "openai" or openai_key:
            return OpenAIProvider(api_key=openai_key)
        return MockLLMProvider()

    def parse(self, query: str, search_job: SearchJob = None) -> Dict[str, Any]:
        """Parse natural language query into structured criteria."""
        llm = self._get_llm_provider()
        intent = llm.parse_intent(query)

        self.log_event(
            event_type="INTENT_PARSED",
            description=f"Parsed query using {llm.__class__.__name__} into Category='{intent.get('category')}', Location='{intent.get('location')}', Radius={intent.get('radius_km')}km, Filter='{intent.get('website_filter')}'",
            search_job=search_job,
            payload={"query": query, "parsed_intent": intent, "llm": llm.__class__.__name__}
        )

        return intent
