import uuid
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..base import TelephonyProviderBase


class MockTelephonyProvider(TelephonyProviderBase):
    """
    Simulates high-fidelity realtime telephony interactions with dynamic branching,
    compliance notices, self-identification, objection handling, and opt-out logic.
    """

    def initiate_call(
        self,
        phone_number: str,
        lead_context: Dict[str, Any],
        script_version: str = "v1.0-qualification"
    ) -> Dict[str, Any]:
        """Start a new simulated call session."""
        call_id = str(uuid.uuid4())
        business_name = lead_context.get("business_name", "your business")
        contact_person = lead_context.get("contact_person", "there")
        city = lead_context.get("city", "Solan")

        opening_text = (
            f"Hello {contact_person}! This is Antigravity Voice Assistant calling on behalf of Digital Growth Lab. "
            f"I'm reaching out regarding {business_name} in {city}. Am I speaking with the owner or manager?"
        )

        return {
            "call_id": call_id,
            "status": "connected",
            "provider": "mock_telephony",
            "opening_turn": {
                "speaker": "agent",
                "text": opening_text,
                "timestamp": datetime.utcnow().isoformat(),
                "sentiment": "positive"
            }
        }

    def process_turn(
        self,
        call_id: str,
        user_speech: str,
        lead_context: Dict[str, Any],
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Process speech turn from the lead, evaluating compliance rules (DNC / Opt-out),
        objections, budget signals, and returning agent dialogue.
        """
        user_text = user_speech.lower().strip()
        turn_count = len(history)
        business_name = lead_context.get("business_name", "your business")
        city = lead_context.get("city", "Solan")

        # 1. Check Compliance / Opt-out
        if any(term in user_text for term in ["stop calling", "do not call", "dnc", "remove my number", "never call"]):
            return {
                "agent_response": "I completely understand. We have permanently removed your number from our contact list. Have a wonderful day.",
                "action": "opt_out",
                "call_status": "opted_out",
                "sentiment": "negative",
                "notes": "Lead explicitly requested Do Not Call (DNC)."
            }

        # 2. Check Refusal / Wrong number
        if "wrong number" in user_text or "no such person" in user_text:
            return {
                "agent_response": "My apologies for the confusion! Thank you for letting me know.",
                "action": "end_call",
                "call_status": "refused",
                "sentiment": "neutral",
                "notes": "Wrong number reported."
            }

        # 3. Check Escalation to Human
        if "talk to a human" in user_text or "speak to a real person" in user_text or "transfer me" in user_text:
            return {
                "agent_response": "Certainly! I am transferring you directly to our senior growth specialist right now. Please hold on.",
                "action": "escalate",
                "call_status": "escalated",
                "sentiment": "neutral",
                "notes": "Human escalation requested."
            }

        # 4. Dynamic Conversational Branching
        if turn_count <= 2:
            # Qualification Phase
            response_text = (
                f"Wonderful! We noticed {business_name} has fantastic ratings in {city}, but when tourists and locals search online for emergency repairs or services, there's no direct booking link. How are you currently receiving your new customer inquiries?"
            )
            return {
                "agent_response": response_text,
                "action": "continue",
                "call_status": "connected",
                "sentiment": "positive",
                "stage": "qualification"
            }

        elif turn_count <= 4:
            # Value Proposition & Need Extraction
            if "busy" in user_text or "no time" in user_text:
                response_text = "That makes total sense! That's exactly why our solution is 100% hands-off—you don't need to manage any software or computers. We set up an automated WhatsApp booking button so inquiries come straight to your phone. Would you be open to seeing a quick 1-page breakdown?"
            elif "expensive" in user_text or "cost" in user_text or "price" in user_text:
                response_text = "Our setup is very accessible, starting with packages that usually pay for themselves in just 2 to 3 extra customer repair jobs. Would you like us to WhatsApp you the transparent pricing guide?"
            else:
                response_text = f"That's very clear. We specialize in helping established local workshops like {business_name} capture high-ticket emergency inquiries from mobile searchers without any headache. Would you prefer a brief WhatsApp summary or a quick 5-minute call tomorrow?"

            return {
                "agent_response": response_text,
                "action": "continue",
                "call_status": "connected",
                "sentiment": "positive",
                "stage": "pitch"
            }

        else:
            # Closing Phase
            response_text = (
                f"Fantastic! I have noted down your requirements for {business_name}. Our solutions consultant will send the customized proposal and follow up with you tomorrow morning. Thank you for your time and have a great day!"
            )
            return {
                "agent_response": response_text,
                "action": "complete_call",
                "call_status": "completed",
                "sentiment": "positive",
                "stage": "closing"
            }

    def generate_full_simulation(self, lead_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate a complete, realistic multi-turn qualification conversation transcript
        for instant automated testing and demonstration.
        """
        business_name = lead_context.get("business_name", "Sharma Auto Works")
        contact_person = lead_context.get("contact_person", "Ramesh Sharma")
        city = lead_context.get("city", "Solan")

        return [
            {
                "speaker": "agent",
                "text": f"Hello {contact_person}! This is Antigravity Voice Assistant calling on behalf of Digital Growth Lab regarding {business_name} in {city}. Am I speaking with the owner?",
                "turn_index": 0,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": f"Yes, this is {contact_person}. What is this regarding?",
                "turn_index": 1,
                "sentiment": "neutral"
            },
            {
                "speaker": "agent",
                "text": f"Great to connect! We noticed {business_name} has top-tier ratings in {city}, but when tourists and highway drivers search online for emergency repairs on NH-5, there is no direct instant-booking page. How do you currently handle new customer inquiries?",
                "turn_index": 2,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": "Most of our customers are local walk-ins or word-of-mouth. We don't have a website because I don't have time to manage computer systems, though we do miss out on highway breakdown travelers during peak tourist weekends.",
                "turn_index": 3,
                "sentiment": "positive"
            },
            {
                "speaker": "agent",
                "text": "That makes total sense! That's why our system is 100% hands-off—it automatically puts a verified Google map card with a 1-tap WhatsApp emergency button, directing calls straight to your mobile. What kind of repair jobs would you like to get more of?",
                "turn_index": 4,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": "High-margin diagnostic work, engine scanning, and emergency towing assistance. How much does something like this cost?",
                "turn_index": 5,
                "sentiment": "interested"
            },
            {
                "speaker": "agent",
                "text": "Our packages start at just ₹19,999 one-time, which typically pays for itself with 2 extra diagnostic jobs. May I send you the tailored 1-page proposal on WhatsApp for you to review today?",
                "turn_index": 6,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": "Yes, please send it over to this WhatsApp number. I will take a look this evening.",
                "turn_index": 7,
                "sentiment": "positive"
            },
            {
                "speaker": "agent",
                "text": f"Perfect, {contact_person}! Sending the proposal to your number now. We will follow up with you tomorrow at 11:00 AM. Thank you and have a wonderful day!",
                "turn_index": 8,
                "sentiment": "positive"
            }
        ]
