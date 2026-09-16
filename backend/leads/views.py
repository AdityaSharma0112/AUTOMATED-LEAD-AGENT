import csv
import re
import secrets
import datetime
from io import StringIO
import uuid as uuid_lib
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token

from .models import (
    EmailOTP,
    SearchJob,
    Lead,
    CallSession,
    ConversationIntelligence,
    Strategy,
    AuditEvent,
    SystemSetting
)
from .serializers import (
    SearchJobSerializer,
    LeadListSerializer,
    LeadDetailSerializer,
    CallSessionSerializer,
    ConversationIntelligenceSerializer,
    StrategySerializer,
    AuditEventSerializer,
    SystemSettingSerializer
)
from agents.workflow_orchestrator import WorkflowOrchestrator
from agents.calling_agent import CallingAgent
from agents.strategy_agent import StrategyAgent


def get_user_leads_qs(user):
    """
    Returns queryset of leads owned by the user.
    If legacy leads with user=None exist, auto-claims them for the first active authenticated user.
    """
    if not user or not user.is_authenticated:
        return Lead.objects.filter(user__isnull=True)
    
    # Auto-claim orphan leads if this user is authenticated and has no leads yet
    if not Lead.objects.filter(user=user).exists() and Lead.objects.filter(user__isnull=True).exists():
        Lead.objects.filter(user__isnull=True).update(user=user)
        SearchJob.objects.filter(user__isnull=True).update(user=user)

    return Lead.objects.filter(user=user)


def get_user_search_jobs_qs(user):
    """
    Returns queryset of search jobs owned by the user.
    """
    if not user or not user.is_authenticated:
        return SearchJob.objects.filter(user__isnull=True)
    if not SearchJob.objects.filter(user=user).exists() and SearchJob.objects.filter(user__isnull=True).exists():
        SearchJob.objects.filter(user__isnull=True).update(user=user)
    return SearchJob.objects.filter(user=user)


# ============================================================================
# AUTHENTICATION: EMAIL + OTP LOGIN & SIGNUP VIEWS
# ============================================================================

import logging
logger = logging.getLogger(__name__)

