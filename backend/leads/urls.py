from django.urls import path
from .views import (
    SendOTPAPIView,
    VerifyOTPAPIView,
    UserProfileAPIView,
    LogoutAPIView,
    SearchAPIView,
    SearchJobDetailAPIView,
    LeadListAPIView,
    LeadDetailAPIView,
    toggle_lead_calling_approval,
    reverify_lead,
    CallSessionAPIView,
    quick_call_view,
    process_interactive_turn,
    end_call_session,
    twilio_voice_webhook,
    twilio_turn_webhook,
    twilio_status_webhook,
    StrategyDetailAPIView,
    refine_strategy_view,
    regenerate_intelligence_view,
    AuditEventAPIView,
    SettingsAPIView,
    export_leads_csv,
    clear_all_leads,
    places_autocomplete,
    health_check,
    test_email_diagnostics
)

urlpatterns = [
    # Health check (for Render / Railway keep-alive pingers)
    path('health', health_check, name='health_check'),
    path('auth/test-email', test_email_diagnostics, name='test_email_diagnostics'),

    # Authentication (Email + OTP Login & Signup)
    path('auth/send-otp', SendOTPAPIView.as_view(), name='auth_send_otp'),
    path('auth/verify-otp', VerifyOTPAPIView.as_view(), name='auth_verify_otp'),
    path('auth/me', UserProfileAPIView.as_view(), name='auth_me'),
    path('auth/logout', LogoutAPIView.as_view(), name='auth_logout'),

    # Google Maps / Places Autocomplete
    path('places/autocomplete', places_autocomplete, name='places_autocomplete'),

    # Search & Research Jobs
    path('search', SearchAPIView.as_view(), name='search_api'),
    path('search/<uuid:pk>', SearchJobDetailAPIView.as_view(), name='search_job_detail'),

    # Leads Management
    path('leads', LeadListAPIView.as_view(), name='leads_list'),
    path('leads/clear', clear_all_leads, name='leads_clear'),
    path('leads/<uuid:pk>', LeadDetailAPIView.as_view(), name='lead_detail'),
    path('leads/<uuid:pk>/approve_call', toggle_lead_calling_approval, name='lead_approve_call'),
    path('leads/<uuid:pk>/strategy', StrategyDetailAPIView.as_view(), name='lead_strategy'),
    path('leads/<uuid:pk>/strategy/regenerate', StrategyDetailAPIView.as_view(), name='lead_strategy_regenerate'),
    path('leads/<uuid:pk>/strategy/refine', refine_strategy_view, name='lead_strategy_refine'),
    path('leads/<uuid:pk>/intelligence/regenerate', regenerate_intelligence_view, name='lead_intelligence_regenerate'),
    path('leads/export/csv', export_leads_csv, name='leads_export_csv'),

    # Outbound Voice & Calling Center
    path('calls', CallSessionAPIView.as_view(), name='calls_api'),
    path('calls/quick-call', quick_call_view, name='calls_quick_call'),
    path('calls/<uuid:pk>/turn', process_interactive_turn, name='call_turn'),
    path('calls/<uuid:pk>/end', end_call_session, name='call_end'),
    path('calls/twilio/webhook', twilio_voice_webhook, name='twilio_voice_webhook'),
    path('calls/twilio/turn', twilio_turn_webhook, name='twilio_turn_webhook'),
    path('calls/twilio/status', twilio_status_webhook, name='twilio_status_webhook'),

    # Audit & Compliance
    path('audit', AuditEventAPIView.as_view(), name='audit_stream'),

    # System Settings & Kill Switch
    path('settings', SettingsAPIView.as_view(), name='system_settings'),
]
