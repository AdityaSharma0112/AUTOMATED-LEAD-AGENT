
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from agents.workflow_orchestrator import WorkflowOrchestrator
from leads.models import SearchJob, Lead

orchestrator = WorkflowOrchestrator()
prompt = "Find grocery stores in Ghurkari Himachal Pradesh"
print(f"Executing workflow for prompt: '{prompt}'")

job = orchestrator.run_search_pipeline(prompt)
print(f"Pipeline finished! Job ID: {job.id}, Status: {job.status}, Leads found count: {job.leads_found_count}")

leads = Lead.objects.filter(search_job=job)
print(f"Saved {leads.count()} leads to database for this job:")
for idx, lead in enumerate(leads[:10], 1):
    sources = lead.sources.all()
    source_names = [s.source_name for s in sources]
    print(f"  {idx}. {lead.business_name} | Phone: {lead.phone} | Addr: {lead.address} | Score: {lead.lead_score} | Sources: {source_names}")
