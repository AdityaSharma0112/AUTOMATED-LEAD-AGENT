import os
import urllib.parse
from typing import Dict, List, Any, Optional
from ..base import TelephonyProviderBase
from .mock_telephony import MockTelephonyProvider


class TwilioProvider(TelephonyProviderBase):
    """
    Twilio Telephony Provider for real outbound voice calls and TwiML webhook processing.
    Falls back gracefully to MockTelephonyProvider when Twilio credentials are not set.
    """

    def __init__(
        self,
        account_sid: Optional[str] = None,
        auth_token: Optional[str] = None,
        from_number: Optional[str] = None
    ):
        raw_sid = account_sid or os.getenv("TWILIO_ACCOUNT_SID", "")
        raw_token = auth_token or os.getenv("TWILIO_AUTH_TOKEN", "")
        raw_from = from_number or os.getenv("TWILIO_FROM_NUMBER", "")

        self.account_sid = raw_sid.strip() if raw_sid else ""
        self.auth_token = raw_token.strip() if raw_token else ""
        self.from_number = raw_from.strip() if raw_from else ""
        self.fallback = MockTelephonyProvider()

    def has_credentials(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.from_number)

    def initiate_call(
        self,
        phone_number: str,
        lead_context: Dict[str, Any],
        script_version: str = "v1.0-qualification",
        webhook_base_url: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate outbound cellular call to real phone number via Twilio REST API.
        """
        clean_phone = (phone_number or "").strip()
        if not self.has_credentials():
            return self.fallback.initiate_call(clean_phone, lead_context, script_version)

        # Normalize phone number
        if clean_phone and not clean_phone.startswith("+"):
            # If 10 digits (e.g. Indian mobile number), prepend +91
            digits = "".join(filter(str.isdigit, clean_phone))
            if len(digits) == 10:
                clean_phone = f"+91{digits}"
            else:
                clean_phone = f"+{digits}"

        business_name = lead_context.get("business_name", "your business")
        contact_person = lead_context.get("contact_person", "there")
        city = lead_context.get("city", "Solan")

        opening_text = (
            f"Hello {contact_person}! This is Priya calling from Digital Growth Hub regarding {business_name} in {city}. "
            f"Am I speaking with the owner or manager?"
        )

        try:
            import requests
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Calls.json"

            effective_webhook = (webhook_base_url or os.getenv("PUBLIC_WEBHOOK_URL", "")).strip()
            if not effective_webhook or "localhost" in effective_webhook or "127.0.0.1" in effective_webhook or "ngrok-free.dev" in effective_webhook:
                effective_webhook = "https://automated-lead-agent.onrender.com"

            if not effective_webhook.startswith("http://") and not effective_webhook.startswith("https://"):
                effective_webhook = f"https://{effective_webhook}"

            effective_webhook = effective_webhook.rstrip('/')
            sid_param = session_id or "direct_session"
            twiml_url = f"{effective_webhook}/api/calls/twilio/webhook?session_id={sid_param}"

            data = {
                "To": clean_phone,
                "From": self.from_number,
                "Url": twiml_url,
                "StatusCallback": f"{effective_webhook}/api/calls/twilio/status"
            }

            res = requests.post(url, data=data, auth=(self.account_sid, self.auth_token), timeout=15)
            if res.status_code in [200, 201]:
                call_data = res.json()
                return {
                    "call_id": call_data.get("sid"),
                    "status": "calling",
                    "provider": "twilio",
                    "phone": clean_phone,
                    "opening_turn": {
                        "speaker": "agent",
                        "text": opening_text,
                        "timestamp": "",
                        "sentiment": "positive"
                    }
                }
            else:
                err_msg = res.text[:250]
                return {
                    "call_id": None,
                    "status": "failed",
                    "provider": "twilio",
                    "error": f"Twilio API error ({res.status_code}): {err_msg}",
                    "opening_turn": {
                        "speaker": "agent",
                        "text": opening_text,
                        "timestamp": "",
                        "sentiment": "positive"
                    }
                }
        except Exception as e:
            return {
                "call_id": None,
                "status": "failed",
                "provider": "twilio",
                "error": str(e),
                "opening_turn": {
                    "speaker": "agent",
                    "text": opening_text,
                    "timestamp": "",
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
        return self.fallback.process_turn(call_id, user_speech, lead_context, history)

    def generate_twiml_response(
        self,
        agent_speech: str,
        next_turn_url: Optional[str] = None,
        is_final: bool = False,
        voice: str = "Polly.Aditi"
    ) -> str:
        """
        Generate compliant TwiML XML with Amazon Polly neural voice and Speech Gathering.
        Places speech inside Gather for seamless barge-in, multi-turn listening, and silence retry.
        """
        escaped_text = (
            agent_speech.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

        clean_url = (next_turn_url or "").strip()
        if not clean_url or clean_url.lower() == "none":
            clean_url = "https://automated-lead-agent.onrender.com/api/calls/twilio/turn"

        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            clean_url = f"https://{clean_url}"

        # Escape ampersands in URL for XML compliance
        if "&" in clean_url:
            clean_url = clean_url.replace("&amp;", "&").replace("&", "&amp;")

        if is_final:
            return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{voice}" language="en-IN">{escaped_text}</Say>
    <Hangup/>
</Response>"""

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="{clean_url}" method="POST" speechTimeout="auto" timeout="7" language="en-IN">
        <Say voice="{voice}" language="en-IN">{escaped_text}</Say>
    </Gather>
    <Gather input="speech" action="{clean_url}" method="POST" speechTimeout="auto" timeout="6" language="en-IN">
        <Say voice="{voice}" language="en-IN">Are you still there? Could you please repeat that?</Say>
    </Gather>
    <Say voice="{voice}" language="en-IN">Thank you for your time. Have a wonderful day.</Say>
    <Hangup/>
</Response>"""

