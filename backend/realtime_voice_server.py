import os
import json
import base64
import asyncio
import urllib.parse
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, WebSocket, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.websockets import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from twilio.twiml.voice_response import VoiceResponse, Connect, Say, Stream
from twilio.rest import Client
from dotenv import load_dotenv

# Try importing audioop (or audioop_lts for Python 3.13+)
try:
    import audioop
except ImportError:
    try:
        import audioop_lts as audioop
    except ImportError:
        audioop = None

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "").strip()
PORT = int(os.getenv("PORT", 5050))

# Preferred Engine: "gemini" or "openai"
AI_ENGINE = "openai" if (OPENAI_API_KEY and not GEMINI_API_KEY) else "gemini"

# Natural, human voice configuration
# Gemini voices: Aoede (natural warm female), Charon (calm male), Kore, Fenrir, Puck
GEMINI_VOICE = "Aoede"
# OpenAI voice: alloy, echo, shimmer, ash, ballad, coral, sage, verse
OPENAI_VOICE = "alloy"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

SYSTEM_MESSAGE = """You are a warm, articulate, highly knowledgeable human sales consultant calling on behalf of "Digital Growth Lab".
You are speaking live on a phone call with a local business owner or manager.

ABOUT DIGITAL GROWTH LAB & OUR COMPLETE SERVICES:
1. CUSTOM HIGH-PERFORMANCE WEBSITES:
   - Yes, we design & build modern, fast, mobile-friendly websites for businesses in any industry (auto repair, bakeries, doctors, salons, legal, retail, etc.).
   - Includes online booking, WhatsApp chat button, custom menus/service catalogs, and Google SEO optimization.
   - Fast turnaround: Delivered and live in just 48 hours.
2. GOOGLE MAPS & LOCAL SEO:
   - We get businesses ranked in the Top 3 on Google Search & Google Maps for local searches.
   - Increases phone calls, directions requests, and in-person foot traffic by 30% to 50%.
3. 1-TAP WHATSAPP BOOKING & ORDERING:
   - Direct customer-to-owner WhatsApp booking with ZERO commission fees (saving businesses from 20-30% aggregator cuts).
4. AI VOICE & CUSTOMER INQUIRY AGENTS:
   - 24/7 automated calling & customer support agents that answer queries instantly.
5. PRICING & RISK-FREE TRIAL:
   - We offer a 14-day zero-risk trial so owners can see real results before paying anything.
   - Transparent, affordable flat monthly plans with no long-term contracts.

CRITICAL TELEPHONE CONVERSATION RULES:
1. Speak naturally like a friendly, confident human consultant over the phone.
2. Answer the caller's specific question DIRECTLY and ACCURATELY. If they ask about websites, discuss our custom website design. If they ask about pricing, explain the 14-day trial.
3. Keep spoken replies CONCISE (1 to 2 spoken sentences maximum per turn). Never give lectures, read long essays, or use robotic bullet points.
4. STRICT TOPIC FOCUS: Only discuss our business growth solutions, websites, WhatsApp systems, Google rankings, and client results. If asked about unrelated things, politely steer back.
5. Always guide toward a low-friction next step: "Would you like me to send a quick 1-page breakdown or demo link directly to your WhatsApp for you to review?"
6. If the person says "stop calling", "not interested", or "busy", be very polite and end the call gracefully.
"""

# In-memory multi-turn conversation memory for phone calls
CALL_HISTORIES: Dict[str, List[Dict[str, str]]] = {}


import re

DISCOVERED_GEMINI_MODELS: List[str] = []


