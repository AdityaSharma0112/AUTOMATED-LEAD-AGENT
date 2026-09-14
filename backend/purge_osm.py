import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from leads.models import Lead, LeadSource

osm_leads = Lead.objects.filter(sources__source_name__icontains='OpenStreetMap')
count = osm_leads.count()
osm_leads.delete()
print(f"Purged {count} legacy OpenStreetMap leads.")
print(f"Remaining active leads in DB: {Lead.objects.count()}")
