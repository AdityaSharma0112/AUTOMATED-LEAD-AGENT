import logging
import requests
from typing import Tuple

logger = logging.getLogger(__name__)


class HTTPWebsiteChecker:
    """
    100% REAL HTTP Website & Domain Checker.
    Sends live HTTP HEAD/GET requests with timeouts to verify if a website domain is active.
    """

    @staticmethod
    def verify_url(url: str, timeout_seconds: int = 5) -> Tuple[str, str, float]:
        """
        Verify real website accessibility.
        Returns: (website_status, cleaned_url, confidence)
        """
        if not url:
            return "likely_absent", "", 0.85

        clean_url = url.strip()
        if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
            clean_url = f"https://{clean_url}"

        # Ignore social pages as official website
        if any(social in clean_url.lower() for social in ["facebook.com", "instagram.com", "justdial.com", "indiamart.com", "sulekha.com"]):
            return "likely_absent", "", 0.80

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityWebsiteChecker/1.0"
        }

        try:
            # Try fast HEAD request first
            res = requests.head(clean_url, headers=headers, timeout=timeout_seconds, allow_redirects=True)
            if res.status_code < 400:
                return "verified_present", clean_url, 0.98
            elif res.status_code in [404, 410, 500, 502, 503]:
                return "inaccessible", clean_url, 0.90
        except requests.exceptions.RequestException:
            # Try GET fallback with shorter timeout
            try:
                res = requests.get(clean_url, headers=headers, timeout=timeout_seconds, allow_redirects=True)
                if res.status_code < 400:
                    return "verified_present", clean_url, 0.95
            except Exception:
                return "inaccessible", clean_url, 0.85

        return "unknown", clean_url, 0.50
