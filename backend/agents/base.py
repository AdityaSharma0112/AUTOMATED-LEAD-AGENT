import logging
from typing import Dict, Any, Optional
from django.utils import timezone
from leads.models import AuditEvent, Lead, SearchJob

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base Agent providing standard audit logging and error handling."""

    def __init__(self, name: str):
        self.name = name

    def log_event(
        self,
        event_type: str,
        description: str,
        lead: Optional[Lead] = None,
        search_job: Optional[SearchJob] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> Optional[AuditEvent]:
        """Create an immutable, auditable log event in the database."""
        logger.info(f"[{self.name}] {event_type}: {description}")
        try:
            target_lead = lead if (lead and lead.pk and Lead.objects.filter(pk=lead.pk).exists()) else None
            target_job = search_job if (search_job and search_job.pk and SearchJob.objects.filter(pk=search_job.pk).exists()) else None
            return AuditEvent.objects.create(
                lead=target_lead,
                search_job=target_job,
                agent_name=self.name,
                event_type=event_type,
                description=description,
                payload=payload or {}
            )
        except Exception as e:
            logger.warning(f"Audit log persistence skipped ({event_type}): {str(e)}")
            return None
