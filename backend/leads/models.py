import uuid
from django.db import models
from django.utils import timezone


class SearchJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    query = models.TextField(help_text="Natural language input query")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    parsed_intent = models.JSONField(default=dict, blank=True, help_text="Parsed category, location, radius, filters")
    leads_found_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"SearchJob ({self.status}): {self.query[:40]}"


class Lead(models.Model):
    WEBSITE_STATUS_CHOICES = [
        ('verified_present', 'Verified Present'),
        ('likely_present', 'Likely Present'),
        ('likely_absent', 'Likely Absent'),
        ('unknown', 'Unknown'),
        ('inaccessible', 'Inaccessible / Broken'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead_id = models.CharField(max_length=32, unique=True, db_index=True)
    search_job = models.ForeignKey(SearchJob, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')

    # Identity
    business_name = models.CharField(max_length=255, db_index=True)
    category = models.CharField(max_length=128, db_index=True)

    # Contact
    phone = models.CharField(max_length=64, blank=True, default="")
    normalized_phone = models.CharField(max_length=32, blank=True, default="", db_index=True)
    email = models.EmailField(blank=True, default="")
    contact_person = models.CharField(max_length=128, blank=True, default="")

    # Location
    address = models.TextField(blank=True, default="")
    locality = models.CharField(max_length=128, blank=True, default="")
    city = models.CharField(max_length=128, blank=True, default="", db_index=True)
    state = models.CharField(max_length=128, blank=True, default="")
    country = models.CharField(max_length=64, default="India")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Online Presence
    website_status = models.CharField(max_length=32, choices=WEBSITE_STATUS_CHOICES, default='unknown', db_index=True)
    website_url = models.URLField(max_length=500, blank=True, default="")
    website_confidence = models.FloatField(default=0.5, help_text="0.0 to 1.0 confidence score")
    google_profile_present = models.BooleanField(default=False)
    social_profiles = models.JSONField(default=list, blank=True)

    # Reputation
    rating = models.FloatField(null=True, blank=True)
    review_count = models.IntegerField(default=0)
    review_summary = models.TextField(blank=True, default="")

    # Business Details
    services = models.JSONField(default=list, blank=True)
    hours = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True, default="")
    attributes = models.JSONField(default=dict, blank=True)

    # Verification & Quality
    field_confidence = models.JSONField(default=dict, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)

    # Scoring & Opportunity
    lead_score = models.IntegerField(default=50, help_text="Configurable 0-100 score")
    score_breakdown = models.JSONField(default=dict, blank=True)

    # Compliance & Calling Gates
    calling_approved = models.BooleanField(default=False, help_text="Explicit user approval gate")
    opted_out = models.BooleanField(default=False, help_text="Lead requested not to be contacted (DNC)")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-lead_score', '-created_at']

    def __str__(self):
        return f"{self.business_name} ({self.city}) - Score: {self.lead_score}"


class DiscoverySource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='sources')
    source_name = models.CharField(max_length=128)
    source_url = models.URLField(max_length=500, blank=True, default="")
    raw_data = models.JSONField(default=dict, blank=True)
    confidence = models.FloatField(default=0.8)
    discovered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.source_name} for {self.lead.business_name}"


class ConflictLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='conflicts')
    field_name = models.CharField(max_length=64)
    source_a = models.CharField(max_length=128)
    value_a = models.TextField()
    source_b = models.CharField(max_length=128)
    value_b = models.TextField()
    resolution_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conflict on {self.field_name} for {self.lead.business_name}"


class CallSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('calling', 'Calling'),
        ('connected', 'Connected'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('opted_out', 'Opted Out / Refused'),
        ('escalated', 'Escalated to Human'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='calls')
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='pending')
    call_type = models.CharField(max_length=32, default="web_voice", help_text="web_voice, twilio_phone, simulation")
    target_phone = models.CharField(max_length=64, blank=True, default="")
    custom_business_name = models.CharField(max_length=255, blank=True, default="")
    telephony_provider = models.CharField(max_length=64, default="mock_telephony")
    consent_given = models.BooleanField(default=True)
    duration_seconds = models.IntegerField(default=0)
    audio_url = models.CharField(max_length=500, blank=True, default="")
    call_script_version = models.CharField(max_length=64, default="v1.0-qualification")
    collected_queries = models.JSONField(default=list, blank=True, help_text="List of queries collected during call")
    error_reason = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Call to {self.lead.business_name} ({self.call_type}) - {self.status}"


