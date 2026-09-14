import os
import requests
from typing import Dict, List, Any, Optional
from ..base import ResearchProviderBase
from .mock_provider import MockResearchProvider


class SerpGoogleProvider(ResearchProviderBase):
    """
    Live Google Search / Google Places Provider via SerpAPI or custom API endpoint.
    Falls back gracefully to MockResearchProvider if no API key is provided.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("SERPAPI_API_KEY", "")
        self.fallback = MockResearchProvider()

    def search_businesses(
        self,
        category: str,
        location: str,
        radius_km: float = 30.0,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        if not self.api_key:
            # Graceful fallback to mock data
            return self.fallback.search_businesses(category, location, radius_km, filters)

        query = f"{category} in {location}"
        url = "https://serpapi.com/search.json"
        params = {
            "engine": "google_maps",
            "q": query,
            "api_key": self.api_key,
            "hl": "en"
        }

        try:
            response = requests.get(url, params=params, timeout=12)
            if response.status_code != 200:
                return self.fallback.search_businesses(category, location, radius_km, filters)

            data = response.json()
            local_results = data.get("local_results", [])
            extracted = []

            for item in local_results:
                name = item.get("title", "")
                phone = item.get("phone", "")
                address = item.get("address", "")
                website = item.get("website", "")
                rating = item.get("rating", None)
                reviews = item.get("reviews", 0)
                gps = item.get("gps_coordinates", {})

                extracted.append({
                    "business_name": name,
                    "category": category,
                    "phone": phone,
                    "contact_person": "",
                    "address": address,
                    "locality": "",
                    "city": location,
                    "state": "",
                    "country": "India",
                    "latitude": gps.get("latitude"),
                    "longitude": gps.get("longitude"),
                    "rating": float(rating) if rating else None,
                    "review_count": int(reviews) if reviews else 0,
                    "review_summary": f"Google Maps rating {rating} with {reviews} reviews.",
                    "services": [category],
                    "hours": item.get("operating_hours", {}),
                    "website_url": website or "",
                    "sources": [
                        {
                            "source_name": "Google Maps (SerpAPI)",
                            "source_url": item.get("link", ""),
                            "raw_website": website or ""
                        }
                    ]
                })

            return extracted if extracted else self.fallback.search_businesses(category, location, radius_km, filters)

        except Exception:
            return self.fallback.search_businesses(category, location, radius_km, filters)
