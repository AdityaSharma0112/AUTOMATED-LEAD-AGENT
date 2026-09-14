import uuid
from django.test import TestCase
from leads.models import (
    SearchJob,
    Lead,
    DiscoverySource,
    ConflictLog,
    CallSession,
    ConversationIntelligence,
    Strategy,
    AuditEvent,
    SystemSetting
)
from agents.intent_parser import IntentParserAgent
from agents.research_agent import ResearchAgent
from agents.verification_agent import VerificationAgent
from agents.lead_scorer import LeadScoringEngine
from agents.calling_agent import CallingAgent
from agents.intelligence_agent import IntelligenceAgent
from agents.strategy_agent import StrategyAgent
from agents.workflow_orchestrator import WorkflowOrchestrator


class IntentParserTestCase(TestCase):
    """Test natural language query parsing into structured criteria."""

    def setUp(self):
        self.parser = IntentParserAgent()

    def test_parse_solan_mechanics_query(self):
        query = "Find mechanics within 30 km of Solan that appear to have no website, research them, and prepare them for calling."
        intent = self.parser.parse(query)

        self.assertIn("Car Repair", intent.get("category"))
        self.assertEqual(intent.get("location"), "Solan")
        self.assertEqual(intent.get("radius_km"), 30.0)
        self.assertEqual(intent.get("website_filter"), "no_website")

    def test_parse_custom_category_and_radius(self):
        query = "Look for plumbers within 15 km in Shimla without website"
        intent = self.parser.parse(query)

        self.assertIn("Plumb", intent.get("category"))
        self.assertEqual(intent.get("location"), "Shimla")
        self.assertEqual(intent.get("radius_km"), 15.0)


class NormalizationAndDeduplicationTestCase(TestCase):
    """Test phone normalization, address cleaning, and fuzzy deduplication."""

    def setUp(self):
        self.verifier = VerificationAgent()

    def test_phone_normalization(self):
        # 10-digit raw
        disp, e164 = self.verifier.normalize_phone("9816044521")
        self.assertEqual(e164, "+919816044521")
        self.assertEqual(disp, "+91 98160 44521")

        # With leading 0
        disp, e164 = self.verifier.normalize_phone("09816044521")
        self.assertEqual(e164, "+919816044521")

        # Formatted with hyphens and spaces
        disp, e164 = self.verifier.normalize_phone("+91-98160-44521")
        self.assertEqual(e164, "+919816044521")

    def test_address_normalization(self):
        raw = "  Mall Road, , Below Bus Stand,   Solan,  HP   "
        clean = self.verifier.normalize_address(raw)
        self.assertEqual(clean, "Mall Road, Below Bus Stand, Solan, HP")

    def test_website_presence_evaluation(self):
        # Multi-source without website -> likely_absent with high confidence
        raw_absent = {
            "website_url": "",
            "sources": [
                {"source_name": "Google Maps", "source_url": "https://maps.google.com/?cid=1"},
                {"source_name": "Justdial", "source_url": "https://justdial.com/1"}
            ]
        }
        status, url, conf = self.verifier.evaluate_website_presence(raw_absent)
        self.assertEqual(status, "likely_absent")
        self.assertGreaterEqual(conf, 0.8)

        # Verified URL
        raw_present = {"website_url": "https://sharmaautoworks.com", "sources": []}
        status, url, conf = self.verifier.evaluate_website_presence(raw_present)
        self.assertEqual(status, "verified_present")
        self.assertGreaterEqual(conf, 0.9)

    def test_deduplication_by_phone(self):
        lead1, is_new1 = self.verifier.process_and_store_lead({
            "business_name": "Sharma Auto Works",
            "phone": "+91 98160 44521",
            "category": "Car Repair",
            "city": "Solan",
            "sources": [{"source_name": "Source 1", "source_url": ""}]
        })
        self.assertTrue(is_new1)

        # Same phone from different directory
        lead2, is_new2 = self.verifier.process_and_store_lead({
            "business_name": "Sharma Motor Garage",
            "phone": "098160-44521",
            "category": "Car Repair",
            "city": "Solan",
            "sources": [{"source_name": "Source 2", "source_url": ""}]
        })
        self.assertFalse(is_new2)
        self.assertEqual(lead1.id, lead2.id)
        # Verify source was attached
        self.assertEqual(lead1.sources.count(), 2)


