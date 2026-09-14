import re
import math
from typing import Dict, List, Any, Tuple, Optional
from django.utils import timezone
from .base import BaseAgent
from leads.models import Lead, DiscoverySource, ConflictLog, SearchJob
from providers.research.http_website_checker import HTTPWebsiteChecker


class VerificationAgent(BaseAgent):
    """
    Agent 2 — Verification & Enrichment Agent
    Normalizes fields, resolves duplicates, logs source conflicts, calculates field confidence,
    and executes real live HTTP requests to test website presence and domain health.
    """

    def __init__(self):
        super().__init__(name="VerificationAgent")

    def normalize_phone(self, raw_phone: str) -> Tuple[str, str]:
        """
        Normalize phone numbers to standard format and E.164 representation.
        Returns: (display_format, normalized_digits_only)
        """
        if not raw_phone:
            return "", ""

        # Strip non-digit characters except leading +
        cleaned = re.sub(r'[^\d+]', '', str(raw_phone))
        digits = re.sub(r'\D', '', cleaned)

        if len(digits) == 10:
            e164 = f"+91{digits}"
            display = f"+91 {digits[:5]} {digits[5:]}"
        elif len(digits) == 11 and digits.startswith('0'):
            e164 = f"+91{digits[1:]}"
            display = f"+91 {digits[1:6]} {digits[6:]}"
        elif len(digits) == 12 and digits.startswith('91'):
            e164 = f"+{digits}"
            display = f"+91 {digits[2:7]} {digits[7:]}"
        else:
            e164 = f"+{digits}" if digits else ""
            display = raw_phone.strip()

        return display, e164

    def normalize_address(self, raw_address: str) -> str:
        """Clean and normalize address string."""
        if not raw_address:
            return ""
        addr = re.sub(r'\s+', ' ', str(raw_address))
        addr = re.sub(r',\s*,', ',', addr)
        return addr.strip(" ,")

    def _calculate_string_similarity(self, s1: str, s2: str) -> float:
        """Normalized bigram/token Jaccard similarity for business name deduplication."""
        if not s1 or not s2:
            return 0.0
        w1 = set(re.findall(r'\w+', s1.lower()))
        w2 = set(re.findall(r'\w+', s2.lower()))
        if not w1 or not w2:
            return 0.0
        intersection = len(w1.intersection(w2))
        union = len(w1.union(w2))
        return intersection / union

    def _geo_distance_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate Haversine geographic distance in kilometers."""
        if None in [lat1, lon1, lat2, lon2]:
            return 9999.0
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def is_duplicate(self, candidate: Dict[str, Any], existing_leads: List[Lead]) -> Tuple[bool, Optional[Lead]]:
        """
        Check if candidate is a duplicate using:
        1. Exact normalized phone match
        2. Business name similarity >= 0.75 and close geographic proximity (< 3 km)
        """
        cand_phone = candidate.get("normalized_phone") or ""
        cand_name = candidate.get("business_name") or ""
        cand_lat = candidate.get("latitude")
        cand_lon = candidate.get("longitude")
        cand_city = (candidate.get("city") or "").lower()

        for existing in existing_leads:
            if cand_phone and existing.normalized_phone and cand_phone == existing.normalized_phone:
                return True, existing

            name_sim = self._calculate_string_similarity(cand_name, existing.business_name or "")
            if name_sim >= 0.75:
                if cand_lat and cand_lon and existing.latitude and existing.longitude:
                    dist = self._geo_distance_km(cand_lat, cand_lon, existing.latitude, existing.longitude)
                    if dist <= 3.0:
                        return True, existing
                else:
                    existing_city = (existing.city or "").lower()
                    if cand_city and existing_city and cand_city == existing_city:
                        return True, existing

        return False, None

    def evaluate_website_presence(self, raw_lead: Dict[str, Any]) -> Tuple[str, str, float]:
        """
        Execute real live HTTP request to test if website URL is active and accessible.
        """
        explicit_url = (raw_lead.get("website_url") or "").strip()
        sources = raw_lead.get("sources") or []

        # Real HTTP verification
        if explicit_url:
            return HTTPWebsiteChecker.verify_url(explicit_url)

        # Evaluate based on directory evidence
        if len(sources) >= 2:
            return "likely_absent", "", 0.88
        elif len(sources) == 1:
            return "likely_absent", "", 0.75

        return "unknown", "", 0.50

    def process_and_store_lead(
        self,
        raw_lead: Dict[str, Any],
        search_job: Optional[SearchJob] = None,
        existing_leads: Optional[List[Lead]] = None
    ) -> Tuple[Optional[Lead], bool]:
        """Normalize, deduplicate, verify via HTTP, and persist lead."""
        existing_leads = existing_leads or list(Lead.objects.all())

        b_name = (raw_lead.get("business_name") or "").strip()
        lower_name = b_name.lower()

        # STRICT QUALITY GATE: Reject any synthetic, generic, or directory placeholder names
        if (
            not b_name
            or len(b_name) < 3
            or any(bad in lower_name for bad in ["hub (", "(justdial)", "(indiamart)", "(sulekha)", "directory source", "unknown business", "site_name", "pwzekb", "hfpxzc", "nv2pk"])
            or (len(b_name) <= 8 and not (' ' in b_name or any(v in lower_name for v in ['a', 'e', 'i', 'o', 'u'])))
        ):
            return None, False

        display_phone, norm_phone = self.normalize_phone(raw_lead.get("phone") or "")
        clean_address = self.normalize_address(raw_lead.get("address") or "")
        web_status, web_url, web_conf = self.evaluate_website_presence(raw_lead)

        job_location = (search_job.parsed_intent.get("location") if search_job and search_job.parsed_intent else "") or "Solan"
        job_category = (search_job.parsed_intent.get("category") if search_job and search_job.parsed_intent else "") or "Local Business"

        b_city = raw_lead.get("city") or job_location or "Solan"
        b_cat = raw_lead.get("category") or job_category

        candidate_data = {
            **raw_lead,
            "business_name": b_name,
            "category": b_cat,
            "city": b_city,
            "phone": display_phone,
            "normalized_phone": norm_phone,
            "address": clean_address or f"{b_name}, {b_city}, India",
            "website_status": web_status,
            "website_url": web_url or "",
            "website_confidence": web_conf,
        }

        # Deduplication
        is_dup, existing_match = self.is_duplicate(candidate_data, existing_leads)
        if is_dup and existing_match:
            self._handle_duplicate_merge(existing_match, raw_lead, search_job)
            return existing_match, False

        count = Lead.objects.count() + 1
        lead_id = f"LEAD-{1000 + count}"

        lead = Lead.objects.create(
            lead_id=lead_id,
            search_job=search_job,
            business_name=candidate_data.get("business_name") or "Unknown Business",
            category=candidate_data.get("category") or "Local Services",
            phone=display_phone or "",
            normalized_phone=norm_phone or "",
            email=candidate_data.get("email") or "",
            contact_person=candidate_data.get("contact_person") or "",
            address=candidate_data.get("address") or f"{b_city}, India",
            locality=candidate_data.get("locality") or "",
            city=b_city,
            state=candidate_data.get("state") or "Himachal Pradesh",
            country=candidate_data.get("country") or "India",
            latitude=candidate_data.get("latitude"),
            longitude=candidate_data.get("longitude"),
            website_status=web_status or "unknown",
            website_url=web_url or "",
            website_confidence=web_conf,
            google_profile_present=True if raw_lead.get("rating") else False,
            social_profiles=candidate_data.get("social_profiles") or [],
            rating=candidate_data.get("rating"),
            review_count=candidate_data.get("review_count") or 0,
            review_summary=candidate_data.get("review_summary") or "",
            services=candidate_data.get("services") or [b_cat],
            hours=candidate_data.get("hours") or {},
            description=candidate_data.get("description") or "",
            field_confidence={
                "name": 0.95,
                "phone": 0.90 if norm_phone else 0.40,
                "address": 0.85 if clean_address else 0.40,
                "website": web_conf
            },
            last_verified_at=timezone.now()
        )

        # Attach Discovery Sources
        sources = raw_lead.get("sources") or []
        if not sources:
            sources = [{"source_name": "Direct Geodata", "source_url": "", "raw_data": raw_lead}]

        for s in sources:
            DiscoverySource.objects.create(
                lead=lead,
                source_name=s.get("source_name") or "Public Source",
                source_url=s.get("source_url") or "",
                raw_data=s if isinstance(s, dict) else {},
                confidence=0.85
            )

        self.log_event(
            event_type="LEAD_VERIFIED_AND_CREATED",
            description=f"Verified real lead '{lead.business_name}' ({lead.lead_id}) with website_status='{lead.website_status}' (confidence: {round(web_conf*100)}%)",
            lead=lead,
            search_job=search_job,
            payload={"lead_id": lead.lead_id, "website_status": web_status, "confidence": web_conf}
        )

        return lead, True

    def _handle_duplicate_merge(self, lead: Lead, raw_lead: Dict[str, Any], search_job: Optional[SearchJob] = None):
        """Merge additional source into existing lead and log discrepancies."""
        sources = raw_lead.get("sources", [])
        for s in sources:
            s_name = s.get("source_name", "Secondary Source")
            DiscoverySource.objects.create(
                lead=lead,
                source_name=s_name,
                source_url=s.get("source_url", ""),
                raw_data=s,
                confidence=0.80
            )

            new_phone, _ = self.normalize_phone(s.get("raw_phone", ""))
            if new_phone and lead.phone and new_phone != lead.phone:
                ConflictLog.objects.create(
                    lead=lead,
                    field_name="phone",
                    source_a="Primary Source",
                    value_a=lead.phone,
                    source_b=s_name,
                    value_b=new_phone,
                    resolution_notes="Preserved primary phone, logged secondary variation."
                )

        self.log_event(
            event_type="DUPLICATE_MERGED",
            description=f"Deduplicated and merged new source data into existing lead '{lead.business_name}' ({lead.lead_id}).",
            lead=lead,
            search_job=search_job
        )
