import { Lead, SearchJob, CallSession, Strategy, AuditEvent, SystemSettings } from '../types/lead';

const API_BASE = '/api';

export const api = {
  // Search & Intent
  async search(params: string | { query?: string; city?: string; category?: string; radius_km?: number; website_filter?: string; lat?: number; lon?: number; locality?: string }): Promise<SearchJob> {
    const payload = typeof params === 'string' ? { query: params } : params;
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute search');
    }
    return res.json();
  },

  // Google Maps / Places Autocomplete & Related Localities
  async getPlaceSuggestions(query: string): Promise<{
    suggestions: Array<{
      display_name: string;
      main_text: string;
      secondary_text: string;
      place_type?: string;
      type_label?: string;
      lat: number;
      lon: number;
      city: string;
      state: string;
      country: string;
    }>;
    related_places: Array<{
      name: string;
      type: string;
      city: string;
      lat?: number;
      lon?: number;
    }>;
  }> {
    if (!query || query.trim().length < 2) return { suggestions: [], related_places: [] };
    try {
      const res = await fetch(`${API_BASE}/places/autocomplete?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) return { suggestions: [], related_places: [] };
      const data = await res.json();
      if (Array.isArray(data)) {
        return { suggestions: data, related_places: [] };
      }
      return {
        suggestions: data.suggestions || [],
        related_places: data.related_places || [],
      };
    } catch {
      return { suggestions: [], related_places: [] };
    }
  },

  async getRecentSearches(): Promise<SearchJob[]> {
    const res = await fetch(`${API_BASE}/search`);
    if (!res.ok) throw new Error('Failed to fetch search history');
    return res.json();
  },

  async getSearchJob(id: string): Promise<SearchJob> {
    const res = await fetch(`${API_BASE}/search/${id}`);
    if (!res.ok) throw new Error('Failed to fetch search job');
    return res.json();
  },

  // Leads
  async getLeads(filters: {
    category?: string;
    city?: string;
    website_status?: string;
    min_score?: number;
    approved_only?: boolean;
    q?: string;
  } = {}): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.city) params.set('city', filters.city);
    if (filters.website_status) params.set('website_status', filters.website_status);
    if (filters.min_score) params.set('min_score', filters.min_score.toString());
    if (filters.approved_only) params.set('approved_only', 'true');
    if (filters.q) params.set('q', filters.q);

    const res = await fetch(`${API_BASE}/leads?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async getLead(id: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${id}`);
    if (!res.ok) throw new Error('Failed to fetch lead profile');
    return res.json();
  },

  async clearAllLeads(): Promise<any> {
    const res = await fetch(`${API_BASE}/leads/clear`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to clear leads');
    return res.json();
  },

  async toggleCallingApproval(id: string, approved?: boolean): Promise<{ calling_approved: boolean }> {
    const res = await fetch(`${API_BASE}/leads/${id}/approve_call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    if (!res.ok) throw new Error('Failed to update calling approval');
    return res.json();
  },

  async reverifyLead(id: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${id}/verify`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reverify lead');
    return res.json();
  },

  // Voice & Call Center
  async initiateCall(
    leadId: string,
    options: {
      call_type?: 'twilio_phone' | 'web_voice' | 'simulation';
      phone?: string;
      webhook_base_url?: string;
    } = {}
  ): Promise<CallSession> {
    const res = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        call_type: options.call_type || 'twilio_phone',
        phone: options.phone,
        webhook_base_url: options.webhook_base_url,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to initiate call');
    }
    return res.json();
  },

  async quickCall(params: {
    phone: string;
    business_name: string;
    category?: string;
    contact_person?: string;
    city?: string;
    notes?: string;
    call_type?: 'twilio_phone' | 'web_voice' | 'simulation';
    webhook_base_url?: string;
  }): Promise<CallSession> {
    const res = await fetch(`${API_BASE}/calls/quick-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        call_type: params.call_type || 'twilio_phone',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to place quick call');
    }
    return res.json();
  },

  async sendCallTurn(callId: string, speech: string): Promise<any> {
    const res = await fetch(`${API_BASE}/calls/${callId}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speech }),
    });
    if (!res.ok) throw new Error('Failed to send speech turn');
    return res.json();
  },

  async endCall(callId: string): Promise<CallSession> {
    const res = await fetch(`${API_BASE}/calls/${callId}/end`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to end call');
    return res.json();
  },

  // Intelligence
  async regenerateIntelligence(leadId: string): Promise<ConversationIntelligence> {
    const res = await fetch(`${API_BASE}/leads/${leadId}/intelligence/regenerate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to re-extract intelligence');
    return res.json();
  },

  // Strategy
  async getStrategy(leadId: string): Promise<Strategy> {
    const res = await fetch(`${API_BASE}/leads/${leadId}/strategy`);
    if (!res.ok) throw new Error('Failed to fetch strategy');
    return res.json();
  },

  async regenerateStrategy(leadId: string): Promise<Strategy> {
    const res = await fetch(`${API_BASE}/leads/${leadId}/strategy/regenerate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to regenerate strategy');
    return res.json();
  },

  async updateStrategy(leadId: string, strategyData: Partial<Strategy>): Promise<Strategy> {
    const res = await fetch(`${API_BASE}/leads/${leadId}/strategy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategyData),
    });
    if (!res.ok) throw new Error('Failed to update strategy');
    return res.json();
  },

  async refineStrategy(leadId: string, instruction: string): Promise<Strategy> {
    const res = await fetch(`${API_BASE}/leads/${leadId}/strategy/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to refine strategy with AI');
    }
    return res.json();
  },

  // Audit Events
  async getAuditEvents(): Promise<AuditEvent[]> {
    const res = await fetch(`${API_BASE}/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit events');
    return res.json();
  },

  // Settings & Compliance
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSetting(key: string, value: any): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Failed to update setting');
    return res.json();
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/leads/export/csv`;
  }
};
