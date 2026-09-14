import os
import uuid
from typing import Dict, List, Any, Optional
from django.utils import timezone
from .base import BaseAgent
from leads.models import Lead, CallSession, CallTranscriptTurn, SystemSetting
from providers.telephony.mock_telephony import MockTelephonyProvider
from providers.telephony.twilio_provider import TwilioProvider
from providers.llm.gemini_provider import GeminiProvider
from providers.llm.groq_provider import GroqProvider
from providers.llm.openai_provider import OpenAIProvider
from providers.llm.mock_llm import MockLLMProvider


class CallingAgent(BaseAgent):
    """
    Agent 3 — Autonomous AI Calling Agent
    Orchestrates compliant, human-like voice conversations to phone numbers.
    Introduces our business solutions, answers questions, handles objections,
    actively collects customer queries, and qualifies interest for closing.
    """

    def __init__(self):
        super().__init__(name="CallingAgent")

    def _get_telephony_provider(self):
        try:
            setting = SystemSetting.objects.filter(key="telephony_provider").first()
            provider_type = setting.value.get("provider", "twilio") if setting else "twilio"
            account_sid = (setting.value.get("twilio_account_sid") if setting else None) or os.getenv("TWILIO_ACCOUNT_SID", "")
            auth_token = (setting.value.get("twilio_auth_token") if setting else None) or os.getenv("TWILIO_AUTH_TOKEN", "")
            from_number = (setting.value.get("twilio_from_number") if setting else None) or os.getenv("TWILIO_FROM_NUMBER", "")
        except Exception:
            provider_type = "twilio"
            account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
            from_number = os.getenv("TWILIO_FROM_NUMBER", "")

        account_sid = (account_sid or "").strip()
        auth_token = (auth_token or "").strip()
        from_number = (from_number or "").strip()

        if account_sid and auth_token and from_number:
            return TwilioProvider(account_sid=account_sid, auth_token=auth_token, from_number=from_number)
        return MockTelephonyProvider()

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

    def is_kill_switch_active(self) -> bool:
        """Check if global emergency calling kill switch is enabled."""
        try:
            setting = SystemSetting.objects.filter(key="kill_switch").first()
            if setting and setting.value.get("active", False):
                return True
        except Exception:
            pass
        return False

    def initiate_call(
        self,
        lead: Lead,
        call_type: str = "twilio_phone",
        script_version: str = "v1.0-qualification",
        webhook_base_url: Optional[str] = None,
        custom_phone: Optional[str] = None
    ) -> CallSession:
        """
        Initiate outbound voice call with strict compliance and approval gates.
        Places real cellular phone calls via Twilio.
        """
        # 1. Global Kill Switch Check
        if self.is_kill_switch_active():
            self.log_event(
                event_type="CALL_BLOCKED_BY_KILL_SWITCH",
                description=f"Outbound call to '{lead.business_name}' blocked because Global Emergency Kill Switch is ACTIVE.",
                lead=lead
            )
            raise PermissionError("Global Emergency Kill Switch is active. All outbound calls are blocked.")

        # 2. Explicit User Approval Gate
        if not lead.calling_approved:
            self.log_event(
                event_type="CALL_BLOCKED_UNAPPROVED",
                description=f"Outbound call to '{lead.business_name}' blocked: Lead has not received explicit user calling approval.",
                lead=lead
            )
            raise PermissionError("Lead has not been approved for calling by a human user.")

        # 3. Do Not Call / Opt-out Check
        if lead.opted_out:
            self.log_event(
                event_type="CALL_BLOCKED_DNC",
                description=f"Outbound call to '{lead.business_name}' blocked: Lead has previously opted out (DNC).",
                lead=lead
            )
            raise PermissionError("Lead is on Do Not Call (DNC) / Opt-out list.")

        # 4. Initiate Call Session
        target_phone = custom_phone or lead.phone or lead.normalized_phone or ""
        provider = self._get_telephony_provider() if call_type == "twilio_phone" else MockTelephonyProvider()

        lead_context = {
            "lead_id": lead.lead_id,
            "business_name": lead.business_name,
            "category": lead.category,
            "contact_person": lead.contact_person,
            "city": lead.city,
            "rating": lead.rating,
            "website_status": lead.website_status,
        }

        call_session = CallSession.objects.create(
            lead=lead,
            status='calling',
            call_type=call_type,
            target_phone=target_phone,
            custom_business_name=lead.business_name,
            telephony_provider=provider.__class__.__name__,
            call_script_version=script_version,
            collected_queries=[],
            started_at=timezone.now()
        )

        opening_text = (
            f"Hello {lead.contact_person or 'there'}! This is Antigravity Voice Assistant calling on behalf of Digital Growth Lab regarding {lead.business_name} in {lead.city}. "
            f"Am I speaking with the owner or manager?"
        )

        if call_type == "twilio_phone" and isinstance(provider, TwilioProvider) and provider.has_credentials():
            res = provider.initiate_call(
                phone_number=target_phone,
                lead_context=lead_context,
                script_version=script_version,
                webhook_base_url=webhook_base_url,
                session_id=str(call_session.id)
            )
            call_session.status = res.get("status", "calling")
            if res.get("error"):
                call_session.error_reason = res.get("error")
            if res.get("opening_turn"):
                opening_text = res["opening_turn"].get("text", opening_text)
        else:
            call_session.status = "connected"

        call_session.save(update_fields=['status', 'error_reason'])

        # Store opening turn
        CallTranscriptTurn.objects.create(
            call_session=call_session,
            speaker='agent',
            text=opening_text,
            turn_index=0,
            sentiment='positive'
        )

        self.log_event(
            event_type="CALL_INITIATED",
            description=f"Outbound {call_type} call initiated to '{lead.business_name}' ({target_phone}) via {provider.__class__.__name__}.",
            lead=lead,
            payload={"call_id": str(call_session.id), "call_type": call_type, "status": call_session.status}
        )

        return call_session

    def call_custom_number(
        self,
        phone_number: str,
        business_name: str,
        category: str = "Local Business",
        contact_person: str = "Business Owner",
        city: str = "Solan",
        notes: str = "",
        call_type: str = "twilio_phone",
        webhook_base_url: Optional[str] = None
    ) -> CallSession:
        """
        Instantly place an autonomous AI call to any custom phone number and business details.
        """
        # Create quick lead record
        lead_id = f"custom_{uuid.uuid4().hex[:8]}"
        lead = Lead.objects.create(
            lead_id=lead_id,
            business_name=business_name or "Custom Business",
            category=category or "Local Business",
            contact_person=contact_person or "Business Owner",
            phone=phone_number,
            normalized_phone=phone_number,
            city=city or "Solan",
            description=notes,
            calling_approved=True,  # Explicit user initiated action
            lead_score=75
        )

        return self.initiate_call(
            lead=lead,
            call_type=call_type,
            webhook_base_url=webhook_base_url,
            custom_phone=phone_number
        )

    def process_turn(self, call_session: CallSession, user_speech: str) -> Dict[str, Any]:
        """
        Process user speech turn during an ongoing call session with LLM-powered intelligence.
        """
        lead = call_session.lead
        llm = self._get_llm_provider()

        # Save incoming user turn
        current_turns = list(call_session.transcript_turns.all().order_by('turn_index'))
        turn_idx = len(current_turns)

        CallTranscriptTurn.objects.create(
            call_session=call_session,
            speaker='lead',
            text=user_speech,
            turn_index=turn_idx,
            sentiment='neutral'
        )

        lead_profile = {
            "lead_id": lead.lead_id,
            "business_name": lead.business_name,
            "category": lead.category,
            "contact_person": lead.contact_person or "Owner",
            "city": lead.city,
            "rating": lead.rating,
            "website_status": lead.website_status,
            "description": lead.description
        }
        history = [{"speaker": t.speaker, "text": t.text} for t in current_turns]

        # Generate dialogue turn using active LLM
        result = llm.generate_call_turn(
            lead_profile=lead_profile,
            history=history,
            user_speech=user_speech
        )

        # Merge extracted queries into call session
        new_queries = result.get("extracted_queries", [])
        if new_queries:
            existing_queries = call_session.collected_queries or []
            existing_text = {q.get("query", "").lower() for q in existing_queries}
            for nq in new_queries:
                if nq.get("query", "").lower() not in existing_text:
                    existing_queries.append({
                        "query": nq.get("query", ""),
                        "category": nq.get("category", "General Inquiry"),
                        "answer_given": nq.get("answer_given", ""),
                        "priority": nq.get("priority", "Medium"),
                        "turn_index": turn_idx
                    })
            call_session.collected_queries = existing_queries
            call_session.save(update_fields=['collected_queries'])

        # Handle Opt-out action
        if result.get("action") == "opt_out":
            lead.opted_out = True
            lead.calling_approved = False
            lead.save(update_fields=['opted_out', 'calling_approved'])
            call_session.status = 'opted_out'
            call_session.ended_at = timezone.now()
            call_session.save(update_fields=['status', 'ended_at'])

            self.log_event(
                event_type="LEAD_OPTED_OUT",
                description=f"Lead '{lead.business_name}' requested Do Not Call during call. Permanently opted out.",
                lead=lead
            )

        elif result.get("action") in ["end_call", "complete_call", "escalate"]:
            call_session.status = 'completed' if result.get("action") != "escalate" else "escalated"
            call_session.ended_at = timezone.now()
            call_session.save(update_fields=['status', 'ended_at'])

            # Automatically trigger conversation intelligence extraction
            try:
                from .intelligence_agent import IntelligenceAgent
                from .strategy_agent import StrategyAgent
                from .lead_scorer import LeadScoringEngine
                intel_agent = IntelligenceAgent()
                intel_agent.extract_intelligence(call_session)
                LeadScoringEngine().update_lead_score(lead)
                StrategyAgent().generate_strategy(lead)
            except Exception as e:
                pass

        # Save Agent Response Turn
        agent_resp = result.get("agent_response", "")
        if agent_resp:
            CallTranscriptTurn.objects.create(
                call_session=call_session,
                speaker='agent',
                text=agent_resp,
                turn_index=turn_idx + 1,
                sentiment=result.get("sentiment", "positive")
            )

        return {
            "agent_response": agent_resp,
            "action": result.get("action", "continue"),
            "sentiment": result.get("sentiment", "positive"),
            "interest_status": result.get("interest_status", "interested_warm"),
            "extracted_queries": call_session.collected_queries,
            "stage": result.get("stage", "discovery")
        }

    def simulate_full_call(self, lead: Lead) -> CallSession:
        """
        Execute a complete simulated dialogue and save all turns to database using Gemini.
        """
        call_session = self.initiate_call(lead, call_type="simulation")
        llm = self._get_llm_provider()

        lead_profile = {
            "business_name": lead.business_name,
            "contact_person": lead.contact_person or "Store Owner",
            "city": lead.city,
            "category": lead.category
        }

        turns = llm.simulate_autonomous_call(lead_profile)

        # Clear initial opening turn and insert complete simulation
        call_session.transcript_turns.all().delete()
        for t in turns:
            CallTranscriptTurn.objects.create(
                call_session=call_session,
                speaker=t["speaker"],
                text=t["text"],
                turn_index=t["turn_index"],
                sentiment=t.get("sentiment", "positive")
            )

        call_session.status = "completed"
        call_session.ended_at = timezone.now()
        call_session.duration_seconds = 185  # ~3 min call
        call_session.save(update_fields=['status', 'ended_at', 'duration_seconds'])

        # Auto-extract intelligence & strategy
        try:
            from .intelligence_agent import IntelligenceAgent
            from .strategy_agent import StrategyAgent
            from .lead_scorer import LeadScoringEngine
            IntelligenceAgent().extract_intelligence(call_session)
            LeadScoringEngine().update_lead_score(lead)
            StrategyAgent().generate_strategy(lead)
        except Exception:
            pass

        self.log_event(
            event_type="CALL_COMPLETED",
            description=f"Voice call to '{lead.business_name}' successfully completed. {len(turns)} transcript turns recorded.",
            lead=lead,
            payload={"call_id": str(call_session.id), "turns_count": len(turns)}
        )

        return call_session

