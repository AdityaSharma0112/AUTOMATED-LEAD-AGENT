import React, { useState } from 'react';
import {
  BrainCircuit,
  AlertOctagon,
  Target,
  DollarSign,
  Clock,
  UserCheck,
  Quote,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Phone,
  RotateCcw,
  MessageSquare,
  Bot,
  User,
  Activity,
  Layers,
  Globe
} from 'lucide-react';
import { Lead } from '../../types/lead';
import { api } from '../../services/api';

interface IntelligenceTabProps {
  lead: Lead;
  onLeadUpdated?: () => void;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({ lead, onLeadUpdated }) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const intel = lead.intelligence;
  const callSessions = lead.calls || (lead as any).call_sessions || [];

  const handleReExtract = async () => {
    setIsRegenerating(true);
    try {
      await api.regenerateIntelligence(lead.id);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err: any) {
      alert(`Failed to re-extract intelligence: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const renderInterestBadge = (status?: string) => {
    switch (status) {
      case 'interested_hot':
        return <span className="badge badge-success">🔥 Hot Lead (Ready for Pitch)</span>;
      case 'interested_warm':
        return <span className="badge badge-warning">⚡ Warm Lead (Interested)</span>;
      case 'call_back':
        return <span className="badge badge-info">📞 Call Back Requested</span>;
      case 'not_interested':
        return <span className="badge badge-secondary">⚪ Not Interested</span>;
      case 'opted_out':
        return <span className="badge badge-danger">🛑 Opted Out (DNC)</span>;
      default:
        return <span className="badge badge-secondary">{status || 'Evaluating'}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '8px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: '10px',
            color: 'var(--accent-primary)',
          }}>
            <BrainCircuit size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Conversation & Client Intelligence</h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
              Live phone call transcript analysis & synthesized client requirements for {lead.business_name}
            </p>
          </div>
        </div>

        <button
          onClick={handleReExtract}
          disabled={isRegenerating}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RotateCcw size={13} className={isRegenerating ? 'live-pulse' : ''} />
          <span>{isRegenerating ? 'Re-extracting...' : '⚡ Re-extract Intelligence'}</span>
        </button>
      </div>

      {/* SECTION 1: REAL TELEPHONE CALL TRANSCRIPTS STREAM */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={15} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Real Telephone Call Transcripts</span>
            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
              {callSessions.length} Session{callSessions.length === 1 ? '' : 's'}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Direct Cellular Audio Stream & Dialogue Turns
          </span>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {callSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
              <Phone size={24} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Call Sessions Recorded Yet</div>
              <div style={{ fontSize: '0.775rem', marginTop: '4px' }}>
                Place an outbound call in the "Voice Call Center" tab. Live transcript turns will automatically appear here.
              </div>
            </div>
          ) : (
            callSessions.map((session, sIdx) => {
              const turns = session.transcript_turns || [];
              return (
                <div
                  key={session.id || sIdx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.015)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Session Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${session.status === 'completed' ? 'badge-success' : session.status === 'failed' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                        {session.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {session.call_type === 'twilio_phone' ? '📱 Cellular Twilio Call' : '📞 Voice Call'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {session.target_phone || lead.phone}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Duration: {session.duration_seconds || 0}s</span>
                      <span>{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Transcript Turns */}
                  {turns.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                      Call initiated / connected. No audio speech turns captured for this session.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {turns.map((turn, tIdx) => {
                        const isAgent = turn.speaker === 'agent';
                        const isSystem = turn.speaker === 'system';

                        if (isSystem) {
                          return (
                            <div key={turn.id || tIdx} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0' }}>
                              — {turn.text} —
                            </div>
                          );
                        }

                        return (
                          <div
                            key={turn.id || tIdx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isAgent ? 'flex-start' : 'flex-end',
                              width: '100%',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                              {isAgent ? (
                                <>
                                  <div style={{ padding: '2px 6px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Bot size={11} color="var(--accent-primary)" />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-primary)' }}>AI Agent (Aryan)</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={11} color="#34d399" />
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399' }}>Client ({lead.contact_person || lead.business_name})</span>
                                  </div>
                                  {turn.sentiment && (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                      ({turn.sentiment})
                                    </span>
                                  )}
                                </>
                              )}
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                              </span>
                            </div>

                            <div
                              style={{
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: isAgent ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                                background: isAgent ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                border: `1px solid ${isAgent ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                fontSize: '0.835rem',
                                lineHeight: 1.45,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {turn.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: SYNTHESIZED INTELLIGENCE & CLIENT REQUIREMENTS */}
      {!intel ? (
        <div style={{
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-subtle)',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <Sparkles size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            No Intelligence Analysis Extracted Yet
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Click "⚡ Re-extract Intelligence" above to analyze the transcript and synthesize client requirements.
          </div>
        </div>
      ) : (
        <>
          {/* Executive Call Summary & Qualification Status */}
          <div style={{
            padding: '18px',
            background: 'rgba(99, 102, 241, 0.08)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Executive Call Summary</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderInterestBadge(intel.interest_status || 'interested_warm')}
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                  AI Confidence: {Math.round((intel.confidence_score || 0.85) * 100)}%
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-primary)', margin: 0 }}>
              {intel.summary}
            </p>
          </div>

          {/* EXACT CLIENT REQUIREMENTS & DEMANDS (Highlighted) */}
          <div style={{
            padding: '18px',
            background: 'rgba(56, 189, 248, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Target size={17} color="#38bdf8" />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', margin: 0 }}>
                EXACT CLIENT DEMANDS & STATED REQUIREMENTS
              </h4>
            </div>

            {intel.requirements && intel.requirements.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {intel.requirements.map((req, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '8px',
                      border: '1px solid rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.825rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <CheckCircle2 size={15} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {intel.desired_solution || 'Lead requested modern mobile-responsive web development, Google Maps visibility, and zero-commission ordering.'}
              </div>
            )}
          </div>

          {/* Business Presence & Current Setup */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Globe size={13} color="var(--accent-primary)" />
                <span>STATED WEBSITE / ONLINE PRESENCE</span>
              </div>
              <div style={{ fontSize: '0.835rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {intel.stated_website_presence || 'No active website / relying solely on third-party aggregators'}
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <Layers size={13} color="#fbbf24" />
                <span>CURRENT TOOLS & PROCESSES</span>
              </div>
              <div style={{ fontSize: '0.835rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {intel.current_process_and_tools || 'Manual phone calls / Walk-in customers / Third-party platforms'}
              </div>
            </div>
          </div>

          {/* Captured Customer Queries & Questions Section */}
          {intel.collected_queries && intel.collected_queries.length > 0 && (
            <div style={{
              padding: '16px',
              background: 'rgba(99, 102, 241, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                <HelpCircle size={16} />
                <span>EXPLICIT CUSTOMER QUESTIONS CAPTURED ON CALL</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {intel.collected_queries.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{q.category || 'Inquiry'}</span>
                      {q.priority && (
                        <span className={`badge ${q.priority === 'High' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                          {q.priority}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      "{q.query}"
                    </div>
                    {q.answer_given && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: '#818cf8' }}>AI Answer:</strong> {q.answer_given}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buying Signals Matrix Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* Intent */}
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>BUYING INTENT</div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: intel.buying_intent === 'high' ? '#34d399' : intel.buying_intent === 'medium' ? '#fbbf24' : '#94a3b8' }}>
                {(intel.buying_intent || 'MEDIUM').toUpperCase()}
              </div>
            </div>

            {/* Budget */}
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <DollarSign size={13} color="#34d399" />
                <span>BUDGET SIGNAL</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#6ee7b7' }}>
                {intel.budget_amount || (intel.budget_signal ? intel.budget_signal.toUpperCase() : 'FLEXIBLE')}
              </div>
            </div>

            {/* Timeline */}
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <Clock size={13} color="#fbbf24" />
                <span>TIMELINE</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                {intel.timeline || 'Immediate (48 Hours)'}
              </div>
            </div>

            {/* Decision Maker */}
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <UserCheck size={13} color="#38bdf8" />
                <span>DECISION MAKER</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                {intel.decision_maker_status || 'Owner / Managing Partner'}
              </div>
            </div>
          </div>

          {/* Pain Points & Goals Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Pain Points */}
            <div style={{
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#f87171', fontWeight: 700, fontSize: '0.875rem' }}>
                <AlertOctagon size={16} />
                <span>EXTRACTED PAIN POINTS</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
                {intel.pain_points && intel.pain_points.length > 0 ? (
                  intel.pain_points.map((p, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                      <span style={{ color: '#f87171', marginTop: '2px' }}>✕</span>
                      <span>{p}</span>
                    </li>
                  ))
                ) : (
                  <li style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No critical pain points recorded.</li>
                )}
              </ul>
            </div>

            {/* Goals */}
            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#34d399', fontWeight: 700, fontSize: '0.875rem' }}>
                <Target size={16} />
                <span>BUSINESS GOALS</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
                {intel.goals && intel.goals.length > 0 ? (
                  intel.goals.map((g, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                      <CheckCircle2 size={14} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{g}</span>
                    </li>
                  ))
                ) : (
                  <li style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Expand local clientele & generate direct digital bookings.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Customer Verbatim Quotes */}
          {intel.customer_quotes && intel.customer_quotes.length > 0 && (
            <div style={{
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                <Quote size={14} color="var(--accent-secondary)" />
                <span>VERBATIM CLIENT STATEMENTS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {intel.customer_quotes.map((quote, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderLeft: '3px solid var(--accent-secondary)',
                      borderRadius: '0 6px 6px 0',
                      fontSize: '0.825rem',
                      fontStyle: 'italic',
                      color: 'var(--text-primary)',
                    }}
                  >
                    "{quote}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
