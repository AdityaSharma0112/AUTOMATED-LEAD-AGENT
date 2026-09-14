import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from agents.calling_agent import CallingAgent
from leads.models import Lead

def test_ai_calling_agent():
    print("=" * 60)
    print("Testing AI Calling Agent with Real Dialogue & Query Collection")
    print("=" * 60)

    agent = CallingAgent()

    # 1. Initiate Quick Call to a Custom Business / Number
    print("\n1. Placing AI Call to Custom Business...")
    session = agent.call_custom_number(
        phone_number="+919876543210",
        business_name="Solan Sweets & Bakers",
        category="Bakery & Sweets",
        contact_person="Ramesh Verma",
        city="Solan",
        notes="Interested in getting more tourist orders on Mall Road",
        call_type="web_voice"
    )

    lead = session.lead
    print(f"   [OK] Call session created: {session.id}")
    print(f"   [OK] Target Lead: {lead.business_name} ({lead.city}) - Phone: {session.target_phone}")

    # Opening turn
    opening = session.transcript_turns.first()
    print(f"\n   [AI Voice Agent]: \"{opening.text}\"")

    # 2. Simulate User Speech Turn 1 (Need extraction & Pricing Query)
    print("\n2. Lead speaks: 'Yes, this is Ramesh. We miss out on tourists because we don't have a website. How much does your setup cost?'")
    turn1 = agent.process_turn(
        session,
        "Yes, this is Ramesh. We miss out on tourists because we don't have a website. How much does your setup cost?"
    )

    print(f"   [AI Voice Agent]: \"{turn1['agent_response']}\"")
    print(f"   -> Status: {turn1['interest_status']}")
    print(f"   -> Queries Captured: {len(turn1['extracted_queries'])}")
    for q in turn1['extracted_queries']:
        print(f"      - [{q.get('category')}]: {q.get('query')}")

    # 3. Simulate User Speech Turn 2 (Timeline & WhatsApp inquiry)
    print("\n3. Lead speaks: 'Can you send details on WhatsApp? How many days will setup take?'")
    turn2 = agent.process_turn(
        session,
        "Can you send details on WhatsApp? How many days will setup take?"
    )

    print(f"   [AI Voice Agent]: \"{turn2['agent_response']}\"")
    print(f"   -> Status: {turn2['interest_status']}")
    print(f"   -> Queries Captured: {len(turn2['extracted_queries'])}")
    for q in turn2['extracted_queries']:
        print(f"      - [{q.get('category')}]: {q.get('query')}")

    # 4. Refresh lead and inspect conversation intelligence & sales pitch
    lead.refresh_from_db()
    intel = getattr(lead, 'intelligence', None)

    print("\n" + "=" * 60)
    print("4. Extracted Conversation Intelligence & Lead Qualification:")
    print("=" * 60)
    if intel:
        print(f"   [OK] Interest Status: {intel.interest_status.upper()}")
        print(f"   [OK] Buying Intent: {intel.buying_intent.upper()}")
        print(f"   [OK] Executive Summary: {intel.summary}")
        print(f"   [OK] Total Collected Queries: {len(intel.collected_queries)}")
        print(f"   [OK] Next Closing Pitch:\n     \"{intel.next_sales_pitch_hook}\"")
    else:
        print("   Intelligence extraction pending completion.")

    print("\nAI Calling Agent Test Completed Successfully!")

if __name__ == "__main__":
    test_ai_calling_agent()
