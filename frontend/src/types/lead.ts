export interface DiscoverySource {
  id: string;
  source_name: string;
  source_url: string;
  raw_data: any;
  confidence: number;
  discovered_at: string;
}

export interface ConflictLog {
  id: string;
  field_name: string;
  source_a: string;
  value_a: string;
  source_b: string;
  value_b: string;
  resolution_notes: string;
  created_at: string;
}

export interface CallTranscriptTurn {
  id: string;
  speaker: 'agent' | 'lead' | 'system';
  text: string;
  turn_index: number;
  timestamp: string;
  sentiment: string;
}

export interface CollectedQuery {
  query: string;
  category: string;
  answer_given?: string;
  priority?: 'High' | 'Medium' | 'Low';
  turn_index?: number;
}

export interface CallSession {
  id: string;
  lead: string;
  status: 'pending' | 'calling' | 'connected' | 'completed' | 'failed' | 'opted_out' | 'escalated';
  call_type: 'web_voice' | 'twilio_phone' | 'simulation';
  target_phone?: string;
  custom_business_name?: string;
  telephony_provider: string;
  consent_given: boolean;
  duration_seconds: number;
  audio_url: string;
  call_script_version: string;
  collected_queries?: CollectedQuery[];
  error_reason?: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  transcript_turns?: CallTranscriptTurn[];
}

export interface ConversationIntelligence {
  id: string;
  summary: string;
  interest_status: 'interested_hot' | 'interested_warm' | 'call_back' | 'not_interested' | 'opted_out';
  collected_queries: CollectedQuery[];
  action_items: string[];
  next_sales_pitch_hook: string;
  pain_points: string[];
  goals: string[];
  requirements: string[];
  current_process_and_tools: string;
  stated_website_presence: string;
  desired_solution: string;
  budget_signal: 'unknown' | 'low' | 'medium' | 'high' | 'explicit_amount';
  budget_amount: string;
  timeline: string;
  decision_maker_status: string;
  objections: { objection: string; rebuttal: string }[];
  buying_intent: 'low' | 'medium' | 'high';
  customer_quotes: string[];
  confidence_score: number;
}

export interface SolutionItem {
  priority: number;
  title: string;
  impact: string;
  description: string;
}

export interface OfferPackage {
  tier: string;
  price: string;
  features: string[];
}

export interface ObjectionResponse {
  objection: string;
  response: string;
}

export interface Strategy {
  id: string;
  problem_statement: string;
  evidence_online: string;
  evidence_call: string;
  opportunity: string;
  recommended_solutions: SolutionItem[];
  fit_rationale: string;
  offer_packages: OfferPackage[];
  pricing_guidance: string;
  pitch_script: string;
  objections_and_responses: ObjectionResponse[];
  lead_score: number;
  score_reasoning: string;
  next_action: string;
  follow_up_date: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  agent_name: string;
  event_type: string;
  description: string;
  payload: any;
  created_at: string;
  lead?: string | null;
}

export interface Lead {
  id: string;
  lead_id: string;
  business_name: string;
  category: string;
  phone: string;
  normalized_phone: string;
  email: string;
  contact_person: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  website_status: 'verified_present' | 'likely_present' | 'likely_absent' | 'unknown' | 'inaccessible';
  website_url: string;
  website_confidence: number;
  google_profile_present: boolean;
  social_profiles: string[];
  rating: number | null;
  review_count: number;
  review_summary: string;
  services: string[];
  hours: Record<string, string>;
  description: string;
  field_confidence: Record<string, number>;
  lead_score: number;
  score_breakdown: Record<string, any>;
  calling_approved: boolean;
  opted_out: boolean;
  sources_count?: number;
  conflicts_count?: number;
  has_strategy?: boolean;
  has_intelligence?: boolean;
  created_at: string;
  updated_at: string;

  // Detail fields
  sources?: DiscoverySource[];
  conflicts?: ConflictLog[];
  calls?: CallSession[];
  intelligence?: ConversationIntelligence | null;
  strategy?: Strategy | null;
  audit_events?: AuditEvent[];
}

export interface SearchJob {
  id: string;
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parsed_intent: {
    category?: string;
    location?: string;
    radius_km?: number;
    website_filter?: string;
    target_attributes?: string[];
  };
  leads_found_count: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  leads?: Lead[];
}

export interface SystemSettings {
  kill_switch: { active: boolean; reason?: string };
  llm_provider: { provider: string; model?: string; [key: string]: any };
  telephony_provider: {
    provider: string;
    twilio_account_sid?: string;
    twilio_auth_token?: string;
    twilio_from_number?: string;
    public_webhook_url?: string;
    [key: string]: any;
  };
  all_settings: Record<string, any>;
}
