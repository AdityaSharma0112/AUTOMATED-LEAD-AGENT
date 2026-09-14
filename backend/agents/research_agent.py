from typing import Dict, List, Any
from .base import BaseAgent
from providers.research.google_maps_provider import GoogleMapsProvider
from providers.research.duckduckgo_provider import DuckDuckGoProvider
from leads.models import SearchJob, SystemSetting


class ResearchAgent(BaseAgent):
    """
    Agent 1 — Research Agent
    Queries 100% REAL Google Maps (via SerpAPI & Direct Scraper) and Google Web Search
    to discover real businesses with authentic Google Maps links.
    """

    def __init__(self):
        super().__init__(name="ResearchAgent")

    def _get_research_providers(self) -> List[Any]:
        # Exclusively query Google Maps & Google Web Search
        return [
            GoogleMapsProvider(),
            DuckDuckGoProvider()
        ]

    def execute_research(self, intent: Dict[str, Any], search_job: SearchJob = None) -> List[Dict[str, Any]]:
        """Query real research providers and collect aggregated candidate leads."""
        category = intent.get("category") or "Local Business"
        location = intent.get("location") or "Kangra"
        try:
            radius_km = float(intent.get("radius_km") or 30.0)
        except (ValueError, TypeError):
            radius_km = 30.0
        filters = intent or {}

        all_raw_leads = []
        seen_names = set()
        providers = self._get_research_providers()

        for provider in providers:
            provider_name = provider.__class__.__name__
            try:
                results = provider.search_businesses(
                    category=category,
                    location=location,
                    radius_km=radius_km,
                    filters=filters
                )
                for r in results:
                    name = (r.get("business_name") or "").strip()
                    if not name or len(name) < 3:
                        continue
                    clean_key = "".join(e for e in name.lower() if e.isalnum())
                    if clean_key not in seen_names:
                        seen_names.add(clean_key)
                        all_raw_leads.append(r)

                self.log_event(
                    event_type="PROVIDER_SEARCH_COMPLETED",
                    description=f"Provider {provider_name} returned {len(results)} Google Maps / Web candidates.",
                    search_job=search_job,
                    payload={"provider": provider_name, "count": len(results)}
                )
            except Exception as e:
                self.log_event(
                    event_type="PROVIDER_SEARCH_ERROR",
                    description=f"Provider {provider_name} error: {str(e)}",
                    search_job=search_job,
                    payload={"provider": provider_name, "error": str(e)}
                )

        self.log_event(
            event_type="RESEARCH_COMPLETED",
            description=f"Aggregated total of {len(all_raw_leads)} real Google Maps candidates for verification.",
            search_job=search_job,
            payload={"total_candidates": len(all_raw_leads)}
        )

        return all_raw_leads
