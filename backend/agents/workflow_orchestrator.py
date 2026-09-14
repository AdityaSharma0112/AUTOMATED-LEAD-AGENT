import logging
from typing import Dict, List, Any, Optional
from django.utils import timezone
from leads.models import SearchJob, Lead, CallSession
from .intent_parser import IntentParserAgent
from .research_agent import ResearchAgent
from .verification_agent import VerificationAgent
from .calling_agent import CallingAgent
from .intelligence_agent import IntelligenceAgent
from .strategy_agent import StrategyAgent
from .lead_scorer import LeadScoringEngine

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """
    Deterministic State Machine & Multi-Agent Workflow Orchestrator.
    Manages transitions: Search -> Research -> Verify -> Score -> Call -> Intel -> Strategy.
    """

    def __init__(self):
        self.intent_parser = IntentParserAgent()
        self.research_agent = ResearchAgent()
        self.verification_agent = VerificationAgent()
        self.calling_agent = CallingAgent()
        self.intelligence_agent = IntelligenceAgent()
        self.strategy_agent = StrategyAgent()
        self.scorer = LeadScoringEngine()

    def _safe_save(self, obj, update_fields=None):
        """Safely save model instances verifying row existence to prevent update_fields DatabaseError."""
        if not obj or not getattr(obj, 'pk', None):
            return
        try:
            model_cls = obj.__class__
            if model_cls.objects.filter(pk=obj.pk).exists():
                if update_fields:
                    obj.save(update_fields=update_fields)
                else:
                    obj.save()
        except Exception as e:
            logger.warning(f"Safe save ignored: {str(e)}")

    def run_search_pipeline(
        self,
        query: str,
        search_job: Optional[SearchJob] = None,
        explicit_intent: Optional[Dict[str, Any]] = None
    ) -> SearchJob:
        """
        Execute full lead discovery pipeline:
        Intent Parsing / Explicit Criteria -> Multi-source Research -> Verification & Deduplication -> Scoring -> Baseline Strategy.
        """
        if not search_job:
            search_job = SearchJob.objects.create(query=query, status='running')
        else:
            search_job.status = 'running'
            self._safe_save(search_job, update_fields=['status'])

        try:
            # 1. Parse Intent (or use direct explicit criteria)
            if explicit_intent:
                parsed_intent = explicit_intent
            else:
                parsed_intent = self.intent_parser.parse(query, search_job=search_job)

            search_job.parsed_intent = parsed_intent
            self._safe_save(search_job, update_fields=['parsed_intent'])

            # 2. Research Businesses across providers
            raw_leads = self.research_agent.execute_research(parsed_intent, search_job=search_job)

            # 3. Verification, Normalization & Deduplication
            existing_leads = list(Lead.objects.all())
            created_leads = []

            for raw in raw_leads:
                lead, is_new = self.verification_agent.process_and_store_lead(
                    raw_lead=raw,
                    search_job=search_job,
                    existing_leads=existing_leads
                )
                if lead:
                    if is_new:
                        # 4. Compute Initial Opportunity Score
                        self.scorer.update_lead_score(lead)
                        # 5. Generate Initial Strategy
                        self.strategy_agent.generate_strategy(lead)
                        existing_leads.append(lead)
                    else:
                        lead.search_job = search_job
                        self._safe_save(lead, update_fields=['search_job'])
                    created_leads.append(lead)

            search_job.leads_found_count = len(created_leads)
            search_job.status = 'completed'
            search_job.completed_at = timezone.now()
            self._safe_save(search_job, update_fields=['leads_found_count', 'status', 'completed_at'])

            return search_job

        except Exception as e:
            logger.exception(f"Search pipeline failed: {str(e)}")
            try:
                if search_job and search_job.pk:
                    search_job.status = 'failed'
                    search_job.error_message = str(e)
                    search_job.completed_at = timezone.now()
                    self._safe_save(search_job, update_fields=['status', 'error_message', 'completed_at'])
            except Exception:
                pass
            raise

    def execute_call_workflow(self, lead: Lead, simulate: bool = True) -> CallSession:
        """
        Execute qualification call, extract intelligence, and update strategy.
        """
        # 1. Calling Agent executes conversation
        if simulate:
            call_session = self.calling_agent.simulate_full_call(lead)
        else:
            call_session = self.calling_agent.initiate_call(lead)

        # 2. Extract conversation intelligence
        if call_session.status in ['completed', 'escalated']:
            self.intelligence_agent.extract_intelligence(call_session)

            # 3. Re-score lead with intelligence signals
            self.scorer.update_lead_score(lead)

            # 4. Re-generate sales strategy with call insights
            self.strategy_agent.generate_strategy(lead)

        return call_session

    def reverify_lead(self, lead: Lead) -> Lead:
        """Re-evaluate website presence, scoring, and strategy for an individual lead."""
        sources = [
            {"source_name": s.source_name, "source_url": s.source_url, "raw_data": s.raw_data}
            for s in lead.sources.all()
        ]
        raw_lead = {
            "business_name": lead.business_name,
            "phone": lead.phone,
            "address": lead.address,
            "website_url": lead.website_url,
            "sources": sources
        }
        web_status, web_url, web_conf = self.verification_agent.evaluate_website_presence(raw_lead)
        lead.website_status = web_status
        lead.website_confidence = web_conf
        lead.last_verified_at = timezone.now()
        lead.save(update_fields=['website_status', 'website_confidence', 'last_verified_at'])

        self.scorer.update_lead_score(lead)
        self.strategy_agent.generate_strategy(lead)
        return lead