class SendOTPAPIView(APIView):
    """
    POST /api/auth/send-otp: Generate and send a 6-digit verification code to the user's email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            email = request.data.get("email", "").strip().lower()
            if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                return Response({"error": "Please provide a valid email address."}, status=status.HTTP_400_BAD_REQUEST)

            # Generate 6-digit numeric OTP
            otp_code = f"{secrets.randbelow(900000) + 100000}"
            expires_at = timezone.now() + datetime.timedelta(minutes=10)

            # Invalidate prior active OTPs for this email
            EmailOTP.objects.filter(email=email, is_used=False).update(is_used=True)

            EmailOTP.objects.create(
                email=email,
                otp_code=otp_code,
                expires_at=expires_at
            )

            # Send Email notification
            subject = f"[AUTOMATED-LEAD-AGENT] Your Verification Code: {otp_code}"
            message = (
                f"Hello,\n\n"
                f"Your one-time login & signup verification code is:\n\n"
                f"   {otp_code}\n\n"
                f"This code will expire in 10 minutes.\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"— Priya from Digital Growth Hub"
            )
            # Send Email notification asynchronously in background thread so HTTP response returns instantly
            import threading
            has_smtp = bool(getattr(settings, 'EMAIL_HOST_USER', '') and getattr(settings, 'EMAIL_HOST_PASSWORD', ''))

            if has_smtp:
                def _async_send_email():
                    try:
                        from_addr = getattr(settings, 'DEFAULT_FROM_EMAIL', '') or settings.EMAIL_HOST_USER
                        send_mail(
                            subject=subject,
                            message=message,
                            from_email=from_addr,
                            recipient_list=[email],
                            fail_silently=False
                        )
                        logger.info(f"Successfully sent OTP email to {email}")
                    except Exception as e:
                        logger.error(f"Failed to send email to {email} via SMTP: {e}")
                        print(f"[EMAIL ERROR] Could not deliver OTP email to {email}: {e}")

                threading.Thread(target=_async_send_email, daemon=True).start()

            response_data = {
                "success": True,
                "message": f"Verification code sent to {email}",
                "email": email,
                "dev_otp": otp_code,
            }

            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("SendOTP error")
            return Response({"error": f"Failed to generate OTP: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyOTPAPIView(APIView):
    """
    POST /api/auth/verify-otp: Verify 6-digit code, create/retrieve user, and issue Auth Token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        otp_code = request.data.get("otp_code", "").strip()
        full_name = request.data.get("full_name", "").strip()

        if not email or not otp_code:
            return Response({"error": "Email and verification code are required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects.filter(email=email, otp_code=otp_code, is_used=False).order_by('-created_at').first()

        if not otp_record or not otp_record.is_valid():
            return Response({"error": "Invalid or expired verification code. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        # Find or create User
        user = User.objects.filter(email__iexact=email).first()
        is_new_user = False
        if not user:
            # Check if username is taken
            base_username = email.split("@")[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            first_name = ""
            last_name = ""
            if full_name:
                parts = full_name.split(" ", 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ""

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            is_new_user = True

            # If there are orphan leads in DB, claim them for this initial user
            if Lead.objects.filter(user__isnull=True).exists():
                Lead.objects.filter(user__isnull=True).update(user=user)
                SearchJob.objects.filter(user__isnull=True).update(user=user)

        # Generate or retrieve Auth Token
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.get_full_name() or user.username,
                "is_new_user": is_new_user,
            }
        }, status=status.HTTP_200_OK)


class UserProfileAPIView(APIView):
    """
    GET /api/auth/me: Retrieve current authenticated user's profile and stats.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        leads_count = Lead.objects.filter(user=user).count()
        calls_count = CallSession.objects.filter(lead__user=user).count()
        return Response({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "leads_count": leads_count,
            "calls_count": calls_count,
        })


class LogoutAPIView(APIView):
    """
    POST /api/auth/logout: Invalidate auth token for active user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"success": True, "message": "Logged out successfully."}, status=status.HTTP_200_OK)


# ============================================================================
# SEARCH & LEAD DISCOVERY VIEWS
# ============================================================================


class SearchAPIView(APIView):
    """
    POST /api/search: Initiate natural language or direct city/category lead discovery.
    GET /api/search: List recent search jobs.
    """
    def post(self, request):
        query = request.data.get("query", "").strip()
        city = request.data.get("city", "").strip()
        category = request.data.get("category", "").strip()
        radius_km = request.data.get("radius_km", 30.0)
        website_filter = request.data.get("website_filter", "no_website")
        lat = request.data.get("lat")
        lon = request.data.get("lon")

        explicit_intent = None
        if city or category:
            target_city = city or "Solan"
            target_category = category or "Local Businesses"
            try:
                rad_val = float(radius_km)
            except (ValueError, TypeError):
                rad_val = 30.0

            explicit_intent = {
                "category": target_category,
                "location": target_city,
                "radius_km": rad_val,
                "website_filter": website_filter,
                "lat": lat,
                "lon": lon,
                "target_attributes": []
            }
            if not query:
                query = f"Find {target_category} in {target_city} within {rad_val}km (Filter: {website_filter})"

        if not query:
            return Response({"error": "Query string or City/Category is required."}, status=status.HTTP_400_BAD_REQUEST)

        orchestrator = WorkflowOrchestrator()
        user = request.user if request.user.is_authenticated else None
        job = orchestrator.run_search_pipeline(query=query, explicit_intent=explicit_intent, user=user)
        serializer = SearchJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get(self, request):
        jobs = get_user_search_jobs_qs(request.user).order_by('-created_at')[:20]
        serializer = SearchJobSerializer(jobs, many=True)
        return Response(serializer.data)


class SearchJobDetailAPIView(APIView):
    """
    GET /api/search/<id>: Retrieve single search job with discovered leads.
    """
    def get(self, request, pk):
        job = get_object_or_404(SearchJob, pk=pk)
        if job.user and request.user.is_authenticated and job.user != request.user:
            return Response({"error": "Unauthorized access to this search job."}, status=status.HTTP_403_FORBIDDEN)
        serializer = SearchJobSerializer(job)
        return Response(serializer.data)


class LeadListAPIView(APIView):
    """
    GET /api/leads: Filter, sort, and paginate leads strictly for the authenticated user.
    DELETE /api/leads: Clear all leads for this user.
    """
    def get(self, request):
        queryset = get_user_leads_qs(request.user).exclude(
            Q(business_name__icontains="Hub (") |
            Q(business_name__icontains="(justdial)") |
            Q(business_name__icontains="(indiamart)") |
            Q(business_name__icontains="(sulekha)") |
            Q(business_name__icontains="Directory Source") |
            Q(business_name__icontains="Unknown Business") |
            Q(business_name__iendswith=" General Store & Grocery") |
            Q(business_name__iendswith=" Car Repair & Mechanic") |
            Q(business_name__icontains="PwZekb")
        ).distinct()

        # Filters
        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__icontains=category)

        city = request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__icontains=city)

        website_status = request.query_params.get("website_status")
        if website_status:
            queryset = queryset.filter(website_status=website_status)

        min_score = request.query_params.get("min_score")
        if min_score:
            try:
                queryset = queryset.filter(lead_score__gte=int(min_score))
            except ValueError:
                pass

        approved_only = request.query_params.get("approved_only")
        if approved_only == 'true':
            queryset = queryset.filter(calling_approved=True)

        q = request.query_params.get("q")
        if q:
            queryset = queryset.filter(
                Q(business_name__icontains=q) |
                Q(category__icontains=q) |
                Q(city__icontains=q) |
                Q(phone__icontains=q)
            )

        serializer = LeadListSerializer(queryset, many=True)
        return Response(serializer.data)

    def delete(self, request):
        user_leads = get_user_leads_qs(request.user)
        count = user_leads.count()
        user_leads.delete()
        get_user_search_jobs_qs(request.user).delete()
        return Response({"message": f"Cleared {count} leads and your search history."}, status=status.HTTP_200_OK)


@api_view(['POST'])
def clear_all_leads(request):
    """
    POST /api/leads/clear: Wipe leads and search history for active user.
    """
    user_leads = get_user_leads_qs(request.user)
    count = user_leads.count()
    user_leads.delete()
    get_user_search_jobs_qs(request.user).delete()
    return Response({"message": f"Successfully deleted {count} leads."}, status=status.HTTP_200_OK)


