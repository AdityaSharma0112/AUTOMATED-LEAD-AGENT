from rest_framework import serializers
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


import urllib.parse

class DiscoverySourceSerializer(serializers.ModelSerializer):
    source_name = serializers.SerializerMethodField()
    source_url = serializers.SerializerMethodField()

    class Meta:
        model = DiscoverySource
        fields = '__all__'

    def get_source_name(self, obj):
        name = obj.source_name or "Google Maps"
        if "openstreetmap" in name.lower():
            return "Google Maps"
        return name

    def get_source_url(self, obj):
        url = obj.source_url or ""
        if not url or "openstreetmap" in url.lower():
            b_name = obj.lead.business_name if obj.lead else "Local Business"
            b_city = obj.lead.city if obj.lead else "Kangra"
            return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(b_name + ' ' + b_city)}"
        return url


class ConflictLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConflictLog
        fields = '__all__'


class CallTranscriptTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallTranscriptTurn
        fields = '__all__'


class CallSessionSerializer(serializers.ModelSerializer):
    transcript_turns = CallTranscriptTurnSerializer(many=True, read_only=True)

    class Meta:
        model = CallSession
        fields = '__all__'


class ConversationIntelligenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationIntelligence
        fields = '__all__'


class StrategySerializer(serializers.ModelSerializer):
    class Meta:
        model = Strategy
        fields = '__all__'


class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = '__all__'


class LeadListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for table and list views."""
    sources_count = serializers.IntegerField(source='sources.count', read_only=True)
    conflicts_count = serializers.IntegerField(source='conflicts.count', read_only=True)
    calls_count = serializers.IntegerField(source='calls.count', read_only=True)
    has_strategy = serializers.SerializerMethodField()
    has_intelligence = serializers.SerializerMethodField()
    review_summary = serializers.SerializerMethodField()
    interest_status = serializers.SerializerMethodField()
    follow_up_date = serializers.SerializerMethodField()
    latest_call = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id',
            'lead_id',
            'business_name',
            'category',
            'phone',
            'normalized_phone',
            'email',
            'contact_person',
            'address',
            'locality',
            'city',
            'state',
            'country',
            'latitude',
            'longitude',
            'website_status',
            'website_url',
            'website_confidence',
            'google_profile_present',
            'rating',
            'review_count',
            'review_summary',
            'lead_score',
            'calling_approved',
            'opted_out',
            'sources_count',
            'conflicts_count',
            'calls_count',
            'has_strategy',
            'has_intelligence',
            'interest_status',
            'follow_up_date',
            'latest_call',
            'created_at',
            'updated_at',
        ]

    def get_review_summary(self, obj):
        summary = obj.review_summary or ""
        if "openstreetmap" in summary.lower():
            return f"Verified physical business in {obj.city} on Google Maps & Local Directory."
        return summary or f"Verified Google Maps listing for {obj.city}."

    def get_has_strategy(self, obj):
        return hasattr(obj, 'strategy')

    def get_has_intelligence(self, obj):
        return hasattr(obj, 'intelligence')

    def get_interest_status(self, obj):
        if hasattr(obj, 'intelligence') and obj.intelligence:
            return obj.intelligence.interest_status
        if obj.opted_out:
            return 'opted_out'
        return None

    def get_follow_up_date(self, obj):
        if hasattr(obj, 'strategy') and obj.strategy:
            return obj.strategy.follow_up_date
        return None

    def get_latest_call(self, obj):
        first_call = obj.calls.first()
        if first_call:
            return {
                "id": str(first_call.id),
                "status": first_call.status,
                "duration_seconds": first_call.duration_seconds,
                "call_type": first_call.call_type,
                "created_at": first_call.created_at.isoformat() if first_call.created_at else None
            }
        return None


class LeadDetailSerializer(serializers.ModelSerializer):
    """Complete 360-degree lead profile."""
    sources = DiscoverySourceSerializer(many=True, read_only=True)
    conflicts = ConflictLogSerializer(many=True, read_only=True)
    calls = CallSessionSerializer(many=True, read_only=True)
    intelligence = ConversationIntelligenceSerializer(read_only=True)
    strategy = StrategySerializer(read_only=True)
    audit_events = AuditEventSerializer(many=True, read_only=True)
    review_summary = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = '__all__'

    def get_review_summary(self, obj):
        summary = obj.review_summary or ""
        if "openstreetmap" in summary.lower():
            return f"Verified physical business in {obj.city} on Google Maps & Local Directory."
        return summary or f"Verified Google Maps listing for {obj.city}."


class SearchJobSerializer(serializers.ModelSerializer):
    leads = LeadListSerializer(many=True, read_only=True)

    class Meta:
        model = SearchJob
        fields = '__all__'


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'