class CallTranscriptTurn(models.Model):
    SPEAKER_CHOICES = [
        ('agent', 'AI Voice Agent'),
        ('lead', 'Lead / Business Owner'),
        ('system', 'System / Event'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    call_session = models.ForeignKey(CallSession, on_delete=models.CASCADE, related_name='transcript_turns')
    speaker = models.CharField(max_length=16, choices=SPEAKER_CHOICES)
    text = models.TextField()
    turn_index = models.IntegerField(default=0)
    timestamp = models.DateTimeField(default=timezone.now)
    sentiment = models.CharField(max_length=32, blank=True, default="neutral")

    class Meta:
        ordering = ['turn_index']

    def __str__(self):
        return f"[{self.speaker}] {self.text[:50]}"


class ConversationIntelligence(models.Model):
    BUYING_INTENT_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    INTEREST_STATUS_CHOICES = [
        ('interested_hot', 'Interested (Ready for Sales Pitch)'),
        ('interested_warm', 'Warm Lead (Exploring)'),
        ('call_back', 'Call Back Requested'),
        ('not_interested', 'Not Interested'),
        ('opted_out', 'Opted Out / Do Not Call'),
    ]
    BUDGET_SIGNAL_CHOICES = [
        ('unknown', 'Unknown'),
        ('low', 'Low / Tight'),
        ('medium', 'Medium / Standard'),
        ('high', 'High / Enterprise'),
        ('explicit_amount', 'Explicit Amount Stated'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, related_name='intelligence')
    call_session = models.ForeignKey(CallSession, on_delete=models.SET_NULL, null=True, blank=True)

    summary = models.TextField(help_text="Executive summary of call")
    interest_status = models.CharField(max_length=32, choices=INTEREST_STATUS_CHOICES, default='interested_warm')
    collected_queries = models.JSONField(default=list, blank=True, help_text="Explicit questions and queries asked by the lead during call")
    action_items = models.JSONField(default=list, blank=True, help_text="Specific follow up action items agreed upon")
    next_sales_pitch_hook = models.TextField(blank=True, default="", help_text="Tailored closing sales pitch addressing their collected queries")

    pain_points = models.JSONField(default=list, blank=True, help_text="List of business pain points")
    goals = models.JSONField(default=list, blank=True, help_text="Business goals stated")
    requirements = models.JSONField(default=list, blank=True, help_text="Explicit requirements")
    current_process_and_tools = models.TextField(blank=True, default="")
    stated_website_presence = models.TextField(blank=True, default="")
    desired_solution = models.TextField(blank=True, default="")

    budget_signal = models.CharField(max_length=32, choices=BUDGET_SIGNAL_CHOICES, default='unknown')
    budget_amount = models.CharField(max_length=64, blank=True, default="")
    timeline = models.CharField(max_length=128, blank=True, default="Immediate")
    decision_maker_status = models.CharField(max_length=128, blank=True, default="Confirmed Owner/Decision Maker")

    objections = models.JSONField(default=list, blank=True)
    buying_intent = models.CharField(max_length=16, choices=BUYING_INTENT_CHOICES, default='medium')
    customer_quotes = models.JSONField(default=list, blank=True)
    confidence_score = models.FloatField(default=0.85)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Intelligence for {self.lead.business_name} (Status: {self.interest_status})"


class Strategy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.OneToOneField(Lead, on_delete=models.CASCADE, related_name='strategy')

    problem_statement = models.TextField(help_text="What the business actually needs based on evidence")
    evidence_online = models.TextField(blank=True, default="", help_text="Online research evidence")
    evidence_call = models.TextField(blank=True, default="", help_text="Call transcript evidence")
    opportunity = models.TextField(help_text="Where we can drive massive ROI")

    recommended_solutions = models.JSONField(default=list, help_text="Prioritized features/services")
    fit_rationale = models.TextField(help_text="Why this solution specifically fits this business")

    offer_packages = models.JSONField(default=list, help_text="Suggested tier packages (Starter, Pro, Elite)")
    pricing_guidance = models.TextField(blank=True, default="")

    pitch_script = models.TextField(help_text="Personalized pitch and hook")
    objections_and_responses = models.JSONField(default=list, help_text="Matrix of likely objections and rebuttals")

    lead_score = models.IntegerField(default=50)
    score_reasoning = models.TextField(blank=True, default="")

    next_action = models.TextField(help_text="Immediate recommended next step")
    follow_up_date = models.CharField(max_length=64, blank=True, default="Within 24-48 hours")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Strategy for {self.lead.business_name}"


class AuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_events')
    search_job = models.ForeignKey(SearchJob, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_events')
    agent_name = models.CharField(max_length=64, db_index=True)
    event_type = models.CharField(max_length=64, db_index=True)
    description = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.agent_name}] {self.event_type} - {self.created_at.strftime('%H:%M:%S')}"


class SystemSetting(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    value = models.JSONField(default=dict)
    description = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
