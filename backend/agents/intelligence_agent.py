import os
from typing import Dict, Any, Optional
from .base import BaseAgent
from leads.models import Lead, CallSession, ConversationIntelligence, SystemSetting
from providers.llm.gemini_provider import GeminiProvider
from providers.llm.groq_provider import GroqProvider
from providers.llm.openai_provider import OpenAIProvider
from providers.llm.mock_llm import MockLLMProvider


class IntelligenceAgent(BaseAgent):
    """
    Agent 4 — Conversation Intelligence Agent
    Parses call transcripts to extract structured business requirements, goals,
    pain points, budget signals, timeline, objections, and buying intent using Google Gemini.
    """

    def __init__(self):
        super().__init__(name="IntelligenceAgent")

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

    def extract_intelligence(self, call_session: CallSession) -> ConversationIntelligence:
        """
        Analyze all turns of a completed call session and persist structured intelligence.
        """
        lead = call_session.lead
        turns = [
            {"speaker": t.speaker, "text": t.text, "turn_index": t.turn_index}
            for t in call_session.transcript_turns.all().order_by('turn_index')
        ]

        lead_profile = {
            "lead_id": lead.lead_id,
            "business_name": lead.business_name,
            "category": lead.category,
            "contact_person": lead.contact_person,
            "city": lead.city,
            "rating": lead.rating,
            "review_count": lead.review_count,
            "website_status": lead.website_status,
        }

        llm = self._get_llm_provider()
        intel_data = llm.extract_conversation_intelligence(lead_profile, turns)

        # Extract queries from call_session if already gathered
        collected_queries = call_session.collected_queries or []
        if not collected_queries and intel_data.get("collected_queries"):
            collected_queries = intel_data.get("collected_queries")

        # Map buying intent to interest status
        buying_intent = intel_data.get("buying_intent", "medium")
        if buying_intent == "high":
            interest_status = "interested_hot"
        elif buying_intent == "low":
            interest_status = "not_interested"
        else:
            interest_status = "interested_warm"

        # Generate custom sales pitch hook addressing their specific queries
        queries_summary = ", ".join([q.get("query", "") for q in collected_queries]) if collected_queries else "direct digital inquiries"
        pitch_hook = (
            f"Hello {lead.contact_person or 'there'}, following our call regarding {lead.business_name}: "
            f"Here is the customized 1-page solution addressing your questions on {queries_summary}. "
            f"We can launch your verified Google Maps presence and 1-tap WhatsApp booking button within 3-5 days."
        )

        defaults = {
            "call_session": call_session,
            "summary": intel_data.get("summary", ""),
            "interest_status": intel_data.get("interest_status", interest_status),
            "collected_queries": collected_queries,
            "action_items": intel_data.get("action_items", [
                f"Send tailored WhatsApp 1-page proposal for {lead.business_name}",
                "Follow up via phone within 24-48 hours to confirm review"
            ]),
            "next_sales_pitch_hook": pitch_hook,
            "pain_points": intel_data.get("pain_points", []),
            "goals": intel_data.get("goals", []),
            "requirements": intel_data.get("requirements", []),
            "current_process_and_tools": intel_data.get("current_process_and_tools", ""),
            "stated_website_presence": intel_data.get("stated_website_presence", ""),
            "desired_solution": intel_data.get("desired_solution", ""),
            "budget_signal": intel_data.get("budget_signal", "medium"),
            "budget_amount": intel_data.get("budget_amount", ""),
            "timeline": intel_data.get("timeline", "Immediate"),
            "decision_maker_status": intel_data.get("decision_maker_status", ""),
            "objections": intel_data.get("objections", []),
            "buying_intent": buying_intent,
            "customer_quotes": intel_data.get("customer_quotes", []),
            "confidence_score": intel_data.get("confidence_score", 0.90)
        }

        intel = ConversationIntelligence.objects.filter(lead=lead).first()
        if intel:
            for key, val in defaults.items():
                setattr(intel, key, val)
            intel.save()
        else:
            intel = ConversationIntelligence.objects.create(lead=lead, **defaults)

        self.log_event(
            event_type="INTELLIGENCE_EXTRACTED",
            description=f"Extracted conversation intelligence for '{lead.business_name}': Status={intel.interest_status}, Queries Captured={len(collected_queries)}",
            lead=lead,
            payload={
                "interest_status": intel.interest_status,
                "buying_intent": intel.buying_intent,
                "collected_queries_count": len(collected_queries),
                "llm": llm.__class__.__name__
            }
        )

        return intel