class LeadDetailAPIView(APIView):
    """
    GET /api/leads/<id>: 360-degree complete Lead profile.
    DELETE /api/leads/<id>: Remove lead record.
    """
    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        serializer = LeadDetailSerializer(lead)
        return Response(serializer.data)

    def delete(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        lead.delete()
        return Response({"message": "Lead deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def toggle_lead_calling_approval(request, pk):
    """
    POST /api/leads/<id>/approve_call: Toggle or set human calling approval gate.
    """
    lead = get_object_or_404(Lead, pk=pk)
    approved = request.data.get("approved")
    if approved is None:
        lead.calling_approved = not lead.calling_approved
    else:
        lead.calling_approved = bool(approved)

    lead.save(update_fields=['calling_approved'])
    return Response({
        "lead_id": lead.lead_id,
        "calling_approved": lead.calling_approved,
        "message": f"Calling approval set to {lead.calling_approved}"
    })


@api_view(['POST'])
def reverify_lead(request, pk):
    """
    POST /api/leads/<id>/verify: Re-run verification and website presence detection.
    """
    lead = get_object_or_404(Lead, pk=pk)
    orchestrator = WorkflowOrchestrator()
    lead = orchestrator.reverify_lead(lead)
    serializer = LeadDetailSerializer(lead)
    return Response(serializer.data)


class CallSessionAPIView(APIView):
    """
    POST /api/calls: Initiate an approved call session (web_voice, twilio_phone, or simulation).
    GET /api/calls: List recent call sessions.
    """
    def post(self, request):
        lead_id = request.data.get("lead_id")
        call_type = request.data.get("call_type", "twilio_phone")
        custom_phone = request.data.get("phone")
        webhook_base_url = request.data.get("webhook_base_url")

        if not lead_id:
            return Response({"error": "lead_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        lead = get_object_or_404(Lead, pk=lead_id)
        calling_agent = CallingAgent()

        try:
            if call_type == "simulation":
                call_session = calling_agent.simulate_full_call(lead)
            else:
                call_session = calling_agent.initiate_call(
                    lead=lead,
                    call_type=call_type,
                    webhook_base_url=webhook_base_url,
                    custom_phone=custom_phone
                )
            serializer = CallSessionSerializer(call_session)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except PermissionError as pe:
            return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        user_leads = get_user_leads_qs(request.user)
        calls = CallSession.objects.filter(lead__in=user_leads).order_by('-created_at')[:50]
        serializer = CallSessionSerializer(calls, many=True)
        return Response(serializer.data)


@api_view(['POST'])
def quick_call_view(request):
    """
    POST /api/calls/quick-call: Direct phone call to any custom number & business details.
    """
    phone = request.data.get("phone", "").strip()
    business_name = request.data.get("business_name", "").strip()
    category = request.data.get("category", "Local Business").strip()
    contact_person = request.data.get("contact_person", "Business Owner").strip()
    city = request.data.get("city", "Solan").strip()
    notes = request.data.get("notes", "").strip()
    call_type = request.data.get("call_type", "twilio_phone")
    webhook_base_url = request.data.get("webhook_base_url")

    if not phone:
        return Response({"error": "Phone number is required for outbound cellular call."}, status=status.HTTP_400_BAD_REQUEST)

    calling_agent = CallingAgent()
    user = request.user if request.user.is_authenticated else None
    try:
        call_session = calling_agent.call_custom_number(
            phone_number=phone or "Direct Web Caller",
            business_name=business_name or "Custom Client",
            category=category,
            contact_person=contact_person,
            city=city,
            notes=notes,
            call_type=call_type,
            webhook_base_url=webhook_base_url,
            user=user
        )
        serializer = CallSessionSerializer(call_session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def process_interactive_turn(request, pk):
    """
    POST /api/calls/<id>/turn: Send real-time user speech and receive AI voice dialogue + collected queries.
    """
    call_session = get_object_or_404(CallSession, pk=pk)
    user_speech = request.data.get("speech", "").strip()

    if not user_speech:
        return Response({"error": "speech is required."}, status=status.HTTP_400_BAD_REQUEST)

    calling_agent = CallingAgent()
    result = calling_agent.process_turn(call_session, user_speech)
    return Response(result)


@api_view(['POST'])
def end_call_session(request, pk):
    """
    POST /api/calls/<id>/end: Finish call session and trigger conversation intel + strategy.
    """
    call_session = get_object_or_404(CallSession, pk=pk)
    orchestrator = WorkflowOrchestrator()

    call_session.status = 'completed'
    call_session.save(update_fields=['status'])

    # Extract intelligence & generate strategy
    orchestrator.intelligence_agent.extract_intelligence(call_session)
    orchestrator.scorer.update_lead_score(call_session.lead)
    orchestrator.strategy_agent.generate_strategy(call_session.lead)

    serializer = CallSessionSerializer(call_session)
    return Response(serializer.data)


def get_call_session_safe(session_id):
    """Safely fetch CallSession by UUID, preventing database ValidationError crashes."""
    if not session_id:
        return None
    try:
        if isinstance(session_id, uuid_lib.UUID):
            return CallSession.objects.filter(pk=session_id).first()
        # Validate format
        cleaned_id = str(session_id).strip()
        parsed_uuid = uuid_lib.UUID(cleaned_id)
        return CallSession.objects.filter(pk=parsed_uuid).first()
    except Exception:
        return None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def twilio_voice_webhook(request):
    """
    Twilio Outbound Call Greeting Webhook: Returns initial TwiML greeting with Amazon Polly voice.
    Fault-tolerant: always returns valid XML even if parameters are missing or invalid.
    """
    try:
        session_id = request.GET.get("session_id") or request.POST.get("session_id")
        call_session = get_call_session_safe(session_id)

        lead = call_session.lead if call_session else None
        business_name = lead.business_name if lead else (call_session.custom_business_name if call_session else "your business")
        contact_person = lead.contact_person if (lead and lead.contact_person) else "there"
        city = lead.city if (lead and lead.city) else "Solan"

        opening_text = (
            f"Hello {contact_person}! This is Priya calling from Digital Growth Hub regarding {business_name} in {city}. "
            f"Am I speaking with the owner or manager?"
        )

        public_url = os.getenv("PUBLIC_WEBHOOK_URL", "").strip()
        if public_url and "ngrok-free.dev" not in public_url and "localhost" not in public_url:
            host = public_url.rstrip('/')
        else:
            host = request.build_absolute_uri('/').rstrip('/')
            if host.startswith("http://") and "localhost" not in host and "127.0.0.1" not in host:
                host = host.replace("http://", "https://", 1)
            if not host or "localhost" in host or "127.0.0.1" in host or "ngrok-free.dev" in host:
                host = "https://automated-lead-agent.onrender.com"

        if not host.startswith("http://") and not host.startswith("https://"):
            host = f"https://{host}"

        sid_query = f"?session_id={session_id}" if session_id else ""
        next_turn_url = f"{host.rstrip('/')}/api/calls/twilio/turn{sid_query}"

        from providers.telephony.twilio_provider import TwilioProvider
        twiml = TwilioProvider().generate_twiml_response(
            agent_speech=opening_text,
            next_turn_url=next_turn_url,
            is_final=False
        )
        return HttpResponse(twiml, content_type='text/xml; charset=utf-8')
    except Exception as e:
        print(f"[Twilio Webhook Error] {e}")
        from providers.telephony.twilio_provider import TwilioProvider
        twiml = TwilioProvider().generate_twiml_response(
            "Hello! This is Priya from Digital Growth Hub. Am I speaking with the owner or manager?",
            "",
            is_final=False
        )
        return HttpResponse(twiml, content_type='text/xml; charset=utf-8')


@csrf_exempt
@require_http_methods(["GET", "POST"])
def twilio_turn_webhook(request):
    """
    Twilio Speech Gather Turn Webhook: Receives SpeechResult from phone recipient,
    feeds into Gemini LLM, and returns next TwiML turn response.
    """
    try:
        session_id = request.GET.get("session_id") or request.POST.get("session_id")
        speech_result = (request.POST.get("SpeechResult") or request.GET.get("SpeechResult") or "").strip()

        call_session = get_call_session_safe(session_id)
        if not call_session:
            from providers.telephony.twilio_provider import TwilioProvider
            twiml = TwilioProvider().generate_twiml_response(
                "Thank you for speaking with Priya from Digital Growth Hub. Have a wonderful day.",
                "",
                is_final=True
            )
            return HttpResponse(twiml, content_type='text/xml; charset=utf-8')

        calling_agent = CallingAgent()
        if speech_result:
            res = calling_agent.process_turn(call_session, speech_result)
            agent_resp = res.get("agent_response", "I understand. How else can we assist your business?")
            action = res.get("action", "continue")
        else:
            agent_resp = "I did not catch that clearly. Could you please repeat?"
            action = "continue"

        is_final = action in ["complete_call", "opt_out", "end_call"]

        public_url = os.getenv("PUBLIC_WEBHOOK_URL", "").strip()
        if public_url and "ngrok-free.dev" not in public_url and "localhost" not in public_url:
            host = public_url.rstrip('/')
        else:
            host = request.build_absolute_uri('/').rstrip('/')
            if host.startswith("http://") and "localhost" not in host and "127.0.0.1" not in host:
                host = host.replace("http://", "https://", 1)
            if not host or "localhost" in host or "127.0.0.1" in host or "ngrok-free.dev" in host:
                host = "https://automated-lead-agent.onrender.com"

        if not host.startswith("http://") and not host.startswith("https://"):
            host = f"https://{host}"

        sid_query = f"?session_id={session_id}" if session_id else ""
        next_turn_url = f"{host.rstrip('/')}/api/calls/twilio/turn{sid_query}"

        from providers.telephony.twilio_provider import TwilioProvider
        twiml = TwilioProvider().generate_twiml_response(
            agent_speech=agent_resp,
            next_turn_url=next_turn_url,
            is_final=is_final
        )
        return HttpResponse(twiml, content_type='text/xml; charset=utf-8')
    except Exception as e:
        print(f"[Twilio Turn Error] {e}")
        from providers.telephony.twilio_provider import TwilioProvider
        twiml = TwilioProvider().generate_twiml_response(
            "Thank you for your time today. Our team will follow up shortly. Have a wonderful day.",
            "",
            is_final=True
        )
        return HttpResponse(twiml, content_type='text/xml; charset=utf-8')


@csrf_exempt
@require_http_methods(["GET", "POST"])
def twilio_status_webhook(request):
    """
    Twilio Call Status Callback.
    """
    try:
        session_id = request.GET.get("session_id") or request.POST.get("session_id")
        call_status = request.POST.get("CallStatus") or request.GET.get("CallStatus", "completed")
        call_duration = request.POST.get("CallDuration") or request.GET.get("CallDuration", 0)

        call_session = get_call_session_safe(session_id)
        if call_session:
            if call_status in ["completed", "answered"]:
                call_session.status = "completed"
                call_session.duration_seconds = int(call_duration) if str(call_duration).isdigit() else 0
                call_session.save(update_fields=['status', 'duration_seconds'])
    except Exception as e:
        print(f"[Twilio Status Callback Error] {e}")

    return HttpResponse("<Response/>", content_type='text/xml; charset=utf-8')


class StrategyDetailAPIView(APIView):
    """
    GET /api/leads/<id>/strategy: Retrieve strategy for lead.
    POST /api/leads/<id>/strategy/regenerate: Re-generate strategy.
    PUT /api/leads/<id>/strategy: Save manual edits to strategy.
    """
    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        if not hasattr(lead, 'strategy'):
            agent = StrategyAgent()
            agent.generate_strategy(lead)
        serializer = StrategySerializer(lead.strategy)
        return Response(serializer.data)

    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        agent = StrategyAgent()
        strategy = agent.generate_strategy(lead)
        serializer = StrategySerializer(strategy)
        return Response(serializer.data)

    def put(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        strategy = getattr(lead, 'strategy', None)
        if not strategy:
            agent = StrategyAgent()
            strategy = agent.generate_strategy(lead)

        for field in [
            'problem_statement', 'evidence_online', 'evidence_call', 'opportunity',
            'recommended_solutions', 'fit_rationale', 'offer_packages', 'pricing_guidance',
            'pitch_script', 'objections_and_responses', 'next_action', 'follow_up_date'
        ]:
            if field in request.data:
                setattr(strategy, field, request.data[field])

        strategy.save()
        serializer = StrategySerializer(strategy)
        return Response(serializer.data)


@api_view(['POST'])
def refine_strategy_view(request, pk):
    """
    POST /api/leads/<pk>/strategy/refine:
    Use Google Gemini to refine the sales strategy & next step plan based on user instructions.
    """
    lead = get_object_or_404(Lead, pk=pk)
    user_instruction = request.data.get("instruction", "").strip()
    if not user_instruction:
        return Response({"error": "Instruction is required to refine the plan."}, status=status.HTTP_400_BAD_REQUEST)

    agent = StrategyAgent()
    strategy = agent.refine_strategy_with_ai(lead, user_instruction)
    serializer = StrategySerializer(strategy)
    return Response(serializer.data)


@api_view(['POST'])
def regenerate_intelligence_view(request, pk):
    """
    POST /api/leads/<pk>/intelligence/regenerate:
    Re-extract structured conversation intelligence from the latest call transcript.
    """
    lead = get_object_or_404(Lead, pk=pk)
    call_session = lead.calls.order_by('-created_at').first()
    if not call_session:
        return Response({"error": "No call session found for this lead."}, status=status.HTTP_400_BAD_REQUEST)

    orchestrator = WorkflowOrchestrator()
    intel = orchestrator.intelligence_agent.extract_intelligence(call_session)
    orchestrator.scorer.update_lead_score(lead)
    orchestrator.strategy_agent.generate_strategy(lead)

    serializer = ConversationIntelligenceSerializer(intel)
    return Response(serializer.data)


class AuditEventAPIView(APIView):
    """
    GET /api/audit: Stream audit log events.
    """
    def get(self, request):
        events = AuditEvent.objects.all().order_by('-created_at')[:100]
        serializer = AuditEventSerializer(events, many=True)
        return Response(serializer.data)


class SettingsAPIView(APIView):
    """
    GET /api/settings: Get current system settings and provider config.
    POST /api/settings: Update system setting (e.g. kill switch, provider keys).
    """
    def get(self, request):
        settings = SystemSetting.objects.all()
        # Ensure default kill switch and provider entries exist
        kill_switch = SystemSetting.objects.filter(key="kill_switch").first()
        llm_setting = SystemSetting.objects.filter(key="llm_provider").first()
        telephony_setting = SystemSetting.objects.filter(key="telephony_provider").first()

        data = {
            "kill_switch": kill_switch.value if kill_switch else {"active": False},
            "llm_provider": llm_setting.value if llm_setting else {"provider": "groq"},
            "telephony_provider": telephony_setting.value if telephony_setting else {"provider": "web_speech"},
            "all_settings": {s.key: s.value for s in settings}
        }
        return Response(data)

    def post(self, request):
        key = request.data.get("key")
        value = request.data.get("value")

        if not key:
            return Response({"error": "key is required."}, status=status.HTTP_400_BAD_REQUEST)

        setting = SystemSetting.objects.filter(key=key).first()
        if setting:
            setting.value = value
            setting.save()
        else:
            setting = SystemSetting.objects.create(key=key, value=value)

        return Response({"key": setting.key, "value": setting.value, "message": "Setting updated successfully."})


@api_view(['GET'])
def export_leads_csv(request):
    """
    GET /api/leads/export/csv: Export all qualified leads with strategies as CSV for the active user.
    """
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="leads_export.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Lead ID', 'Business Name', 'Category', 'Phone', 'Normalized Phone',
        'City', 'State', 'Website Status', 'Website URL', 'Website Confidence',
        'Rating', 'Reviews', 'Lead Score', 'Calling Approved', 'Opted Out',
        'Buying Intent', 'Next Action', 'Pitch'
    ])

    leads = get_user_leads_qs(request.user)
    for lead in leads:
        intel = getattr(lead, 'intelligence', None)
        strat = getattr(lead, 'strategy', None)
        writer.writerow([
            lead.lead_id,
            lead.business_name,
            lead.category,
            lead.phone,
            lead.normalized_phone,
            lead.city,
            lead.state,
            lead.website_status,
            lead.website_url,
            lead.website_confidence,
            lead.rating or '',
            lead.review_count,
            lead.lead_score,
            lead.calling_approved,
            lead.opted_out,
            intel.buying_intent if intel else 'N/A',
            strat.next_action if strat else 'N/A',
            strat.pitch_script[:150] if strat else 'N/A'
        ])

    return response


KNOWN_RELATED_PLACES = {
    "solan": [
        {"name": "Mall Road", "type": "Market & Commercial", "city": "Solan", "lat": 30.9045, "lon": 77.1025},
        {"name": "Saproon", "type": "Locality & Market", "city": "Solan", "lat": 30.9012, "lon": 77.0950},
        {"name": "Chambaghat", "type": "Sub-Town & Hub", "city": "Solan", "lat": 30.9230, "lon": 77.1120},
        {"name": "Deonghat", "type": "Locality & Hub", "city": "Solan", "lat": 30.8920, "lon": 77.0850},
        {"name": "Kotla Nala", "type": "Commercial Area", "city": "Solan", "lat": 30.9090, "lon": 77.1010},
        {"name": "Lower Bazaar", "type": "Bazaar & Shopping", "city": "Solan", "lat": 30.9050, "lon": 77.1000},
        {"name": "Ganj Bazaar", "type": "Wholesale Market", "city": "Solan", "lat": 30.9070, "lon": 77.0990},
        {"name": "Solan Bypass", "type": "Transport Corridor", "city": "Solan", "lat": 30.9150, "lon": 77.1080},
        {"name": "Kumarhatti", "type": "Junction & Town", "city": "Solan", "lat": 30.8750, "lon": 77.0500},
        {"name": "Kandaghat", "type": "Subdivision & Town", "city": "Solan", "lat": 30.9600, "lon": 77.1100},
        {"name": "Dharampur", "type": "Town & Market", "city": "Solan", "lat": 30.9020, "lon": 77.0250},
        {"name": "Barog", "type": "Hill Station", "city": "Solan", "lat": 30.8900, "lon": 77.0800},
        {"name": "Subathu", "type": "Cantonment & Market", "city": "Solan", "lat": 30.9700, "lon": 76.9900},
        {"name": "Kasauli", "type": "Hill Station & Tourism", "city": "Solan", "lat": 30.9013, "lon": 76.9649},
        {"name": "Baddi", "type": "Industrial Hub", "city": "Solan", "lat": 30.9578, "lon": 76.7914},
        {"name": "Nalagarh", "type": "Industrial & Town", "city": "Solan", "lat": 31.0426, "lon": 76.7161}
    ],
    "kangra": [
        {"name": "Dharamshala", "type": "City & HQ", "city": "Kangra", "lat": 32.2190, "lon": 76.3234},
        {"name": "McLeod Ganj", "type": "Tourism & Market", "city": "Kangra", "lat": 32.2426, "lon": 76.3213},
        {"name": "Palampur", "type": "Tea Town & Market", "city": "Kangra", "lat": 32.1109, "lon": 76.5363},
        {"name": "Nagrota Bagwan", "type": "Commercial Town", "city": "Kangra", "lat": 32.1083, "lon": 76.3833},
        {"name": "Kangra Town & Temple", "type": "Market & Heritage", "city": "Kangra", "lat": 32.0998, "lon": 76.2691},
        {"name": "Shahpur", "type": "Town & Suburb", "city": "Kangra", "lat": 32.2333, "lon": 76.1667},
        {"name": "Nurpur", "type": "Commercial Hub", "city": "Kangra", "lat": 32.3000, "lon": 75.9000},
        {"name": "Baijnath", "type": "Temple & Market", "city": "Kangra", "lat": 32.0500, "lon": 76.6500}
    ],
    "shimla": [
        {"name": "Mall Road & The Ridge", "type": "Central Promenade", "city": "Shimla", "lat": 31.1048, "lon": 77.1734},
        {"name": "Lakkar Bazaar", "type": "Wooden Craft Market", "city": "Shimla", "lat": 31.1070, "lon": 77.1750},
        {"name": "Lower Bazaar", "type": "Local Shopping", "city": "Shimla", "lat": 31.1030, "lon": 77.1720},
        {"name": "Sanjauli", "type": "Commercial Suburb", "city": "Shimla", "lat": 31.1010, "lon": 77.1970},
        {"name": "Chotta Shimla", "type": "Civic & Commercial", "city": "Shimla", "lat": 31.0920, "lon": 77.1850},
        {"name": "Dhalli", "type": "Fruit Market & Hub", "city": "Shimla", "lat": 31.1150, "lon": 77.2150},
        {"name": "Kasumpti", "type": "Commercial Area", "city": "Shimla", "lat": 31.0850, "lon": 77.1800},
        {"name": "New Shimla", "type": "Residential & Market", "city": "Shimla", "lat": 31.0750, "lon": 77.1650},
        {"name": "Boileauganj", "type": "West Suburb", "city": "Shimla", "lat": 31.1050, "lon": 77.1400},
        {"name": "Kufri", "type": "Resort & Tourism", "city": "Shimla", "lat": 31.0979, "lon": 77.2674}
    ],
    "chandigarh": [
        {"name": "Sector 17", "type": "City Center & Plaza", "city": "Chandigarh", "lat": 30.7415, "lon": 76.7794},
        {"name": "Sector 35", "type": "Food & Commercial Hub", "city": "Chandigarh", "lat": 30.7230, "lon": 76.7660},
        {"name": "Sector 22", "type": "Mobile & Retail Market", "city": "Chandigarh", "lat": 30.7300, "lon": 76.7740},
        {"name": "Sector 8 & 9", "type": "Inner Market", "city": "Chandigarh", "lat": 30.7480, "lon": 76.7900},
        {"name": "Sector 26", "type": "Grain & Restaurant Hub", "city": "Chandigarh", "lat": 30.7250, "lon": 76.8080},
        {"name": "Industrial Area Phase 1 & 2", "type": "Commercial & Auto Hub", "city": "Chandigarh", "lat": 30.7060, "lon": 76.8020},
        {"name": "Manimajra", "type": "Township & Market", "city": "Chandigarh", "lat": 30.7200, "lon": 76.8400},
        {"name": "Panchkula Sector 7/8/9", "type": "Sub-City Hub", "city": "Panchkula", "lat": 30.6942, "lon": 76.8606},
        {"name": "Mohali Phase 3B2 & 7", "type": "Sub-City Hub", "city": "Mohali", "lat": 30.7046, "lon": 76.7179}
    ],
    "delhi": [
        {"name": "Connaught Place", "type": "Central Business District", "city": "Delhi", "lat": 28.6315, "lon": 77.2167},
        {"name": "Karol Bagh", "type": "Market & Electronics Hub", "city": "Delhi", "lat": 28.6520, "lon": 77.1900},
        {"name": "Lajpat Nagar", "type": "Central Market", "city": "Delhi", "lat": 28.5700, "lon": 77.2400},
        {"name": "Chandni Chowk", "type": "Wholesale & Heritage Market", "city": "Delhi", "lat": 28.6560, "lon": 77.2300},
        {"name": "Hauz Khas", "type": "Commercial & Dining", "city": "Delhi", "lat": 28.5494, "lon": 77.2001},
        {"name": "Nehru Place", "type": "IT & Electronics Market", "city": "Delhi", "lat": 28.5490, "lon": 77.2520},
        {"name": "Saket", "type": "District Centre", "city": "Delhi", "lat": 28.5244, "lon": 77.2167},
        {"name": "Dwarka Sector 6/10/12", "type": "Commercial Sub-City", "city": "Delhi", "lat": 28.5823, "lon": 77.0500},
        {"name": "Rohini Sector 7/8/9", "type": "North Delhi Hub", "city": "Delhi", "lat": 28.7100, "lon": 77.1200}
    ],
    "bangalore": [
        {"name": "Koramangala", "type": "Commercial & Tech Hub", "city": "Bangalore", "lat": 12.9352, "lon": 77.6245},
        {"name": "Indiranagar", "type": "100ft Road Retail & Dining", "city": "Bangalore", "lat": 12.9784, "lon": 77.6408},
        {"name": "Whitefield", "type": "IT & Commercial Hub", "city": "Bangalore", "lat": 12.9698, "lon": 77.7500},
        {"name": "HSR Layout", "type": "Startup & Retail Sector", "city": "Bangalore", "lat": 12.9121, "lon": 77.6446},
        {"name": "Jayanagar 4th Block", "type": "Shopping Complex", "city": "Bangalore", "lat": 12.9299, "lon": 77.5838},
        {"name": "MG Road & Brigade Road", "type": "Central Retail", "city": "Bangalore", "lat": 12.9756, "lon": 77.6066},
        {"name": "Electronic City", "type": "Tech Corridor", "city": "Bangalore", "lat": 12.8399, "lon": 77.6770},
        {"name": "Marathahalli", "type": "Ring Road Hub", "city": "Bangalore", "lat": 12.9591, "lon": 77.6974}
    ],
    "mumbai": [
        {"name": "Bandra West (Linking Road & Hill Road)", "type": "Retail Hub", "city": "Mumbai", "lat": 19.0596, "lon": 72.8295},
        {"name": "Andheri West (Lokhandwala)", "type": "Commercial & Market", "city": "Mumbai", "lat": 19.1363, "lon": 72.8277},
        {"name": "Andheri East (MIDC/Chakala)", "type": "Business District", "city": "Mumbai", "lat": 19.1136, "lon": 72.8697},
        {"name": "Juhu", "type": "Hospitality & Commercial", "city": "Mumbai", "lat": 19.1075, "lon": 72.8263},
        {"name": "Colaba Causeway", "type": "Heritage Shopping", "city": "Mumbai", "lat": 18.9150, "lon": 72.8258},
        {"name": "Dadar (Ranade Road/Flower Market)", "type": "Central Market", "city": "Mumbai", "lat": 19.0178, "lon": 72.8478},
        {"name": "Powai (Hiranandani)", "type": "Tech & Commercial", "city": "Mumbai", "lat": 19.1176, "lon": 72.9060},
        {"name": "Borivali West", "type": "Retail & Residential Hub", "city": "Mumbai", "lat": 19.2307, "lon": 72.8567},
        {"name": "Thane West (Naupada/Ghopbunder)", "type": "Twin City Hub", "city": "Thane", "lat": 19.2183, "lon": 72.9781}
    ]
}


@api_view(['GET'])
def places_autocomplete(request):
    """
    GET /api/places/autocomplete?q=Solan
    Real-time Google Maps / OpenStreetMap Places search with related localities and points of interest.
    """
    import requests
    q = request.query_params.get("q", "").strip()
    if not q or len(q) < 2:
        return Response({"suggestions": [], "related_places": []})

    suggestions = []
    seen_keys = set()
    matched_city = None

    headers = {
        "User-Agent": "AntigravityLeadAgent/2.0 (Google Maps Places Autocomplete; contact@antigravity.ai)"
    }

    # 1. Primary: Query Photon (OSM Elasticsearch real-time global typeahead index)
    try:
        photon_url = "https://photon.komoot.io/api/"
        photon_params = {
            "q": q,
            "limit": 10,
            "lang": "en"
        }
        res = requests.get(photon_url, params=photon_params, headers=headers, timeout=4)
        if res.status_code == 200:
            data = res.json()
            features = data.get("features", [])
            for feat in features:
                props = feat.get("properties", {})
                coords = feat.get("geometry", {}).get("coordinates", [0, 0])
                lon = coords[0] if len(coords) > 0 else 0.0
                lat = coords[1] if len(coords) > 1 else 0.0

                name = props.get("name") or props.get("city") or props.get("street") or q
                city = props.get("city") or props.get("town") or props.get("village") or props.get("district") or name
                state = props.get("state", "")
                country = props.get("country", "India")
                osm_key = props.get("osm_key", "")
                osm_value = props.get("osm_value", "")
                place_type = props.get("type", "locality")

                # Determine human-friendly category label
                type_label = "Locality"
                if osm_value in ["city", "town", "village", "administrative"]:
                    type_label = "City / Town"
                elif osm_value in ["suburb", "neighbourhood", "quarter"]:
                    type_label = "Locality / Area"
                elif osm_value in ["commercial", "marketplace", "shop", "supermarket"]:
                    type_label = "Commercial & Market"
                elif osm_key in ["highway", "road", "street"]:
                    type_label = "Street / Road"
                elif osm_key in ["tourism", "historic", "amenity", "leisure"]:
                    type_label = "Landmark / POI"

                sub_parts = []
                if name != city and city:
                    sub_parts.append(city)
                if state:
                    sub_parts.append(state)
                if country:
                    sub_parts.append(country)
                secondary_text = ", ".join(sub_parts) if sub_parts else f"{state}, {country}".strip(" ,")

                key = f"{name.lower()}_{round(lat, 3)}_{round(lon, 3)}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    suggestions.append({
                        "main_text": name,
                        "secondary_text": secondary_text,
                        "display_name": f"{name}, {secondary_text}" if secondary_text else name,
                        "place_type": place_type,
                        "type_label": type_label,
                        "lat": float(lat),
                        "lon": float(lon),
                        "city": city,
                        "state": state,
                        "country": country
                    })

                    if not matched_city:
                        matched_city = city
    except Exception:
        pass

    # 2. Secondary Fallback: Nominatim if Photon yielded few results
    if len(suggestions) < 3:
        try:
            nom_url = "https://nominatim.openstreetmap.org/search"
            nom_params = {
                "q": q,
                "format": "json",
                "addressdetails": 1,
                "limit": 6
            }
            res = requests.get(nom_url, params=nom_params, headers=headers, timeout=4)
            if res.status_code == 200:
                data = res.json()
                for item in data:
                    addr = item.get("address", {})
                    disp = item.get("display_name", "").split(", ")
                    main_title = disp[0] if disp else q
                    sec_text = ", ".join(disp[1:4]) if len(disp) > 1 else ""
                    lat = float(item.get("lat"))
                    lon = float(item.get("lon"))

                    key = f"{main_title.lower()}_{round(lat, 3)}_{round(lon, 3)}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        city_name = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb") or addr.get("county") or main_title
                        suggestions.append({
                            "main_text": main_title,
                            "secondary_text": sec_text,
                            "display_name": item.get("display_name"),
                            "place_type": item.get("type", "locality"),
                            "type_label": "Place / Locality",
                            "lat": lat,
                            "lon": lon,
                            "city": city_name,
                            "state": addr.get("state", ""),
                            "country": addr.get("country", "")
                        })
                        if not matched_city:
                            matched_city = city_name
        except Exception:
            pass

    # 3. Related Places & Localities Discovery
    related_places = []
    # Check known places index
    search_terms = [q.lower()]
    if matched_city:
        search_terms.append(matched_city.lower())
    for s in suggestions[:3]:
        search_terms.append(s["main_text"].lower())
        search_terms.append(s["city"].lower())

    for k, rel_list in KNOWN_RELATED_PLACES.items():
        if any(k in term or term in k for term in search_terms):
            related_places = rel_list
            break

    # If not in static index, synthesize related localities from suggestions or query Photon
    if not related_places and suggestions:
        rel_set = set()
        for s in suggestions:
            if s["main_text"] not in rel_set:
                rel_set.add(s["main_text"])
                related_places.append({
                    "name": s["main_text"],
                    "type": s["type_label"],
                    "city": s["city"],
                    "lat": s["lat"],
                    "lon": s["lon"]
                })

    return Response({
        "query": q,
        "suggestions": suggestions,
        "related_places": related_places
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Lightweight health check endpoint for Render/Railway keep-alive pingers (e.g. UptimeRobot).
    """
    return Response({
        "status": "healthy",
        "service": "automated-lead-agent",
        "timestamp": timezone.now().isoformat()
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def test_email_diagnostics(request):
    """
    Direct SMTP diagnostic endpoint: Test and debug email delivery in 1 click.
    """
    target = request.GET.get('to', getattr(settings, 'EMAIL_HOST_USER', '')).strip()
    pw = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
    debug_info = {
        "EMAIL_HOST": getattr(settings, 'EMAIL_HOST', ''),
        "EMAIL_PORT": getattr(settings, 'EMAIL_PORT', ''),
        "EMAIL_USE_TLS": getattr(settings, 'EMAIL_USE_TLS', ''),
        "EMAIL_USE_SSL": getattr(settings, 'EMAIL_USE_SSL', ''),
        "EMAIL_HOST_USER": getattr(settings, 'EMAIL_HOST_USER', ''),
        "EMAIL_HOST_PASSWORD_SET": bool(pw),
        "EMAIL_HOST_PASSWORD_LENGTH": len(pw),
        "EMAIL_HOST_PASSWORD_HAS_SPACES": ' ' in pw,
        "DEFAULT_FROM_EMAIL": getattr(settings, 'DEFAULT_FROM_EMAIL', ''),
    }

    if not target:
        return Response({
            "error": "No recipient specified. Add ?to=your_email@gmail.com to test.",
            "config": debug_info
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        sent = send_mail(
            subject="[TEST] Automated Lead Agent SMTP Test",
            message="If you receive this email, your Gmail SMTP configuration on Render is 100% working!",
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@digitalgrowthhub.ai'),
            recipient_list=[target],
            fail_silently=False
        )
        return Response({
            "success": True,
            "emails_sent_count": sent,
            "message": f"Test email successfully dispatched to {target}!",
            "config": debug_info
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Diagnostic email failure")
        return Response({
            "success": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "config": debug_info
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



