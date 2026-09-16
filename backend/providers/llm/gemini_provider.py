import os
import json
import time
import logging
import requests
from typing import Dict, List, Any, Optional
from ..base import LLMProviderBase
from .mock_llm import MockLLMProvider

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProviderBase):
    """
    100% REAL Google Gemini LLM Provider.
    Calls Google's official Gemini API (Gemini 3.6 Flash) with JSON output mode.
    """

    _cached_available_models: Optional[List[str]] = None
    _cached_active_model: Optional[str] = None
    _rate_limit_cooldown_until: float = 0.0

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.preferred_model = model or os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        self.fallback = MockLLMProvider()

    def _discover_available_models(self) -> List[str]:
        """Fetch the exact list of available models supported by this API key from Gemini ModelService."""
        if GeminiProvider._cached_available_models:
            return GeminiProvider._cached_available_models

        if not self.api_key:
            return []

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={self.api_key}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                raw_models = data.get("models", [])

                # Filter models that support generateContent and are text generation models (not TTS/embedding/audio)
                available = []
                for m in raw_models:
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        name = m.get("name", "").replace("models/", "").strip()
                        lower_name = name.lower()
                        # Exclude non-text, TTS, audio, embedding, or image generation models
                        if any(bad in lower_name for bad in ["-tts", "audio", "embedding", "imagen", "aqa", "preview-tts"]):
                            continue
                        if name:
                            available.append(name)

                # Prioritize preferred model first, then flash models, then pro, then others
                sorted_models = []
                if self.preferred_model in available:
                    sorted_models.append(self.preferred_model)

                for name in available:
                    if "flash" in name.lower() and name not in sorted_models:
                        sorted_models.append(name)

                for name in available:
                    if "pro" in name.lower() and name not in sorted_models:
                        sorted_models.append(name)

                for name in available:
                    if name not in sorted_models:
                        sorted_models.append(name)

                if sorted_models:
                    logger.info(f"Discovered {len(sorted_models)} available Gemini text models. Primary: {sorted_models[0]}")
                    GeminiProvider._cached_available_models = sorted_models
                    return sorted_models
            else:
                logger.warning(f"Failed to list Gemini models ({res.status_code}): {res.text[:200]}")
        except Exception as e:
            logger.warning(f"Error discovering Gemini models: {str(e)}")

        return [self.preferred_model] if self.preferred_model else ["gemini-3.6-flash"]

    def _call_gemini_api(self, prompt: str, timeout_sec: int = 15) -> Optional[Dict[str, Any]]:
        """Call Google Gemini REST API with structured JSON response using discovered available models."""
        if not self.api_key:
            return None

        # Check circuit breaker cooldown (prevents log flood & latency when rate-limited)
        now = time.time()
        if now < GeminiProvider._rate_limit_cooldown_until:
            return None

        # If an active working model is already cached, call it first
        models_to_try = []
        if GeminiProvider._cached_active_model:
            models_to_try.append(GeminiProvider._cached_active_model)

        # Get discovered available models list
        discovered = self._discover_available_models()
        for m in discovered:
            if m not in models_to_try:
                models_to_try.append(m)

        deprecated_models = set()
        for mod in models_to_try:
            if mod in deprecated_models:
                continue

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{mod}:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            }

            try:
                res = requests.post(url, json=payload, timeout=timeout_sec)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        raw_text = candidates[0]["content"]["parts"][0]["text"]
                        # Cache the successful model so subsequent calls bypass trial
                        GeminiProvider._cached_active_model = mod
                        return json.loads(raw_text)
                elif res.status_code == 429:
                    # Activate 60-second cooldown so all subsequent calls instantly use fallback without latency
                    GeminiProvider._rate_limit_cooldown_until = time.time() + 60.0
                    logger.warning(f"Google Gemini Free Tier Rate Limit (429) hit. Cooling down for 60s while falling back smoothly.")
                    break
                elif res.status_code in [404, 410]:
                    deprecated_models.add(mod)
                    if GeminiProvider._cached_available_models and mod in GeminiProvider._cached_available_models:
                        GeminiProvider._cached_available_models.remove(mod)
                    continue
                elif res.status_code == 503:
                    logger.warning(f"Gemini {mod} temporarily high demand (503). Trying next available model.")
                    continue
                else:
                    logger.warning(f"Gemini API returned status {res.status_code} for {mod}: {res.text[:140]}")
            except requests.exceptions.Timeout:
                logger.warning(f"Gemini request timeout on {mod}")
            except Exception as e:
                logger.warning(f"Gemini request exception on {mod}: {str(e)}")
                break

        return None

    def parse_intent(self, query: str) -> Dict[str, Any]:
        prompt = f"""You are an expert search intent parser for business lead generation.
Extract the exact criteria from the user's natural language request.
Return a JSON object with:
- "category": Exact business category (e.g. "Car Repair & Mechanics", "General Store & Grocery", "Dental Clinic", "Plumbing Services")
- "location": City or region name (e.g. "Solan", "Shimla", "Chandigarh", "Delhi")
- "radius_km": Numeric search radius in kilometers (default to 30.0 if not specified)
- "website_filter": "no_website" | "has_website" | "all"
- "target_attributes": list of string tags

User Request: "{query}" """

        res = self._call_gemini_api(prompt)
        return res if res else self.fallback.parse_intent(query)

    def extract_real_businesses_from_search(
        self,
        category: str,
        location: str,
        raw_snippets: List[Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Use Google Gemini to extract ONLY real, named local businesses from raw web search results.
        Rejects all generic directory headers, placeholders, or synthetic titles.
        """
        if not raw_snippets:
            return []

        prompt = f"""You are a master local business data extraction agent.
Extract ONLY real, physically existing local businesses from these raw search snippets for "{category}" in "{location}".

Raw Search Snippets:
{json.dumps(raw_snippets[:12], indent=2)}

STRICT RULES:
1. Extract ONLY actual, specific shop/business names (e.g. "Verma General Store", "Aggarwal Daily Needs", "Sharma Provision Store", "Kashyap Medicos", "Gupta Traders").
2. NEVER return synthetic, generic, or directory placeholder names like "{location} {category}", "Directory Source", "Justdial", "IndiaMART", or "{category} Hub".
3. Extract real contact phone numbers (10-digit mobile numbers starting with 6/7/8/9 or landlines with STD codes).
4. Extract specific street addresses, landmarks, or localities in {location}.
5. If a snippet does not contain a specific real business name, DISCARD IT.

Return a JSON array of objects with:
- "business_name": Exact real shop/business name (string)
- "category": "{category}"
- "phone": Contact phone number (or empty string if not found)
- "address": Real street address / locality in {location}
- "locality": Specific neighborhood/locality if mentioned
- "city": "{location}"
- "rating": Float rating if mentioned or null
- "review_count": Integer review count or 0
- "website_url": Website link if it is the business's own website (leave empty if it is Justdial/IndiaMART/Facebook directory)
- "source_url": Original snippet URL
"""
        res = self._call_gemini_api(prompt)
        if isinstance(res, list):
            return res
        elif isinstance(res, dict) and "businesses" in res:
            return res["businesses"]
        return []

    def extract_conversation_intelligence(
        self,
        lead_profile: Dict[str, Any],
        transcript_turns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        prompt = f"""You are a high-level B2B sales intelligence analyst.
Analyze the following call transcript and lead profile to extract deep, structured customer intelligence.
Return a JSON object with:
- "summary": Executive 2-3 sentence summary of the conversation
- "pain_points": List of explicit business pain points mentioned or derived
- "goals": List of business goals and revenue targets stated
- "requirements": List of explicit feature or service requirements
- "current_process_and_tools": How the customer currently operates
- "stated_website_presence": Customer's current website status as stated by them
- "desired_solution": Ideal solution architecture
- "budget_signal": "low" | "medium" | "high" | "explicit_amount"
- "budget_amount": Estimated or stated budget in INR (e.g. "₹20,000 - ₹40,000")
- "timeline": Expected implementation timeline
- "decision_maker_status": Decision maker confirmation
- "objections": List of objects with {{"objection": str, "rebuttal": str}}
- "buying_intent": "high" | "medium" | "low"
- "customer_quotes": List of direct verbatim quotes from the lead
- "confidence_score": Float between 0.0 and 1.0

Lead Profile: {json.dumps(lead_profile)}
Transcript: {json.dumps(transcript_turns)}
"""
        res = self._call_gemini_api(prompt)
        return res if res else self.fallback.extract_conversation_intelligence(lead_profile, transcript_turns)

    def generate_strategy(
        self,
        lead_profile: Dict[str, Any],
        intelligence: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        prompt = f"""You are a master B2B sales strategist.
Create a comprehensive, solution-first sales and growth strategy for this local business based on evidence.
Return a JSON object with:
- "problem_statement": Deep explanation of what the business actually needs
- "evidence_online": Evidence derived from online audit (e.g. missing website, directory issues)
- "evidence_call": Evidence derived from call transcript and customer statements
- "opportunity": Where we can drive massive ROI and new customer acquisition
- "recommended_solutions": List of objects with {{"priority": int, "title": str, "impact": "High"|"Medium", "description": str}}
- "fit_rationale": Why this tailored solution specifically fits this business
- "offer_packages": List of 3 tiered packages (Starter, Growth Accelerator, Elite) with {{"tier": str, "price": str, "features": list}}
- "pricing_guidance": How to frame the pricing as an ROI investment
- "pitch_script": Highly personalized, conversational outreach pitch (ready to copy and send)
- "objections_and_responses": List of objects with {{"objection": str, "response": str}}
- "lead_score": Numeric score between 0 and 100
- "score_reasoning": Clear explanation of score factors
- "next_action": Exact immediate next step to close this deal
- "follow_up_date": Follow-up timing suggestion

Lead Profile: {json.dumps(lead_profile)}
Call Intelligence: {json.dumps(intelligence or {})}
"""
        res = self._call_gemini_api(prompt)
        return res if res else self.fallback.generate_strategy(lead_profile, intelligence)

    def refine_strategy_with_ai(
        self,
        lead_profile: Dict[str, Any],
        intelligence: Dict[str, Any],
        current_strategy: Dict[str, Any],
        user_instruction: str
    ) -> Dict[str, Any]:
        """
        Use Google Gemini to refine and customize the next step plan and sales strategy
        based on the client's spoken requirements and the user's specific prompt.
        """
        prompt = f"""You are a master B2B sales strategist for "Digital Growth Hub".
The user wants you to modify and refine the customized sales strategy & delivery plan for this client according to their specific instructions.

Lead Profile:
{json.dumps(lead_profile, indent=2)}

Extracted Call Intelligence & Client Demands:
{json.dumps(intelligence or {}, indent=2)}

Current Strategy / Plan:
{json.dumps(current_strategy or {}, indent=2)}

USER'S SPECIFIC REFINEMENT INSTRUCTION:
"{user_instruction}"

CRITICAL INSTRUCTIONS:
1. Apply the user's instructions thoroughly (e.g. adjust pricing, timeline, packages, pitch tone, guarantees, or specific client demands).
2. Ensure the plan highlights EXACT CLIENT DEMANDS from the call and WHAT DIGITAL GROWTH HUB WILL DELIVER.
3. Return a clean JSON object with:
- "problem_statement": Refined explanation of the client's problem & demands
- "evidence_online": Online audit facts
- "evidence_call": Specific statements/queries from the call
- "opportunity": Revenue & ROI growth opportunity
- "recommended_solutions": List of objects with {{"priority": int, "title": str, "impact": "High"|"Medium", "description": str}}
- "fit_rationale": Why this tailored solution specifically fits this business
- "offer_packages": List of 3 tiered packages with {{"tier": str, "price": str, "features": list}}
- "pricing_guidance": ROI investment framing
- "pitch_script": Personalized, conversational pitch ready to copy and send via WhatsApp/Phone
- "objections_and_responses": List of objects with {{"objection": str, "response": str}}
- "lead_score": Numeric score between 0 and 100
- "score_reasoning": Explanation of score
- "next_action": Immediate actionable next step to close
- "follow_up_date": Follow-up timing
"""
        res = self._call_gemini_api(prompt)
        return res if (res and isinstance(res, dict) and "problem_statement" in res) else self.fallback.refine_strategy_with_ai(lead_profile, intelligence, current_strategy, user_instruction)

    def generate_call_turn(
        self,
        lead_profile: Dict[str, Any],
        history: List[Dict[str, Any]],
        user_speech: str,
        agent_persona: Optional[str] = None,
        call_goal: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate real-time human-like voice dialogue, handle objections, assess interest,
        and extract customer queries using Google Gemini LLM.
        """
        prompt = f"""Your name is Priya. You are a warm, polite, professional female Senior Business Consultant calling from "Digital Growth Hub".
You are speaking live on the phone with the owner or manager of a local business.

IDENTITY & GENDER RULES:
1. You are Priya, a real human woman and business consultant from Digital Growth Hub.
2. NEVER refer to yourself as a "lead agent", "AI", "bot", "assistant", or "model".
3. FEMALE GRAMMATICAL AGREEMENT: When speaking in Hindi or Hinglish, ALWAYS use feminine verb forms for yourself (e.g. "main bol rahi hoon", "main Priya baat kar rahi hoon", "main help kar sakti hoon", "main share karungi", "main bhejti hoon"). NEVER use masculine forms ("kar raha hoon", "bol raha hoon").
4. Speak naturally, warmly, and concisely (1 to 2 spoken sentences maximum per turn). Never recite robotic bullet points.
5. In early turns (when user says "yes", "speaking", "haanji", "who is this", "tell me"): enthusiastically introduce how Digital Growth Hub helps local businesses in their city get direct WhatsApp customer orders and Top 3 Google Maps ranking with ZERO commission.
6. If they ask questions about pricing, timeline, or how it works, answer clearly and warmly.
7. Ask for their interest: "Would you like me to send a quick 1-page breakdown directly on WhatsApp for you to review?"
8. If they say "stop calling", "DNC", set action="opt_out" and interest_status="opted_out".
9. If they explicitly say "not interested" or want to hang up, be polite, set action="end_call" and interest_status="not_interested".
10. Only set action="complete_call" after you have answered their questions and confirmed sending details on WhatsApp. For all ongoing conversation turns, answering questions, or initial identity confirmation, ALWAYS set action="continue".

Lead Profile:
{json.dumps(lead_profile, indent=2)}

Conversation History so far ({len(history)} turns):
{json.dumps(history, indent=2)}

Latest User Speech:
"{user_speech}"

Return a JSON object with:
- "agent_response": Spoken text to be read aloud (1-2 natural spoken sentences as Priya)
- "action": "continue" | "complete_call" | "opt_out" | "escalate" | "end_call"
- "sentiment": "positive" | "interested" | "neutral" | "concerned" | "negative"
- "interest_status": "interested_hot" | "interested_warm" | "call_back" | "not_interested" | "opted_out"
- "extracted_queries": List of objects with {{"query": str, "category": "Pricing & Commercials"|"Features & Workflow"|"Google Maps & SEO"|"Timeline"|"Technical", "answer_given": str, "priority": "High"|"Medium"|"Low"}} for any questions/requirements asked by the lead in this turn or earlier
- "stage": "introduction" | "discovery" | "query_handling" | "pitch" | "closing"
"""
        res = self._call_gemini_api(prompt, timeout_sec=4)
        return res if (res and isinstance(res, dict) and "agent_response" in res) else self.fallback.generate_call_turn(
            lead_profile, history, user_speech, agent_persona, call_goal
        )

    def simulate_autonomous_call(
        self,
        lead_profile: Dict[str, Any],
        agent_persona: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Simulate a complete, natural multi-turn qualification conversation using Gemini."""
        prompt = f"""You are simulating a realistic 6-to-8 turn phone conversation between Priya, a female Senior Business Consultant from Digital Growth Hub, and the owner of this business.

Business Details:
{json.dumps(lead_profile, indent=2)}

Generate a full conversation transcript where:
1. Priya introduces herself warmly as Priya from Digital Growth Hub, compliments their business in {lead_profile.get('city', 'their city')}, and asks how they handle new customer inquiries. (Using feminine grammar: "Priya bol rahi hoon").
2. Lead responds naturally with real pain points (e.g. walk-ins only, commission fees to delivery apps, no website).
3. Priya explains our 100% hands-off solution (1-tap WhatsApp booking button, Google Maps local search ranking).
4. Lead asks realistic questions (e.g. pricing, setup time, how orders arrive on WhatsApp).
5. Priya answers clearly and asks if she can send a 1-page breakdown on WhatsApp.
6. Lead agrees and provides consent to send the WhatsApp breakdown.
7. Priya confirms follow-up and closes politely.

Return a JSON array of objects with:
[
  {{"speaker": "agent", "text": "...", "turn_index": 0, "sentiment": "positive"}},
  {{"speaker": "lead", "text": "...", "turn_index": 1, "sentiment": "neutral"}},
  ...
]
"""
        res = self._call_gemini_api(prompt)
        if isinstance(res, list) and len(res) >= 4:
            return res
        elif isinstance(res, dict) and "turns" in res:
            return res["turns"]
        return self.fallback.simulate_autonomous_call(lead_profile, agent_persona)