def get_available_gemini_models() -> List[str]:
    """Fetch valid, modern model names from Google Gemini ModelService API."""
    global DISCOVERED_GEMINI_MODELS
    if DISCOVERED_GEMINI_MODELS:
        return DISCOVERED_GEMINI_MODELS

    preferred = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip() or "gemini-3.5-flash-lite"
    fallbacks = [preferred, "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]
    # Deduplicate while preserving order
    default_models = list(dict.fromkeys(fallbacks))

    if not GEMINI_API_KEY:
        return default_models

    try:
        import requests
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
        res = requests.get(url, timeout=6)
        if res.status_code == 200:
            data = res.json()
            models = []
            for m in data.get("models", []):
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    name = m.get("name", "").replace("models/", "").strip()
                    lower_name = name.lower()
                    # Filter out non-text, TTS, audio, embedding, or deprecated 1.5/2.0/2.5 models
                    if any(b in lower_name for b in ["tts", "audio", "embedding", "imagen", "aqa", "preview"]):
                        continue
                    if any(dep in lower_name for dep in ["gemini-1.5", "gemini-2.0", "gemini-2.5"]):
                        continue
                    if name:
                        models.append(name)
            
            # Prioritize fast modern models at top
            prioritized = []
            for pref in [preferred, "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]:
                if pref not in prioritized:
                    prioritized.append(pref)
            for m in models:
                if m not in prioritized:
                    prioritized.append(m)

            if prioritized:
                DISCOVERED_GEMINI_MODELS = prioritized
                print(f" Auto-Discovered Active Gemini Models: {DISCOVERED_GEMINI_MODELS[:3]}")
                return DISCOVERED_GEMINI_MODELS
    except Exception as e:
        print(f" [Gemini Model Discovery Exception]: {e}")

    DISCOVERED_GEMINI_MODELS = default_models
    return DISCOVERED_GEMINI_MODELS


async def generate_llm_response(user_speech: str, session_id: str = "default") -> str:
    """
    Generate natural, dynamic human conversational response using Gemini, Groq, or OpenAI
    with multi-turn conversation memory.
    """
    if not user_speech:
        return "I am listening. Could you please repeat that?"

    # Retrieve and update conversation history
    history = CALL_HISTORIES.get(session_id, [])
    history.append({"role": "user", "text": user_speech})
    CALL_HISTORIES[session_id] = history[-8:]  # Keep last 8 turns for context

    # Build conversation context string for single-turn prompt wrapper
    history_str = "\n".join([f"{h['role'].upper()}: {h['text']}" for h in CALL_HISTORIES[session_id]])
    full_prompt = (
        f"{SYSTEM_MESSAGE}\n\n"
        f"CONVERSATION HISTORY SO FAR:\n{history_str}\n\n"
        f"LATEST CUSTOMER SPEECH: \"{user_speech}\"\n\n"
        f"Respond as the Digital Growth Lab sales consultant directly to what the customer said. "
        f"Keep your spoken response natural, friendly, and strictly 1 to 2 spoken sentences (no bullet points or markdown):"
    )

    # 1. Try Google Gemini API with discovered active models
    if GEMINI_API_KEY:
        models_to_try = list(get_available_gemini_models())
        for model_name in models_to_try:
            try:
                import requests
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [
                        {"parts": [{"text": full_prompt}]}
                    ],
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 450
                    }
                }
                res = requests.post(url, json=payload, timeout=6)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for p in parts:
                            if "text" in p and p["text"].strip():
                                text = p["text"].strip()
                                clean_text = text.replace("*", "").replace("#", "").replace('"', "").strip()
                                if clean_text:
                                    print(f" [Gemini {model_name} Live Response]: \"{clean_text}\"")
                                    CALL_HISTORIES[session_id].append({"role": "model", "text": clean_text})
                                    return clean_text
                elif res.status_code in [404, 410]:
                    if model_name in DISCOVERED_GEMINI_MODELS:
                        DISCOVERED_GEMINI_MODELS.remove(model_name)
                    print(f" [Gemini {model_name} Deprecated HTTP {res.status_code}]: Removing from active list")
                else:
                    print(f" [Gemini {model_name} HTTP {res.status_code}]: {res.text[:100]}")
            except Exception as e:
                pass

    # 2. Try Groq Cloud API (if configured)
    if GROQ_API_KEY:
        try:
            import requests
            url = "https://api.groq.com/openai/v1/chat/completions"
            messages = [{"role": "system", "content": SYSTEM_MESSAGE}]
            for turn in CALL_HISTORIES[session_id]:
                messages.append({"role": turn["role"] if turn["role"] != "model" else "assistant", "content": turn["text"]})

            res = requests.post(
                url,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": messages, "max_tokens": 100, "temperature": 0.7},
                timeout=4
            )
            if res.status_code == 200:
                text = res.json()["choices"][0]["message"]["content"].strip()
                clean_text = text.replace("*", "").replace("#", "").replace('"', "").strip()
                if clean_text:
                    CALL_HISTORIES[session_id].append({"role": "model", "text": clean_text})
                    return clean_text
        except Exception:
            pass

    # 3. Intelligent Regex & Keyword NLP Fallback (Precise Whole-Word Matching)
    speech_lower = user_speech.lower()
    words = set(re.findall(r'\b[a-z0-9\'-]+\b', speech_lower))

    # Questions about identity / why calling
    if any(phrase in speech_lower for phrase in ["who are you", "who is this", "why are you calling", "why did you call", "what do you do", "what is this about", "what services", "why i am getting this call"]):
        reply = "I am calling from Digital Growth Lab! We help local businesses in your city get more customers through custom fast websites, Google Maps ranking, and direct WhatsApp booking with zero commissions. Would you like a quick overview?"
    # Questions about websites
    elif any(w in words for w in ["website", "websites", "webpage", "site", "web"]) or "make website" in speech_lower:
        reply = "Yes, absolutely! We design and build modern, mobile-friendly websites with online booking and Google SEO in just 48 hours. Would you like me to send a sample demo to your WhatsApp?"
    # Questions about pricing & charges
    elif any(w in words for w in ["price", "cost", "pricing", "charge", "charges", "rate", "fee", "fees", "money", "budget"]):
        reply = "We offer a 14-day zero-risk trial so you can see results first, followed by an affordable flat monthly plan with no contracts. Can I send the complete breakdown to your WhatsApp?"
    # Questions about Google Maps / Ranking / SEO
    elif any(w in words for w in ["google", "ranking", "seo", "rank", "maps", "reviews", "review"]):
        reply = "We optimize your Google Business Profile to rank in the Top 3 on Google Search and Maps, which drives 30% more customer calls and direction requests. Would you like us to audit your listing?"
    # Questions about WhatsApp system
    elif any(w in words for w in ["whatsapp", "booking", "orders", "order", "delivery"]):
        reply = "Our 1-tap WhatsApp booking button lets customers order or book directly with you without paying 20-30% commissions to third-party apps. Would you like a quick demo?"
    # Agreement / Positive Interest
    elif any(w in words for w in ["yes", "sure", "send", "okay", "ok", "interested", "yeah", "yep", "certainly"]) or "send me" in speech_lower or "tell me" in speech_lower:
        reply = "Fantastic! I have noted your interest and will send our 1-page overview directly to your WhatsApp. Thank you for your time, and have a wonderful day!"
    # Rejection / Opt-out (Exact whole words only)
    elif ("not interested" in speech_lower or "stop calling" in speech_lower or "don't call" in speech_lower or "remove" in words or "busy" in words or "later" in words):
        reply = "I completely understand. Thank you so much for your time today, and have a great day ahead!"
    else:
        reply = "We help local businesses grow with fast custom websites, top Google Maps ranking, and commission-free WhatsApp ordering. Would you like us to send a 1-page breakdown on WhatsApp?"

    CALL_HISTORIES[session_id].append({"role": "model", "text": reply})
    return reply


