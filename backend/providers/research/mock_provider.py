import math
import random
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..base import ResearchProviderBase


class MockResearchProvider(ResearchProviderBase):
    """
    High-fidelity mock research provider simulating responses from Google Places,
    Justdial, Sulekha, YellowPages, and OpenStreetMap for local businesses.
    """

    SOLAN_MECHANICS = [
        {
            "business_name": "Sharma Auto Works & Diagnostic Center",
            "category": "Car Repair & Mechanics",
            "phone": "+91 98160 44521",
            "contact_person": "Ramesh Sharma",
            "address": "Near Mall Road, Below Old Bus Stand, Solan, Himachal Pradesh 173212",
            "locality": "Mall Road",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.9084,
            "longitude": 77.0999,
            "rating": 4.6,
            "review_count": 48,
            "review_summary": "Known for quick engine diagnostics and fair pricing. Busy during tourist weekends.",
            "services": ["Engine Overhaul", "Brake Repair", "Computerized Scanning", "Emergency Roadside Assistance"],
            "hours": {"Mon-Sat": "09:00 AM - 08:00 PM", "Sun": "10:00 AM - 02:00 PM"},
            "website_url": "",
            "sources": [
                {"source_name": "Google Maps", "source_url": "https://maps.google.com/?cid=solan_sharma_auto", "raw_website": ""},
                {"source_name": "Justdial Solan", "source_url": "https://justdial.com/Solan/Sharma-Auto-Works", "raw_phone": "098160-44521"}
            ]
        },
        {
            "business_name": "Himalayan Car Care & Wheel Alignment",
            "category": "Car Repair & Mechanics",
            "phone": "+91 94180 88231",
            "contact_person": "Vikram Thakur",
            "address": "NH-5 Bypass, Near Chambaghat, Solan, Himachal Pradesh 173213",
            "locality": "Chambaghat",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.9250,
            "longitude": 77.1150,
            "rating": 4.3,
            "review_count": 32,
            "review_summary": "Specialist in 3D wheel alignment, suspension tuning, and high-altitude vehicle checkups.",
            "services": ["3D Wheel Alignment", "Suspension Tuning", "AC Gas Refill", "Tire Replacement"],
            "hours": {"Mon-Sun": "08:30 AM - 07:30 PM"},
            "website_url": "",
            "sources": [
                {"source_name": "Google Maps", "source_url": "https://maps.google.com/?cid=solan_himalayan_cc", "raw_website": ""},
                {"source_name": "IndiaMART", "source_url": "https://indiamart.com/himalayan-car-care-solan", "raw_phone": "+919418088231"}
            ]
        },
        {
            "business_name": "Solan Express Motor Garage",
            "category": "Car Repair & Mechanics",
            "phone": "+91 98055 12904",
            "contact_person": "Anil Verma",
            "address": "Kotla Nala Road, Solan, Himachal Pradesh 173212",
            "locality": "Kotla Nala",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.9015,
            "longitude": 77.1040,
            "rating": 4.1,
            "review_count": 19,
            "review_summary": "Good local mechanic for Maruti and Hyundai cars. Gets all work by word of mouth.",
            "services": ["General Service", "Oil Change", "Clutch Plate Repair", "Denting & Painting"],
            "hours": {"Mon-Sat": "09:30 AM - 07:00 PM"},
            "website_url": "",
            "sources": [
                {"source_name": "YellowPages India", "source_url": "https://yellowpages.in/solan-express-motors", "raw_phone": "01792-22904"}
            ]
        },
        {
            "business_name": "Pines Auto Electricals & Battery Hub",
            "category": "Car Repair & Mechanics",
            "phone": "+91 98171 77340",
            "contact_person": "Gurpreet Singh",
            "address": "Saproon Chowk, Solan, Himachal Pradesh 173211",
            "locality": "Saproon",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.8950,
            "longitude": 77.0900,
            "rating": 4.7,
            "review_count": 64,
            "review_summary": "Top-rated electrical and alternator repairs in Saproon. Highly recommended by locals.",
            "services": ["Car Battery Replacement", "Starter Motor Repair", "Headlight Upgrades", "Wiring Diagnostics"],
            "hours": {"Mon-Sat": "09:00 AM - 08:00 PM"},
            "website_url": "",
            "sources": [
                {"source_name": "Google Maps", "source_url": "https://maps.google.com/?cid=solan_pines_auto", "raw_website": ""},
                {"source_name": "Sulekha", "source_url": "https://sulekha.com/pines-auto-solan", "raw_phone": "9817177340"}
            ]
        },
        {
            "business_name": "Kandaghat Mountain Roadside Garage",
            "category": "Car Repair & Mechanics",
            "phone": "+91 98820 31055",
            "contact_person": "Sunil Kumar",
            "address": "Shimla-Kalka Highway, Kandaghat (15 km from Solan), HP 173215",
            "locality": "Kandaghat",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.9600,
            "longitude": 77.1080,
            "rating": 4.5,
            "review_count": 87,
            "review_summary": "Essential stop for highway breakdowns and radiator overheats in hilly terrain.",
            "services": ["24/7 Roadside Assistance", "Brake Overhaul", "Radiator Flushing", "Towing Support"],
            "hours": {"Mon-Sun": "24 Hours Open"},
            "website_url": "",
            "sources": [
                {"source_name": "Google Maps", "source_url": "https://maps.google.com/?cid=kandaghat_garage", "raw_website": ""},
                {"source_name": "Justdial", "source_url": "https://justdial.com/Kandaghat/Kandaghat-Garage", "raw_phone": "+919882031055"}
            ]
        },
        {
            "business_name": "Him Motors Authorized Multi-Brand Service",
            "category": "Car Repair & Mechanics",
            "phone": "+91 98162 90011",
            "contact_person": "Rajesh Gupta",
            "address": "Deonghat, Solan, Himachal Pradesh 173211",
            "locality": "Deonghat",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.9120,
            "longitude": 77.0850,
            "rating": 4.2,
            "review_count": 41,
            "review_summary": "Clean facility with hydraulic lifts. Has an old Facebook page but no actual website.",
            "services": ["Periodic Maintenance", "Paint Booth", "Insurance Claims", "Wheel Balancing"],
            "hours": {"Mon-Sat": "09:00 AM - 06:30 PM"},
            "website_url": "",
            "sources": [
                {"source_name": "Google Maps", "source_url": "https://maps.google.com/?cid=him_motors_solan", "raw_website": ""},
                {"source_name": "Facebook Place", "source_url": "https://facebook.com/HimMotorsSolan"}
            ]
        },
        {
            "business_name": "Modern Automobile & Tech Works",
            "category": "Car Repair & Mechanics",
            "phone": "+91 94182 55432",
            "contact_person": "Deepak Kashyap",
            "address": "Near Power House, Salogra, Solan, HP 173214",
            "locality": "Salogra",
            "city": "Solan",
            "state": "Himachal Pradesh",
            "country": "India",
            "latitude": 30.9380,
            "longitude": 77.1020,
            "rating": 3.9,
            "review_count": 14,
            "review_summary": "Small workshop, reliable for quick oil changes and scooter/car engine troubleshooting.",
            "services": ["General Tuning", "Carburetor Cleaning", "Brake Pad Change"],
            "hours": {"Mon-Sat": "10:00 AM - 07:00 PM"},
            "website_url": "",
            "sources": [
                {"source_name": "Local Directory", "source_url": "https://solandir.in/salogra-mechanic", "raw_phone": "09418255432"}
            ]
        }
    ]

    def _generate_synthetic_leads(self, category: str, location: str, count: int = 5) -> List[Dict[str, Any]]:
        """Synthesize dynamic, realistic business leads if query is outside pre-seeded data."""
        results = []
        clean_cat = category.title() if category else "Local Business"
        clean_loc = location.title() if location else "Downtown"

        names = [
            f"Apex {clean_cat} Solutions",
            f"{clean_loc} Premier {clean_cat}",
            f"Heritage {clean_cat} & Services",
            f"SuperStar {clean_cat} Studio",
            f"Vanguard {clean_cat} Care",
            f"City Centre {clean_cat} Works",
        ]

        for i in range(min(count, len(names))):
            phone_num = f"+91 {random.randint(94000, 98999)} {random.randint(10000, 99999)}"
            results.append({
                "business_name": names[i],
                "category": clean_cat,
                "phone": phone_num,
                "contact_person": f"Manager {chr(65 + i)}",
                "address": f"Plot #{10 + i * 7}, Main Sector Road, {clean_loc}",
                "locality": f"Sector {i + 1}",
                "city": clean_loc,
                "state": "State",
                "country": "India",
                "latitude": 28.5 + (i * 0.01),
                "longitude": 77.2 + (i * 0.01),
                "rating": round(random.uniform(3.8, 4.9), 1),
                "review_count": random.randint(12, 110),
                "review_summary": f"Reputable {clean_cat.lower()} provider with high customer satisfaction.",
                "services": [f"Standard {clean_cat}", f"Custom {clean_cat} Assessment", "Emergency Support"],
                "hours": {"Mon-Sat": "09:00 AM - 07:00 PM"},
                "website_url": "",
                "sources": [
                    {"source_name": "Google Maps", "source_url": f"https://maps.google.com/?q={names[i]}", "raw_website": ""},
                    {"source_name": "Local Directory", "source_url": f"https://directory.com/?q={names[i]}", "raw_phone": phone_num}
                ]
            })
        return results

    def search_businesses(
        self,
        category: str,
        location: str,
        radius_km: float = 30.0,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        filters = filters or {}
        loc_lower = location.lower() if location else ""
        cat_lower = category.lower() if category else ""

        # Check if Solan mechanics matches pre-seeded dataset
        if ("solan" in loc_lower or "himachal" in loc_lower) and ("mechanic" in cat_lower or "car" in cat_lower or "repair" in cat_lower or "auto" in cat_lower or not cat_lower):
            leads = [dict(item) for item in self.SOLAN_MECHANICS]
        else:
            leads = self._generate_synthetic_leads(category=category, location=location, count=6)

        # Apply website filter if requested
        website_filter = filters.get('website_filter', 'no_website')
        if website_filter in ['no_website', 'absent', 'without_website']:
            # All our pre-seeded mock candidates have no official website
            pass

        return leads
