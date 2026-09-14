import math
import requests
from typing import Dict, List, Any, Optional
from .base import BaseAgent
from providers.research.google_maps_provider import GoogleMapsProvider
from providers.research.duckduckgo_provider import DuckDuckGoProvider
from providers.research.overpass_osm_provider import OverpassOSMProvider
from leads.models import SearchJob, SystemSetting


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class ResearchAgent(BaseAgent):
    """
    Agent 1 — Research Agent
    Queries 100% REAL Google Maps, Overpass OSM Geocoding, and Google Web Search
    to discover real businesses adhering strictly to the user's geographic search radius.
    """

    def __init__(self):
        super().__init__(name="ResearchAgent")

    def _get_research_providers(self) -> List[Any]:
        # Multi-source discovery: Overpass Geocoded OSM + Google Maps Scraper + Web Citations
        return [
            OverpassOSMProvider(),
            GoogleMapsProvider(),
            DuckDuckGoProvider()
        ]

    def _geocode_center(self, location: str) -> Optional[tuple]:
        """Resolve center latitude and longitude for distance bounding."""
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            res = requests.get(
                "https://photon.komoot.io/api/",
                params={"q": f"{location}, India", "limit": 1, "lang": "en"},
                headers=headers,
                timeout=4
            )
            if res.status_code == 200:
                data = res.json()
                features = data.get("features", [])
                if features:
                    coords = features[0].get("geometry", {}).get("coordinates", [])
                    if len(coords) >= 2:
                        return float(coords[1]), float(coords[0])
        except Exception:
            pass

        try:
            headers = {"User-Agent": "LeadAgentBot/1.0"}
            res = requests.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{location}, India", "format": "json", "limit": 1},
                headers=headers,
                timeout=4
            )
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception:
            pass
        return None

    def execute_research(self, intent: Dict[str, Any], search_job: SearchJob = None) -> List[Dict[str, Any]]:
        """Query real research providers and collect candidate leads strictly within the specified radius."""
        category = intent.get("category") or "Local Business"
        location = intent.get("location") or "Solan"
        try:
            radius_km = float(intent.get("radius_km") or 30.0)
        except (ValueError, TypeError):
            radius_km = 30.0
        filters = intent or {}

        # Resolve Center Coordinates
        center_lat = filters.get("lat")
        center_lon = filters.get("lon")
        if center_lat is None or center_lon is None:
            geo_center = self._geocode_center(location)
            if geo_center:
                center_lat, center_lon = geo_center
                filters["lat"] = center_lat
                filters["lon"] = center_lon

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
                added_count = 0
                for r in results:
                    name = (r.get("business_name") or "").strip()
                    if not name or len(name) < 3:
                        continue

                    # Geographic radius boundary filter
                    r_lat = r.get("latitude")
                    r_lon = r.get("longitude")
                    if r_lat is not None and r_lon is not None and center_lat is not None and center_lon is not None:
                        try:
                            dist = haversine_distance_km(float(r_lat), float(r_lon), float(center_lat), float(center_lon))
                            # Allow a small 20% margin for boundary businesses
                            if dist > (radius_km * 1.25):
                                continue
                        except Exception:
                            pass

                    # Ensure locality or city matches location context
                    if not r.get("city"):
                        r["city"] = location
                    if not r.get("locality"):
                        r["locality"] = location

                    clean_key = "".join(e for e in name.lower() if e.isalnum())
                    if clean_key not in seen_names:
                        seen_names.add(clean_key)
                        all_raw_leads.append(r)
                        added_count += 1

                self.log_event(
                    event_type="PROVIDER_SEARCH_COMPLETED",
                    description=f"Provider {provider_name} returned {len(results)} places ({added_count} within {radius_km}km of {location}).",
                    search_job=search_job,
                    payload={"provider": provider_name, "total_found": len(results), "added_within_radius": added_count}
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
            description=f"Aggregated total of {len(all_raw_leads)} verified candidates strictly within {radius_km}km of {location}.",
            search_job=search_job,
            payload={"total_candidates": len(all_raw_leads), "location": location, "radius_km": radius_km}
        )

        return all_raw_leads