app = FastAPI(title="Twilio Realtime AI Voice Stream Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=JSONResponse)
async def index_page():
    return {
        "status": "online",
        "service": "Twilio Realtime Voice Streaming Server",
        "engine": AI_ENGINE,
        "gemini_configured": bool(GEMINI_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY),
        "twilio_configured": bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER),
    }


async def parse_request_data(request: Request) -> Dict[str, Any]:
    """Parse form data, JSON, or query parameters safely without python-multipart dependency."""
    data = dict(request.query_params)
    try:
        body_bytes = await request.body()
        if body_bytes:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                data.update(json.loads(body_bytes.decode("utf-8")))
            else:
                parsed_form = urllib.parse.parse_qs(body_bytes.decode("utf-8"))
                for k, v in parsed_form.items():
                    data[k] = v[0] if len(v) == 1 else v
    except Exception:
        pass
    return data


# Django Database Sync & Automated Post-Call Intel Pipeline
try:
    import django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    django.setup()
    from leads.models import Lead, CallSession, CallTranscriptTurn
    from agents.workflow_orchestrator import WorkflowOrchestrator
    DJANGO_AVAILABLE = True
except Exception as e:
    DJANGO_AVAILABLE = False
    print(f" [Django Setup Warning]: {e}")


def sync_call_turn_to_django(session_id: str, speaker: str, text: str, phone: str = ""):
    """Record spoken turn into Django CallSession and CallTranscriptTurn in real-time."""
    if not DJANGO_AVAILABLE or not text.strip():
        return None
    try:
        call = None
        if session_id:
            try:
                call = CallSession.objects.filter(pk=session_id).first()
            except Exception:
                pass
        if not call and phone:
            clean_p = phone.strip()
            call = CallSession.objects.filter(target_phone__icontains=clean_p[-10:]).order_by('-created_at').first()
        if not call:
            clean_p = phone.strip() or "+918219562353"
            lead = Lead.objects.filter(phone__icontains=clean_p[-10:]).first()
            if not lead:
                import uuid
                lead = Lead.objects.create(
                    lead_id=f"call_{uuid.uuid4().hex[:6]}",
                    business_name="Live Calling Client",
                    phone=clean_p,
                    city="Solan",
                    calling_approved=True,
                    lead_score=80
                )
            call = CallSession.objects.create(
                lead=lead,
                status='connected',
                call_type='twilio_phone',
                target_phone=clean_p,
                telephony_provider='TwilioProvider'
            )

        last_turn = call.transcript_turns.order_by('-turn_index').first()
        next_idx = (last_turn.turn_index + 1) if last_turn else 0
        CallTranscriptTurn.objects.create(
            call_session=call,
            speaker=speaker,
            text=text.strip(),
            turn_index=next_idx
        )
        return call
    except Exception as e:
        print(f" [Django Sync Exception]: {e}")
        return None