class LeadScoringTestCase(TestCase):
    """Test transparent lead opportunity scoring engine."""

    def setUp(self):
        self.scorer = LeadScoringEngine()

    def test_high_opportunity_lead_scoring(self):
        lead = Lead.objects.create(
            lead_id="LEAD-TEST-1",
            business_name="Test Garage",
            category="Car Repair",
            phone="+91 98160 12345",
            normalized_phone="+919816012345",
            city="Solan",
            website_status="likely_absent",
            rating=4.6,
            review_count=35
        )
        score = self.scorer.update_lead_score(lead)
        self.assertGreaterEqual(score, 70)
        self.assertIn("Missing / Absent Website (+High Opportunity)", lead.score_breakdown)

    def test_opt_out_penalty(self):
        lead = Lead.objects.create(
            lead_id="LEAD-TEST-2",
            business_name="Opted Out Garage",
            category="Car Repair",
            city="Solan",
            opted_out=True
        )
        score = self.scorer.update_lead_score(lead)
        self.assertEqual(score, 0)


class ComplianceGatesTestCase(TestCase):
    """Test human calling approval gate and global emergency kill switch."""

    def setUp(self):
        self.calling_agent = CallingAgent()
        self.lead = Lead.objects.create(
            lead_id="LEAD-COMPLIANCE",
            business_name="Compliance Test Auto",
            category="Car Repair",
            phone="+91 98160 99999",
            normalized_phone="+919816099999",
            city="Solan",
            calling_approved=False
        )

    def test_call_blocked_without_approval(self):
        with self.assertRaises(PermissionError):
            self.calling_agent.initiate_call(self.lead)

    def test_call_allowed_with_approval(self):
        self.lead.calling_approved = True
        self.lead.save()
        call_session = self.calling_agent.initiate_call(self.lead)
        self.assertEqual(call_session.status, "connected")

    def test_kill_switch_blocks_all_calls(self):
        self.lead.calling_approved = True
        self.lead.save()

        # Activate Emergency Kill Switch
        SystemSetting.objects.update_or_create(
            key="kill_switch",
            defaults={"value": {"active": True, "reason": "Emergency Test"}}
        )

        with self.assertRaises(PermissionError):
            self.calling_agent.initiate_call(self.lead)


class EndToEndPipelineTestCase(TestCase):
    """Test full multi-agent pipeline from natural language search to strategy generation."""

    def test_full_pipeline_execution(self):
        orchestrator = WorkflowOrchestrator()

        # 1. Search Pipeline
        job = orchestrator.run_search_pipeline(
            "Find mechanics within 30 km of Solan that appear to have no website, research them, and prepare them for calling."
        )

        self.assertEqual(job.status, "completed")
        self.assertGreater(job.leads_found_count, 0)

        # 2. Verify lead profile
        lead = Lead.objects.first()
        self.assertIsNotNone(lead)
        self.assertEqual(lead.city, "Solan")
        self.assertGreater(lead.sources.count(), 0)
        self.assertTrue(hasattr(lead, 'strategy'))

        # 3. Approve lead for calling
        lead.calling_approved = True
        lead.save()

        # 4. Execute Voice Call & Intel Extraction
        call_session = orchestrator.execute_call_workflow(lead, simulate=True)
        self.assertEqual(call_session.status, "completed")
        self.assertGreater(call_session.transcript_turns.count(), 0)

        # 5. Check Conversation Intelligence
        self.assertTrue(hasattr(lead, 'intelligence'))
        self.assertEqual(lead.intelligence.buying_intent, "high")
        self.assertGreater(len(lead.intelligence.pain_points), 0)

        # 6. Check Strategy Updated
        strategy = lead.strategy
        self.assertIn("₹", strategy.pricing_guidance)
        self.assertGreater(len(strategy.offer_packages), 0)
        self.assertGreater(lead.lead_score, 70)

        # 7. Audit Events
        audit_events = AuditEvent.objects.filter(lead=lead)
        self.assertGreater(audit_events.count(), 2)
