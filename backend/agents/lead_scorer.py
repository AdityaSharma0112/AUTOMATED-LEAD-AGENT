from typing import Dict, Any, Tuple
from leads.models import Lead, SystemSetting


class LeadScoringEngine:
    """
    Configurable multi-factor Lead Opportunity Scoring Engine.
    Computes a transparent 0-100 score with detailed reasoning breakdown.
    """

    DEFAULT_WEIGHTS = {
        "no_website": 30,
        "strong_reputation": 20,
        "high_review_count": 15,
        "phone_verified": 10,
        "high_buying_intent": 25,
        "pain_points_identified": 15,
        "decision_maker_confirmed": 10,
        "opt_out_penalty": -100
    }

    def _get_weights(self) -> Dict[str, int]:
        try:
            setting = SystemSetting.objects.filter(key="scoring_weights").first()
            if setting and isinstance(setting.value, dict):
                return {**self.DEFAULT_WEIGHTS, **setting.value}
        except Exception:
            pass
        return self.DEFAULT_WEIGHTS

    def calculate_score(self, lead: Lead) -> Tuple[int, Dict[str, Any]]:
        """Calculate score (0-100) and return breakdown dictionary."""
        weights = self._get_weights()
        breakdown = {}
        score = 0

        # Check compliance opt-out
        if lead.opted_out:
            return 0, {"Opt-out / DNC": weights.get("opt_out_penalty", -100), "Reason": "Lead requested Do Not Call."}

        # 1. Website Status Signal
        if lead.website_status in ['likely_absent', 'inaccessible']:
            pts = weights.get("no_website", 30)
            score += pts
            breakdown["Missing / Absent Website (+High Opportunity)"] = pts
        elif lead.website_status == 'unknown':
            pts = int(weights.get("no_website", 30) * 0.5)
            score += pts
            breakdown["Unconfirmed Website Presence"] = pts

        # 2. Rating & Reputation
        if lead.rating and lead.rating >= 4.2:
            pts = weights.get("strong_reputation", 20)
            score += pts
            breakdown[f"Strong Reputation ({lead.rating}★)"] = pts
        elif lead.rating and lead.rating >= 3.8:
            pts = int(weights.get("strong_reputation", 20) * 0.6)
            score += pts
            breakdown[f"Moderate Reputation ({lead.rating}★)"] = pts

        # 3. Review Volume
        if lead.review_count >= 30:
            pts = weights.get("high_review_count", 15)
            score += pts
            breakdown[f"High Customer Traffic ({lead.review_count} reviews)"] = pts
        elif lead.review_count >= 10:
            pts = int(weights.get("high_review_count", 15) * 0.5)
            score += pts
            breakdown[f"Established Reviews ({lead.review_count} reviews)"] = pts

        # 4. Verified Phone
        if lead.normalized_phone:
            pts = weights.get("phone_verified", 10)
            score += pts
            breakdown["Direct Phone Verified"] = pts

        # 5. Conversation Intelligence Signals (if call happened)
        if hasattr(lead, 'intelligence'):
            intel = lead.intelligence
            if intel.buying_intent == 'high':
                pts = weights.get("high_buying_intent", 25)
                score += pts
                breakdown["High Buying Intent from Call (+25)"] = pts
            elif intel.buying_intent == 'medium':
                pts = int(weights.get("high_buying_intent", 25) * 0.5)
                score += pts
                breakdown["Moderate Buying Intent from Call (+12)"] = pts

            if intel.pain_points and len(intel.pain_points) > 0:
                pts = weights.get("pain_points_identified", 15)
                score += pts
                breakdown[f"Explicit Pain Points Identified ({len(intel.pain_points)} points)"] = pts

            if "Owner" in intel.decision_maker_status or "Decision Maker" in intel.decision_maker_status:
                pts = weights.get("decision_maker_confirmed", 10)
                score += pts
                breakdown["Direct Decision Maker Confirmed"] = pts

        # Clamp between 0 and 100
        final_score = max(0, min(100, score))
        return final_score, breakdown

    def update_lead_score(self, lead: Lead) -> int:
        """Compute score and save to lead instance."""
        score, breakdown = self.calculate_score(lead)
        lead.lead_score = score
        lead.score_breakdown = breakdown
        lead.save(update_fields=['lead_score', 'score_breakdown'])
        return score