def trigger_post_call_pipeline(session_id: str, phone: str = ""):
    """Execute Intelligence Extraction and Strategy Agent when a phone call completes."""
    if not DJANGO_AVAILABLE:
        return
    try:
        call = None
        if session_id:
            try:
                call = CallSession.objects.filter(pk=session_id).first()
            except Exception:
                pass
        if not call and phone:
            clean_p = phone.strip()
            call = CallSession.objects.filter(target_phone__icontains=clean_p[-10:]).order_by('-created_at').first()

        if call and call.transcript_turns.count() > 0:
            call.status = 'completed'
            call.save(update_fields=['status'])
            print(f" [Post-Call Pipeline]: Extracting conversation intelligence for {call.lead.business_name}...")
            orchestrator = WorkflowOrchestrator()
            intel = orchestrator.intelligence_agent.extract_intelligence(call)
            print(f" [Post-Call Pipeline]: Intelligence extracted! Generating Next Step Plan & Strategy...")
            strat = orchestrator.strategy_agent.generate_strategy(call.lead)
            orchestrator.scorer.update_lead_score(call.lead)
            print(f" [Post-Call Pipeline]: Next Step Plan successfully generated for {call.lead.business_name}!")
    except Exception as e:
        print(f" [Post-Call Pipeline Error]: {e}")


@app.api_route("/api/calls/twilio/webhook", methods=["GET", "POST"])
@app.api_route("/incoming-call", methods=["GET", "POST"])
async def handle_twilio_voice_webhook(request: Request):
    """
    Twilio Outbound/Inbound Call Webhook:
    Greets the caller in natural neural voice and begins speech listening.
    """
    data = await parse_request_data(request)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:5050"
    scheme = "https" if ("ngrok" in host or request.url.scheme == "https") else "http"
    session_id = data.get("session_id", "")
    called_phone = data.get("To", "") or data.get("Called", "") or data.get("From", "")

    opening_text = (
        "Hello! This is Antigravity Voice Assistant calling on behalf of Digital Growth Lab. "
        "We help local businesses capture 30 percent more customer inquiries through verified Google ranking "
        "and 1-tap WhatsApp booking with zero commission fees. Am I speaking with the owner or manager?"
    )

    # Sync Opening Turn to Django DB
    sync_call_turn_to_django(session_id, speaker="agent", text=opening_text, phone=called_phone)

    next_turn_url = f"{scheme}://{host}/api/calls/twilio/turn?session_id={session_id}"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">{opening_text}</Say>
    <Gather input="speech" action="{next_turn_url}" method="POST" speechTimeout="auto" timeout="5" language="en-IN">
        <Say voice="Polly.Aditi" language="en-IN">Please go ahead, I am listening.</Say>
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Thank you for speaking with Digital Growth Lab. Have a wonderful day.</Say>
    <Hangup/>
