import os
import json
import requests
from typing import Dict, List, Any, Optional
from ..base import LLMProviderBase
from .mock_llm import MockLLMProvider


class GroqProvider(LLMProviderBase):
    """
    100% REAL & FREE AI Inference Provider using Groq Cloud Free API
    (Powered by Meta Llama 3.3 70B / Llama 3.1 8B).
    """

    GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: Optional[str] = None, model: str = "llama-3.3-70b-versatile"):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        self.model = model
        self.fallback = MockLLMProvider()

    def _call_groq(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }
        try:
            res = requests.post(self.GROQ_URL, json=payload, headers=headers, timeout=12)
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception:
            pass
        return None

    def parse_intent(self, query: str) -> Dict[str, Any]:
        system = "You are an AI lead search intent parser. Return JSON with keys: category, location, radius_km, website_filter, target_attributes."
        user = f"Parse: '{query}'"
        res = self._call_groq(system, user)
        return res if res else self.fallback.parse_intent(query)

    def extract_conversation_intelligence(self, lead_profile: Dict[str, Any], transcript_turns: List[Dict[str, Any]]) -> Dict[str, Any]:
        system = "You are a sales conversation intelligence analyst. Return JSON with keys: summary, pain_points, goals, requirements, current_process_and_tools, stated_website_presence, desired_solution, budget_signal, budget_amount, timeline, decision_maker_status, objections, buying_intent, customer_quotes, confidence_score."
        user = f"Lead: {json.dumps(lead_profile)}\nTranscript: {json.dumps(transcript_turns)}"
        res = self._call_groq(system, user)
        return res if res else self.fallback.extract_conversation_intelligence(lead_profile, transcript_turns)

    def generate_strategy(self, lead_profile: Dict[str, Any], intelligence: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        system = "You are a B2B sales strategist. Return JSON with keys: problem_statement, evidence_online, evidence_call, opportunity, recommended_solutions, fit_rationale, offer_packages, pricing_guidance, pitch_script, objections_and_responses, lead_score, score_reasoning, next_action, follow_up_date."
        user = f"Lead: {json.dumps(lead_profile)}\nIntelligence: {json.dumps(intelligence or {})}"
        res = self._call_groq(system, user)
        return res if res else self.fallback.generate_strategy(lead_profile, intelligence)

    def generate_call_turn(
        self,
        lead_profile: Dict[str, Any],
        history: List[Dict[str, Any]],
        user_speech: str,
        agent_persona: Optional[str] = None,
        call_goal: Optional[str] = None
    ) -> Dict[str, Any]:
        system = "You are a natural B2B sales voice consultant. Keep spoken responses concise (1-3 sentences). Return JSON with keys: agent_response, action, sentiment, interest_status, extracted_queries, stage."
        user = f"Lead: {json.dumps(lead_profile)}\nHistory: {json.dumps(history)}\nUser Speech: {user_speech}"
        res = self._call_groq(system, user)
        return res if (res and isinstance(res, dict) and "agent_response" in res) else self.fallback.generate_call_turn(
            lead_profile, history, user_speech, agent_persona, call_goal
        )

    def simulate_autonomous_call(
        self,
        lead_profile: Dict[str, Any],
        agent_persona: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        return self.fallback.simulate_autonomous_call(lead_profile, agent_persona)
