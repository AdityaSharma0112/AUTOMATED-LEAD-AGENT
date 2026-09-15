import re
from typing import Dict, List, Any, Optional
from ..base import LLMProviderBase


class MockLLMProvider(LLMProviderBase):
    """
    Deterministic, high-quality local NLP reasoning engine.
    Allows the entire multi-agent system to run locally out-of-the-box with zero paid API keys.
    """

    def parse_intent(self, query: str) -> Dict[str, Any]:
        """Parse natural language request into structured filter criteria."""
        q = query.lower()

        # Extract radius (e.g. 'within 30 km', '20km', 'radius of 15 km')
        radius_match = re.search(r'(\d+)\s*(?:km|kilometers|miles)', q)
        radius = float(radius_match.group(1)) if radius_match else 30.0

        # Extract location (e.g. 'of Solan', 'in Shimla', 'near Chandigarh', 'in Delhi')
        location = "Solan"
        loc_match = re.search(r'(?:in|of|near|around)\s+([a-zA-Z\s]+?)(?:\s+that|\s+with|\s+who|\s+within|$|\.|\,)', query, re.IGNORECASE)
        if loc_match:
            candidate_loc = loc_match.group(1).strip()
            # Clean up trailing words
            candidate_loc = re.sub(r'\b(that|which|appear|with|without|within|me|\d+.*)\b', '', candidate_loc, flags=re.IGNORECASE).strip()
            if candidate_loc and candidate_loc.lower() not in ['me', 'here', 'my area']:
                location = candidate_loc

        # Extract category (e.g. 'general store', 'grocery', 'mechanics', 'plumbers', 'cafes')
        category = "General Store & Convenience"
        if "general store" in q or "grocery" in q or "kirana" in q or "convenience" in q or "supermarket" in q:
            category = "General Store & Grocery"
        elif "mechanic" in q or "car repair" in q or "garage" in q or "auto" in q:
            category = "Car Repair & Mechanics"
        elif "plumber" in q or "plumbing" in q:
            category = "Plumbing Services"
        elif "electrician" in q or "electrical" in q:
            category = "Electrical Contractors"
        elif "pharmacy" in q or "chemist" in q or "medical store" in q:
            category = "Pharmacy & Chemist"
        elif "dentist" in q or "dental" in q or "clinic" in q or "doctor" in q or "hospital" in q:
            category = "Healthcare & Clinic"
        elif "restaurant" in q or "cafe" in q or "dhaba" in q or "dining" in q:
            category = "Restaurants & Dining"
        elif "gym" in q or "fitness" in q:
            category = "Fitness Centers & Gyms"
        else:
            cat_match = re.search(r'(?:find|search|get|look for)\s+([a-zA-Z\s]+?)(?:\s+within|\s+in|\s+near|\s+of|$)', query, re.IGNORECASE)
            if cat_match:
                candidate_cat = cat_match.group(1).strip().title()
                if candidate_cat.lower() not in ['businesses', 'leads', 'stores']:
                    category = candidate_cat

        # Extract website filter
        website_filter = "no_website"
        if "no website" in q or "without website" in q or "appear to have no website" in q or "lack website" in q:
            website_filter = "no_website"
        elif "has website" in q or "with website" in q:
            website_filter = "has_website"
        else:
            website_filter = "all"

        return {
            "category": category,
            "location": location,
            "radius_km": radius,
            "website_filter": website_filter,
            "target_attributes": ["phone_verified", "opportunity_score"]
        }

    def extract_conversation_intelligence(
        self,
        lead_profile: Dict[str, Any],
        transcript_turns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract structured customer pain points, budget, timeline, and buying intent from turns."""
        business_name = lead_profile.get("business_name", "Business")
        category = lead_profile.get("category", "Local Services")
        owner_name = lead_profile.get("contact_person") or "The Owner"

        full_dialogue = " ".join([t.get("text", "") for t in transcript_turns]).lower()

        buying_intent = "high"
        if "not interested" in full_dialogue or "don't call" in full_dialogue:
            buying_intent = "low"
        elif "send details" in full_dialogue or "pricing" in full_dialogue or "interested" in full_dialogue:
            buying_intent = "high"
        else:
            buying_intent = "medium"

        budget_signal = "medium"
        budget_amount = "₹15,000 - ₹35,000"
        if "cheap" in full_dialogue or "low budget" in full_dialogue:
            budget_signal = "low"
            budget_amount = "₹10,000 - ₹15,000"
        elif "premium" in full_dialogue or "grow fast" in full_dialogue:
            budget_signal = "high"
            budget_amount = "₹40,000+"

        return {
            "summary": f"Conducted qualification call with {owner_name} at {business_name}. Confirmed current storefront operations and identified high demand for direct WhatsApp order catalog and local Google Maps discovery.",
            "pain_points": [
                "Losing orders to delivery apps charging 20-30% high commission margins",
                "No digital product catalog or price list for neighborhood customers",
                "Customers cannot find verified contact hours on Google Maps"
            ],
            "goals": [
                "Launch 1-tap WhatsApp home delivery ordering without middleman fees",
                "Dominate local neighborhood search results on Google Maps",
                "Automate weekly promotional broadcast messages to regular shoppers"
            ],
            "requirements": [
                "Mobile-friendly WhatsApp digital store catalog",
                "Verified Google Business Profile setup",
                "Printable QR code counter stand for in-store customer onboarding"
            ],
            "current_process_and_tools": "Manual phone calls, in-person cash/UPI, physical counter notebook",
            "stated_website_presence": "Confirmed: No digital website. Relies on neighborhood walk-ins.",
            "desired_solution": "Direct WhatsApp Storefront & Local Google Maps Booster",
            "budget_signal": budget_signal,
            "budget_amount": budget_amount,
            "timeline": "Ready to initiate within 7 days",
            "decision_maker_status": f"Confirmed: {owner_name} is the store owner and primary decision maker.",
            "objections": [
                {"objection": "Managing online product catalogs is too tedious.", "rebuttal": "We handle the complete product catalog setup and ongoing updates; you only receive completed orders directly on WhatsApp."}
            ],
            "buying_intent": buying_intent,
            "customer_quotes": [
                f"\"If we can get orders directly on WhatsApp without paying huge commissions to aggregators, that would be ideal.\""
            ],
            "confidence_score": 0.90
        }

    def generate_strategy(
        self,
        lead_profile: Dict[str, Any],
        intelligence: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Synthesize online research + call intelligence into an actionable solution strategy."""
        business_name = lead_profile.get("business_name", "Target Store")
        category = lead_profile.get("category", "Retail & General Store")
        city = lead_profile.get("city", "Solan")
        rating = lead_profile.get("rating", 4.3)
        review_count = lead_profile.get("review_count", 20)

        intel = intelligence or {}

        return {
            "problem_statement": (
                f"{business_name} in {city} has strong neighborhood goodwill, but lacks a dedicated digital ordering "
                f"channel. Local shoppers increasingly search online for quick home delivery or store hours, and without a verified "
                f"digital presence, they end up ordering from commission-heavy aggregator apps or competitor chains."
            ),
            "evidence_online": (
                f"Audit confirms {business_name} has no official website or digital ordering menu. "
                f"Physical store location exists but lacks instant-order action triggers."
            ),
            "evidence_call": (
                intel.get("summary", "Owner confirmed interest in direct customer ordering without aggregator fees.")
            ),
            "opportunity": (
                f"Deploy a Direct-to-Consumer WhatsApp Ordering Storefront + Google Map Pack Optimization. "
                f"Capture high-margin repeat monthly grocery and household delivery orders directly."
            ),
            "recommended_solutions": [
                {
                    "priority": 1,
                    "title": "1-Tap WhatsApp Digital Storefront",
                    "impact": "High",
                    "description": "Interactive mobile catalog where shoppers browse items and send order lists straight to your WhatsApp."
                },
                {
                    "priority": 2,
                    "title": "Google Maps & Local Search Rank Booster",
                    "impact": "High",
                    "description": "Claim, optimize, and rank Google Business Profile to capture local 'general store near me' searches."
                },
                {
                    "priority": 3,
                    "title": "QR Code In-Store Customer Retention Kit",
                    "impact": "Medium",
                    "description": "Countertop acrylic stands with QR codes enabling walk-ins to join your VIP WhatsApp reorder club."
                }
            ],
            "fit_rationale": (
                f"For a busy general store like {business_name}, a zero-friction WhatsApp system requires no computer management, "
                f"fitting directly into their existing daily mobile phone habits."
            ),
            "offer_packages": [
                {
                    "tier": "Quick Launch Store",
                    "price": "₹14,999 (One-time)",
                    "features": ["WhatsApp Digital Storefront", "Google Maps Setup", "Counter QR Stand", "1 Year Hosting"]
                },
                {
                    "tier": "Neighborhood Leader (Recommended)",
                    "price": "₹24,999 (One-time) + ₹1,999/mo",
                    "features": ["Everything in Quick Launch", "Monthly Catalog Updates", "Automated Review Collector", "Local Search SEO"]
                },
                {
                    "tier": "Retail Growth Suite",
                    "price": "₹39,999 (One-time)",
                    "features": ["Everything in Leader", "WhatsApp Broadcast Automation", "Inventory Fast-Upload Tool", "Dedicated Support"]
                }
            ],
            "pricing_guidance": "Position the 'Neighborhood Leader' tier. Highlight that 10-15 repeat grocery delivery orders per month completely cover the investment.",
            "pitch_script": (
                f"\"Hello {lead_profile.get('contact_person') or 'there'}, I'm reaching out regarding {business_name} in {city}. "
                f"We noticed many families in your area search for home delivery on their phones, but currently have to go through expensive delivery apps. "
                f"We build simple 1-tap WhatsApp digital stores for local merchants in {city} so customers order directly from you with zero commission fees.\""
            ),
            "objections_and_responses": [
                {
                    "objection": "We already have enough counter customers.",
                    "response": "Counter customers are great, but online ordering captures working professionals and families who prefer home delivery and place larger weekly order tickets."
                },
                {
                    "objection": "I don't know how to operate complicated apps.",
                    "response": "There is no software to learn. Orders simply arrive as clear formatted text messages on your regular WhatsApp mobile app."
                }
            ],
            "lead_score": 82,
            "score_reasoning": (
                f"Strong potential: Established physical store in {city}, zero existing digital storefront, and clear path to immediate positive ROI via direct WhatsApp ordering."
            ),
            "next_action": "Send WhatsApp store demo preview link and schedule a 5-minute phone walkthrough.",
            "follow_up_date": "Within 24 hours"
        }

    def refine_strategy_with_ai(
        self,
        lead_profile: Dict[str, Any],
        intelligence: Dict[str, Any],
        current_strategy: Dict[str, Any],
        user_instruction: str
    ) -> Dict[str, Any]:
        """Mock fallback for strategy refinement."""
        base = self.generate_strategy(lead_profile, intelligence)
        base["problem_statement"] = f"{base['problem_statement']} (Tailored note: {user_instruction})"
        base["pitch_script"] = f"{base['pitch_script']}\n\n[Customized per request: {user_instruction}]"
        return base

    def generate_call_turn(
        self,
        lead_profile: Dict[str, Any],
        history: List[Dict[str, Any]],
        user_speech: str,
        agent_persona: Optional[str] = None,
        call_goal: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate next conversational dialogue turn, handle objections, and extract customer queries."""
        business_name = lead_profile.get("business_name", "your business")
        contact_person = lead_profile.get("contact_person", "there")
        city = lead_profile.get("city", "Solan")
        user_text = user_speech.lower().strip()
        turn_count = len(history)

        extracted_queries = []
        interest_status = "interested_warm"

        # Detect extracted customer queries
        if any(term in user_text for term in ["cost", "price", "pricing", "how much", "charges", "fees"]):
            extracted_queries.append({
                "query": "What is the cost and pricing structure?",
                "category": "Pricing & Commercials",
                "answer_given": "Packages start at ₹14,999 one-time with zero recurring commissions.",
                "priority": "High"
            })
        if any(term in user_text for term in ["whatsapp", "order", "orders", "how does it work", "receive"]):
            extracted_queries.append({
                "query": "How are customer orders received on WhatsApp?",
                "category": "Features & Workflow",
                "answer_given": "Orders arrive as instant formatted text lists directly on the owner's WhatsApp.",
                "priority": "Medium"
            })
        if any(term in user_text for term in ["website", "online", "google", "maps"]):
            extracted_queries.append({
                "query": "How will Google Maps and online searchers find our store?",
                "category": "Google Maps & SEO",
                "answer_given": "We optimize the Google Business Profile to rank for local 'near me' search queries.",
                "priority": "Medium"
            })
        if any(term in user_text for term in ["time", "days", "how long", "delivery"]):
            extracted_queries.append({
                "query": "How much time does setup take?",
                "category": "Timeline",
                "answer_given": "Complete setup is delivered and live within 3-5 working days.",
                "priority": "Low"
            })

        # Compliance / Opt-out check
        if any(term in user_text for term in ["stop calling", "do not call", "dnc", "remove my number", "never call", "not interested"]):
            if "not interested" in user_text:
                return {
                    "agent_response": "I completely understand! Thank you for your time and have a wonderful day ahead.",
                    "action": "end_call",
                    "sentiment": "neutral",
                    "interest_status": "not_interested",
                    "extracted_queries": extracted_queries,
                    "stage": "closing"
                }
            return {
                "agent_response": "I completely understand. We have permanently removed your number from our contact list. Have a wonderful day.",
                "action": "opt_out",
                "sentiment": "negative",
                "interest_status": "opted_out",
                "extracted_queries": extracted_queries,
                "stage": "opt_out"
            }

        # Escalation
        if any(term in user_text for term in ["talk to human", "speak to human", "transfer", "manager"]):
            return {
                "agent_response": "Certainly! I am transferring you directly to our senior growth consultant. Please hold on.",
                "action": "escalate",
                "sentiment": "neutral",
                "interest_status": "interested_hot",
                "extracted_queries": extracted_queries,
                "stage": "escalation"
            }

        # Conversational dialogue progression
        if turn_count <= 1:
            # Introduction & Value Proposition
            return {
                "agent_response": (
                    f"Great to connect, {contact_person}! We help top-rated local businesses like {business_name} in {city} "
                    f"capture 20 to 30% more direct customer inquiries from mobile searchers with an instant 1-tap WhatsApp booking button. "
                    f"How are you currently handling inquiries from new customers?"
                ),
                "action": "continue",
                "sentiment": "positive",
                "interest_status": "interested_warm",
                "extracted_queries": extracted_queries,
                "stage": "discovery"
            }
        elif turn_count <= 3:
            # Need extraction & Query handling
            if "expensive" in user_text or "cost" in user_text or "price" in user_text:
                resp = (
                    f"Our complete setup starts at just ₹14,999 one-time with zero recurring commissions, and it usually pays for itself in just a few new orders. "
                    f"Would you be open to seeing a quick 1-page breakdown on WhatsApp?"
                )
            elif "busy" in user_text or "time" in user_text:
                resp = (
                    f"That makes total sense! That's exactly why our system is 100% hands-off—you don't need to manage any computers. "
                    f"Inquiries come straight to your mobile. Would you like to review a quick 1-minute summary on WhatsApp?"
                )
            else:
                resp = (
                    f"That's very clear. We specialize in helping local businesses in {city} capture high-margin orders without paying aggregator commissions. "
                    f"Would you be interested in having us send a tailored 1-page proposal on WhatsApp for {business_name}?"
                )
            return {
                "agent_response": resp,
                "action": "continue",
                "sentiment": "interested",
                "interest_status": "interested_hot" if ("yes" in user_text or "send" in user_text or "sure" in user_text) else "interested_warm",
                "extracted_queries": extracted_queries,
                "stage": "pitch"
            }
        else:
            # Closing turn
            return {
                "agent_response": (
                    f"Fantastic, {contact_person}! I've noted down all your requirements for {business_name}. "
                    f"Our specialist will send the customized proposal on WhatsApp and follow up with you. Thank you for your time and have a great day!"
                ),
                "action": "complete_call",
                "sentiment": "positive",
                "interest_status": "interested_hot",
                "extracted_queries": extracted_queries,
                "stage": "closing"
            }

    def simulate_autonomous_call(
        self,
        lead_profile: Dict[str, Any],
        agent_persona: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Simulate a complete, natural multi-turn qualification conversation."""
        business_name = lead_profile.get("business_name", "Sharma Auto Works")
        contact_person = lead_profile.get("contact_person", "Ramesh Sharma")
        city = lead_profile.get("city", "Solan")

        return [
            {
                "speaker": "agent",
                "text": f"Hello {contact_person}! This is Priya calling from Digital Growth Hub regarding {business_name} in {city}. Am I speaking with the owner?",
                "turn_index": 0,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": f"Yes, this is {contact_person}. What is this regarding?",
                "turn_index": 1,
                "sentiment": "neutral"
            },
            {
                "speaker": "agent",
                "text": f"Great to connect! We noticed {business_name} has strong local ratings in {city}, but when tourists and local customers search online, there is no direct instant booking or order link. How do you currently handle new customer inquiries?",
                "turn_index": 2,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": "Most customers are walk-ins or word of mouth. We don't have a website because I don't have time to manage computers. How much does your setup cost?",
                "turn_index": 3,
                "sentiment": "interested"
            },
            {
                "speaker": "agent",
                "text": "That makes total sense! Our setup is 100% hands-off—it automatically connects Google searchers to your mobile via WhatsApp with zero commissions, starting at just ₹14,999 one-time. May I send you the tailored 1-page proposal on WhatsApp?",
                "turn_index": 4,
                "sentiment": "positive"
            },
            {
                "speaker": "lead",
                "text": "Yes, please send it over to this WhatsApp number. I will take a look this evening.",
                "turn_index": 5,
                "sentiment": "positive"
            },
            {
                "speaker": "agent",
                "text": f"Perfect, {contact_person}! Sending the proposal to your number now. We will follow up tomorrow. Thank you and have a wonderful day!",
                "turn_index": 6,
                "sentiment": "positive"
            }
        ]