</Response>"""
    return HTMLResponse(content=twiml, media_type="application/xml")


@app.api_route("/api/calls/twilio/turn", methods=["GET", "POST"])
async def handle_twilio_turn(request: Request, background_tasks: BackgroundTasks):
    """
    Twilio Speech Turn Webhook:
    Receives caller's speech from their phone, feeds into Gemini AI, and speaks back in real time.
    """
    data = await parse_request_data(request)
    speech_result = data.get("SpeechResult", "").strip()
    session_id = data.get("session_id", "")
    phone = data.get("To", "") or data.get("From", "")

    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:5050"
    scheme = "https" if ("ngrok" in host or request.url.scheme == "https") else "http"
    next_turn_url = f"{scheme}://{host}/api/calls/twilio/turn?session_id={session_id}"

    print(f" [Phone Caller Spoke]: \"{speech_result}\"")

    if not speech_result:
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">I did not catch that clearly. Could you please repeat?</Say>
    <Gather input="speech" action="{next_turn_url}" method="POST" speechTimeout="auto" timeout="4" language="en-IN">
        <Say voice="Polly.Aditi" language="en-IN">I am listening.</Say>
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Thank you and have a great day.</Say>
    <Hangup/>
</Response>"""
        return HTMLResponse(content=twiml, media_type="application/xml")

    # Sync Caller Turn to Django DB
    sync_call_turn_to_django(session_id, speaker="lead", text=speech_result, phone=phone)

    # Generate response via Gemini
    agent_response = await generate_llm_response(speech_result, session_id=session_id or "default")
    print(f" [AI Spoken Reply]: \"{agent_response}\"")

    # Sync AI Response Turn to Django DB
    sync_call_turn_to_django(session_id, speaker="agent", text=agent_response, phone=phone)

    is_final = any(w in speech_result.lower() for w in ["bye", "goodbye", "not interested", "stop calling", "remove my number"])

    if is_final:
        background_tasks.add_task(trigger_post_call_pipeline, session_id, phone)
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">{agent_response}</Say>
    <Hangup/>
</Response>"""
    else:
        # Also schedule pipeline in background so intelligence updates after each turn
        background_tasks.add_task(trigger_post_call_pipeline, session_id, phone)
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">{agent_response}</Say>
    <Gather input="speech" action="{next_turn_url}" method="POST" speechTimeout="auto" timeout="5" language="en-IN">
        <Say voice="Polly.Aditi" language="en-IN">Please go ahead, I am listening.</Say>
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">Thank you for your time with Digital Growth Lab. Have a wonderful day.</Say>
    <Hangup/>
</Response>"""

    return HTMLResponse(content=twiml, media_type="application/xml")


@app.api_route("/api/calls/twilio/status", methods=["GET", "POST"])
async def handle_twilio_status(request: Request, background_tasks: BackgroundTasks):
    """
    Twilio Status Callback: Acknowledge status updates and trigger post-call analysis upon hangup.
    """
    data = await parse_request_data(request)
    session_id = data.get("session_id", "")
    phone = data.get("To", "") or data.get("From", "")
    call_status = data.get("CallStatus", "").lower()

    if call_status in ["completed", "no-answer", "busy", "canceled", "failed"]:
        background_tasks.add_task(trigger_post_call_pipeline, session_id, phone)

    return HTMLResponse(content="<Response/>", media_type="application/xml")


