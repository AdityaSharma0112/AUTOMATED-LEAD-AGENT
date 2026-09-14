import os
from typing import Dict, Any, Optional
from .base import BaseAgent
from leads.models import Lead, Strategy, SystemSetting
from providers.llm.gemini_provider import GeminiProvider
from providers.llm.groq_provider import GroqProvider
from providers.llm.openai_provider import OpenAIProvider
from providers.llm.mock_llm import MockLLMProvider
from .lead_scorer import LeadScoringEngine


class StrategyAgent(BaseAgent):
    """
    Agent 5 — Strategy Agent
    Synthesizes research + call intelligence to formulate a solution-first sales strategy,
    prioritized feature roadmap, tailored packages, pricing guidance, pitch script, and next action.
    """

    def __init__(self):
        super().__init__(name="StrategyAgent")
        self.scorer = LeadScoringEngine()

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

    def generate_strategy(self, lead: Lead) -> Strategy:
        """
        Generate or regenerate tailored sales strategy for the lead.
        """
        lead_profile = {
            "lead_id": lead.lead_id,
            "business_name": lead.business_name,
            "category": lead.category,
            "contact_person": lead.contact_person,
            "city": lead.city,
            "locality": lead.locality,
            "address": lead.address,
            "rating": lead.rating,
            "review_count": lead.review_count,
            "website_status": lead.website_status,
            "services": lead.services,
        }

        # Collect intelligence if available
        intel_data = {}
        if hasattr(lead, 'intelligence'):
            intel = lead.intelligence
            intel_data = {
                "summary": intel.summary,
                "pain_points": intel.pain_points,
                "goals": intel.goals,
                "requirements": intel.requirements,
                "current_process_and_tools": intel.current_process_and_tools,
                "stated_website_presence": intel.stated_website_presence,
                "desired_solution": intel.desired_solution,
                "budget_signal": intel.budget_signal,
                "budget_amount": intel.budget_amount,
                "timeline": intel.timeline,
                "decision_maker_status": intel.decision_maker_status,
                "objections": intel.objections,
                "buying_intent": intel.buying_intent,
                "customer_quotes": intel.customer_quotes,
            }

        llm = self._get_llm_provider()
        strat_data = llm.generate_strategy(lead_profile, intel_data)

        # Update Lead Score
        computed_score = self.scorer.update_lead_score(lead)

        defaults = {
            "problem_statement": strat_data.get("problem_statement", ""),
            "evidence_online": strat_data.get("evidence_online", ""),
            "evidence_call": strat_data.get("evidence_call", ""),
            "opportunity": strat_data.get("opportunity", ""),
            "recommended_solutions": strat_data.get("recommended_solutions", []),
            "fit_rationale": strat_data.get("fit_rationale", ""),
            "offer_packages": strat_data.get("offer_packages", []),
            "pricing_guidance": strat_data.get("pricing_guidance", ""),
            "pitch_script": strat_data.get("pitch_script", ""),
            "objections_and_responses": strat_data.get("objections_and_responses", []),
            "lead_score": computed_score,
            "score_reasoning": strat_data.get("score_reasoning", ""),
            "next_action": strat_data.get("next_action", "Follow up with client."),
            "follow_up_date": strat_data.get("follow_up_date", "Within 48 hours")
        }

        # Safe update without select_for_update table locks
        strategy = Strategy.objects.filter(lead=lead).first()
        if strategy:
            for key, val in defaults.items():
                setattr(strategy, key, val)
            strategy.save()
        else:
            strategy = Strategy.objects.create(lead=lead, **defaults)

        self.log_event(
            event_type="STRATEGY_GENERATED",
            description=f"Generated tailored sales strategy using {llm.__class__.__name__} for '{lead.business_name}' (Score: {computed_score}/100)",
            lead=lead,
            payload={"lead_score": computed_score, "next_action": strategy.next_action, "llm": llm.__class__.__name__}
        )

        return strategy

    def refine_strategy_with_ai(self, lead: Lead, user_instruction: str) -> Strategy:
        """
        Refine the existing sales strategy and action plan based on explicit user prompt/feedback using Gemini.
        """
        lead_profile = {
            "lead_id": lead.lead_id,
            "business_name": lead.business_name,
            "category": lead.category,
            "contact_person": lead.contact_person,
            "city": lead.city,
            "locality": lead.locality,
            "rating": lead.rating,
            "website_status": lead.website_status,
        }
        intel_data = {}
        if hasattr(lead, 'intelligence'):
            intel = lead.intelligence
            intel_data = {
                "summary": intel.summary,
                "pain_points": intel.pain_points,
                "goals": intel.goals,
                "requirements": intel.requirements,
                "desired_solution": intel.desired_solution,
                "customer_quotes": intel.customer_quotes,
                "collected_queries": intel.collected_queries,
            }

        strategy = Strategy.objects.filter(lead=lead).first()
        current_strategy = {}
        if strategy:
            current_strategy = {
                "problem_statement": strategy.problem_statement,
                "opportunity": strategy.opportunity,
                "recommended_solutions": strategy.recommended_solutions,
                "offer_packages": strategy.offer_packages,
                "pricing_guidance": strategy.pricing_guidance,
                "pitch_script": strategy.pitch_script,
                "objections_and_responses": strategy.objections_and_responses,
                "next_action": strategy.next_action,
                "follow_up_date": strategy.follow_up_date,
            }

        llm = self._get_llm_provider()
        refined_data = llm.refine_strategy_with_ai(lead_profile, intel_data, current_strategy, user_instruction)

        if strategy:
            for key, val in refined_data.items():
                if hasattr(strategy, key):
                    setattr(strategy, key, val)
            strategy.save()
        else:
            strategy = Strategy.objects.create(lead=lead, **refined_data)

        self.log_event(
            event_type="STRATEGY_REFINED",
            description=f"Refined next step plan for '{lead.business_name}' using AI instruction: \"{user_instruction[:80]}\"",
            lead=lead
        )
        return strategy
