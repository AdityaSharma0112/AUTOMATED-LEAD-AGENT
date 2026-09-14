import os
import json
from typing import Dict, List, Any, Optional
from ..base import LLMProviderBase
from .mock_llm import MockLLMProvider


class OpenAIProvider(LLMProviderBase):
    """OpenAI GPT-4o / GPT-4o-mini provider with fallback to MockLLMProvider."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.model = model
        self.fallback = MockLLMProvider()

    def _call_openai(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception:
            return None

    def parse_intent(self, query: str) -> Dict[str, Any]:
        system = "You are an expert search intent parser for lead generation. Return JSON with keys: category, location, radius_km, website_filter, target_attributes."
        user = f"Parse this request into structured lead search criteria: '{query}'"
        result = self._call_openai(system, user)
        return result if result else self.fallback.parse_intent(query)

    def extract_conversation_intelligence(self, lead_profile: Dict[str, Any], transcript_turns: List[Dict[str, Any]]) -> Dict[str, Any]:
        system = "You are a sales intelligence analyst. Analyze the call transcript and extract structured insights in JSON: summary, pain_points, goals, requirements, current_process_and_tools, stated_website_presence, desired_solution, budget_signal, budget_amount, timeline, decision_maker_status, objections, buying_intent, customer_quotes, confidence_score."
        user = f"Lead Profile: {json.dumps(lead_profile)}\nTranscript: {json.dumps(transcript_turns)}"
        result = self._call_openai(system, user)
        return result if result else self.fallback.extract_conversation_intelligence(lead_profile, transcript_turns)

    def generate_strategy(self, lead_profile: Dict[str, Any], intelligence: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        system = "You are a high-level B2B sales strategist. Create a comprehensive, tailored solution-first sales strategy in JSON: problem_statement, evidence_online, evidence_call, opportunity, recommended_solutions, fit_rationale, offer_packages, pricing_guidance, pitch_script, objections_and_responses, lead_score, score_reasoning, next_action, follow_up_date."
        user = f"Lead Profile: {json.dumps(lead_profile)}\nCall Intelligence: {json.dumps(intelligence or {})}"
        result = self._call_openai(system, user)
        return result if result else self.fallback.generate_strategy(lead_profile, intelligence)