@app.post("/call")
async def place_outbound_call(request: Request):
    """
    Trigger an outbound cellular phone call via Twilio and bridge to the Realtime AI Voice Stream.
    """
    data = await request.json()
    to_phone = data.get("phone", "").strip()
    business_name = data.get("business_name", "your business")
    contact_person = data.get("contact_person", "there")
    city = data.get("city", "Solan")

    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER):
        return JSONResponse(
            status_code=400,
            content={"error": "Twilio credentials are not fully configured in .env."}
        )

    if not to_phone:
        return JSONResponse(status_code=400, content={"error": "Phone number is required."})

    # Normalize phone
    if not to_phone.startswith("+"):
        digits = "".join(filter(str.isdigit, to_phone))
        to_phone = f"+91{digits}" if len(digits) == 10 else f"+{digits}"

    # Check for public tunnel URL (ngrok, cloudflared, custom domain)
    custom_public_url = (data.get("public_url") or os.getenv("PUBLIC_WEBHOOK_URL", "")).strip()
    if custom_public_url:
        clean_host = custom_public_url.replace("https://", "").replace("http://", "").replace("wss://", "").replace("ws://", "").rstrip("/")
        host = clean_host
        scheme = "wss"
    else:
        host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:5050"
        scheme = "wss" if "ngrok" in host or request.url.scheme == "https" else "ws"

    is_local_host = host.startswith("localhost") or host.startswith("127.0.0.1")

    # Dynamic system context for this specific lead
    lead_prompt = (
        f"{SYSTEM_MESSAGE}\n\n"
        f"You are calling regarding: {business_name} in {city}.\n"
        f"The contact person is: {contact_person}.\n"
        f"When the call starts, greet them warmly: 'Hello {contact_person}! This is Antigravity Voice Assistant calling from Digital Growth Lab regarding {business_name} in {city}. Am I speaking with the owner?'"
    )

    session_id = f"direct_{to_phone[-6:] if len(to_phone) >= 6 else 'call'}"
    http_host = host if not ("localhost" in host or "127.0.0.1" in host) else "octagonally-unexpectable-aryan.ngrok-free.dev"
    webhook_url = f"https://{http_host}/api/calls/twilio/webhook?session_id={session_id}"

    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        call = client.calls.create(
            to=to_phone,
            from_=TWILIO_FROM_NUMBER,
            url=webhook_url
        )
        return {
            "success": True,
            "call_sid": call.sid,
            "status": call.status,
            "to": to_phone,
            "is_live_stream": True,
            "message": f"Real phone call initiated to {to_phone}! Answer your phone to talk live with the AI."
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.websocket("/media-stream")
async def handle_media_stream(websocket: WebSocket):
    """
    Main WebSocket bridge between Twilio Media Streams and Gemini / OpenAI Realtime API.
    """
    await websocket.accept()
    print(" Twilio Call Connected to Media Stream")

    # Extract query params for custom business instructions
    query_params = dict(websocket.query_params)
    custom_prompt = query_params.get("prompt") or SYSTEM_MESSAGE

    if AI_ENGINE == "gemini" and GEMINI_API_KEY:
        await handle_gemini_realtime_stream(websocket, custom_prompt)
    elif OPENAI_API_KEY:
        await handle_openai_realtime_stream(websocket, custom_prompt)
    else:
        print(" Error: No API key found for Gemini or OpenAI Realtime.")
        await websocket.close()


async def handle_gemini_realtime_stream(websocket: WebSocket, system_instruction: str):
    """
    Connects Twilio to Google Gemini Multimodal Live Audio WebSocket.
    """
    import websockets

    # Gemini 2.0 Flash Multimodal Live WebSocket URL
    gemini_ws_url = (
        f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
        f"?key={GEMINI_API_KEY}"
    )

    stream_sid = None

    try:
        async with websockets.connect(gemini_ws_url) as gemini_ws:
            print(" Connected to Google Gemini Live Audio API!")

            # 1. Send Initial Setup Configuration
            setup_msg = {
                "setup": {
                    "model": "models/gemini-2.0-flash-exp",
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": GEMINI_VOICE
                                }
                            }
                        }
                    },
                    "systemInstruction": {
                        "parts": [{"text": system_instruction}]
                    }
                }
            }
            await gemini_ws.send(json.dumps(setup_msg))

            # 2. Receive from Twilio -> Send to Gemini
            async def receive_from_twilio():
                nonlocal stream_sid
                try:
                    async for raw_msg in websocket.iter_text():
                        msg = json.loads(raw_msg)
                        event = msg.get("event")

                        if event == "media":
                            payload_b64 = msg["media"]["payload"]
                            mulaw_data = base64.b64decode(payload_b64)
                            # Convert Twilio μ-law 8kHz -> PCM 16kHz
                            pcm_16k = mulaw_8k_to_pcm_16k(mulaw_data)
                            pcm_b64 = base64.b64encode(pcm_16k).decode("utf-8")

                            # Send realtime audio chunk to Gemini
                            gemini_audio_chunk = {
                                "realtimeInput": {
                                    "mediaChunks": [
                                        {
                                            "mimeType": "audio/pcm;rate=16000",
                                            "data": pcm_b64
                                        }
                                    ]
                                }
                            }
                            await gemini_ws.send(json.dumps(gemini_audio_chunk))

                        elif event == "start":
                            stream_sid = msg["start"]["streamSid"]
                            print(f" Incoming Twilio Stream Started: {stream_sid}")

                        elif event == "stop":
                            print(f" Twilio Stream Ended: {stream_sid}")
                            break

                except WebSocketDisconnect:
                    print(" Twilio client disconnected.")
                except Exception as e:
                    print(f" Twilio read error: {e}")

            # 3. Receive from Gemini -> Send to Twilio
            async def send_to_twilio():
                nonlocal stream_sid
                try:
                    async for raw_gemini_resp in gemini_ws:
                        resp = json.loads(raw_gemini_resp)
                        server_content = resp.get("serverContent")

                        if server_content:
                            # Check if the user interrupted the AI
                            if server_content.get("interrupted"):
                                print(" [Interruption Detected] Clearing Twilio audio buffer...")
                                if stream_sid:
                                    await websocket.send_json({"event": "clear", "streamSid": stream_sid})

                            model_turn = server_content.get("modelTurn")
                            if model_turn:
                                for part in model_turn.get("parts", []):
                                    inline_data = part.get("inlineData")
                                    if inline_data and inline_data.get("mimeType", "").startswith("audio/"):
                                        raw_pcm_24k = base64.b64decode(inline_data["data"])
                                        # Convert Gemini PCM 24kHz -> Twilio μ-law 8kHz
                                        mulaw_8k = pcm_24k_to_mulaw_8k(raw_pcm_24k)
                                        mulaw_b64 = base64.b64encode(mulaw_8k).decode("utf-8")

                                        if stream_sid:
                                            media_msg = {
                                                "event": "media",
                                                "streamSid": stream_sid,
                                                "media": {"payload": mulaw_b64}
                                            }
                                            await websocket.send_json(media_msg)

                except Exception as e:
                    print(f" Gemini stream write error: {e}")

            await asyncio.gather(receive_from_twilio(), send_to_twilio())

    except Exception as e:
        print(f" Gemini Live connection error: {e}")


