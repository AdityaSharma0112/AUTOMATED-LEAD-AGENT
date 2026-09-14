from django.contrib import admin
from .models import (
    SearchJob,
    Lead,
    DiscoverySource,
    ConflictLog,
    CallSession,
    CallTranscriptTurn,
    ConversationIntelligence,
    Strategy,
    AuditEvent,
    SystemSetting
)


@admin.register(SearchJob)
class SearchJobAdmin(admin.ModelAdmin):
    list_display = ('query', 'status', 'leads_found_count', 'created_at', 'completed_at')
    list_filter = ('status',)
    search_fields = ('query',)


class DiscoverySourceInline(admin.TabularInline):
    model = DiscoverySource
    extra = 0


class ConflictLogInline(admin.TabularInline):
    model = ConflictLog
    extra = 0


class CallSessionInline(admin.TabularInline):
    model = CallSession
    extra = 0


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('lead_id', 'business_name', 'category', 'city', 'phone', 'website_status', 'lead_score', 'calling_approved', 'opted_out')
    list_filter = ('website_status', 'city', 'category', 'calling_approved', 'opted_out')
    search_fields = ('business_name', 'phone', 'lead_id', 'city')
    inlines = [DiscoverySourceInline, ConflictLogInline, CallSessionInline]


@admin.register(CallSession)
class CallSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'lead', 'status', 'telephony_provider', 'duration_seconds', 'started_at')
    list_filter = ('status', 'telephony_provider')


@admin.register(CallTranscriptTurn)
class CallTranscriptTurnAdmin(admin.ModelAdmin):
    list_display = ('call_session', 'turn_index', 'speaker', 'text', 'sentiment')


@admin.register(ConversationIntelligence)
class ConversationIntelligenceAdmin(admin.ModelAdmin):
    list_display = ('lead', 'buying_intent', 'budget_signal', 'confidence_score', 'created_at')
    list_filter = ('buying_intent', 'budget_signal')


@admin.register(Strategy)
class StrategyAdmin(admin.ModelAdmin):
    list_display = ('lead', 'lead_score', 'next_action', 'follow_up_date', 'updated_at')


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'agent_name', 'event_type', 'description', 'lead')
    list_filter = ('agent_name', 'event_type')
    search_fields = ('description', 'event_type')


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'updated_at')
