from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional


class ResearchProviderBase(ABC):
    """Abstract base class for all business data & search research providers."""

    @abstractmethod
    def search_businesses(
        self,
        category: str,
        location: str,
        radius_km: float = 30.0,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search and return raw business records with source attribution."""
        pass


class LLMProviderBase(ABC):
    """Abstract base class for LLM inference providers."""

    @abstractmethod
    def parse_intent(self, query: str) -> Dict[str, Any]:
        """Parse natural language query into structured search criteria."""
        pass

    @abstractmethod
    def extract_conversation_intelligence(
        self,
        lead_profile: Dict[str, Any],
        transcript_turns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract structured customer needs and buying signals from call transcript."""
        pass

    @abstractmethod
    def generate_strategy(
        self,
        lead_profile: Dict[str, Any],
        intelligence: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate a tailored solution-first strategy and personalized pitch."""
        pass

    @abstractmethod
    def refine_strategy_with_ai(
        self,
        lead_profile: Dict[str, Any],
        intelligence: Dict[str, Any],
        current_strategy: Dict[str, Any],
        user_instruction: str
    ) -> Dict[str, Any]:
        """Refine and customize the sales strategy & next step plan based on user instructions and Gemini AI."""
        pass

    @abstractmethod
    def generate_call_turn(
        self,
        lead_profile: Dict[str, Any],
        history: List[Dict[str, Any]],
        user_speech: str,
        agent_persona: Optional[str] = None,
        call_goal: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate next conversational dialogue turn, handle objections, and extract customer queries."""
        pass

    @abstractmethod
    def simulate_autonomous_call(
        self,
        lead_profile: Dict[str, Any],
        agent_persona: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Simulate a complete, natural multi-turn qualification conversation."""
        pass


class TelephonyProviderBase(ABC):
    """Abstract base class for outbound calling and voice interactions."""

    @abstractmethod
    def initiate_call(
        self,
        phone_number: str,
        lead_context: Dict[str, Any],
        script_version: str = "v1.0-qualification"
    ) -> Dict[str, Any]:
        """Initiate outbound voice call."""
        pass

    @abstractmethod
    def process_turn(
        self,
        call_id: str,
        user_speech: str,
        lead_context: Dict[str, Any],
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process real-time speech turn and return agent voice response."""
        pass