async def handle_openai_realtime_stream(websocket: WebSocket, system_instruction: str):
    """
    Connects Twilio to OpenAI Realtime API (native μ-law audio stream).
    """
    import websockets

    openai_ws_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "OpenAI-Beta": "realtime=v1"}

    stream_sid = None

    try:
        async with websockets.connect(openai_ws_url, additional_headers=headers) as openai_ws:
            print(" Connected to OpenAI Realtime API!")

            # 1. Initialize session with native μ-law audio
            session_init = {
                "type": "session.update",
                "session": {
                    "modalities": ["audio", "text"],
                    "instructions": system_instruction,
                    "voice": OPENAI_VOICE,
                    "input_audio_format": "g711_ulaw",
                    "output_audio_format": "g711_ulaw",
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 500
                    }
                }
            }
            await openai_ws.send(json.dumps(session_init))

            async def receive_from_twilio():
                nonlocal stream_sid
                try:
                    async for raw_msg in websocket.iter_text():
                        msg = json.loads(raw_msg)
                        event = msg.get("event")

                        if event == "media":
                            audio_append = {
                                "type": "input_audio_buffer.append",
                                "audio": msg["media"]["payload"]
                            }
                            await openai_ws.send(json.dumps(audio_append))

                        elif event == "start":
                            stream_sid = msg["start"]["streamSid"]
                            print(f" OpenAI Stream Started: {stream_sid}")

                except WebSocketDisconnect:
                    print(" Twilio client disconnected.")
                except Exception as e:
                    print(f" Twilio read error: {e}")

            async def send_to_twilio():
                nonlocal stream_sid
                try:
                    async for raw_openai_msg in openai_ws:
                        resp = json.loads(raw_openai_msg)
                        event_type = resp.get("type")

                        if event_type == "response.audio.delta":
                            audio_payload = resp.get("delta")
                            if audio_payload and stream_sid:
                                media_msg = {
                                    "event": "media",
                                    "streamSid": stream_sid,
                                    "media": {"payload": audio_payload}
                                }
                                await websocket.send_json(media_msg)

                        elif event_type == "input_audio_buffer.speech_started":
                            print(" [Interruption Detected] Clearing Twilio audio buffer...")
                            if stream_sid:
                                await websocket.send_json({"event": "clear", "streamSid": stream_sid})

                except Exception as e:
                    print(f" OpenAI stream write error: {e}")

            await asyncio.gather(receive_from_twilio(), send_to_twilio())

    except Exception as e:
        print(f" OpenAI Realtime connection error: {e}")


if __name__ == "__main__":
    import uvicorn
    print(f" Starting Realtime Voice Stream Server on http://0.0.0.0:{PORT} (Engine: {AI_ENGINE})")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
