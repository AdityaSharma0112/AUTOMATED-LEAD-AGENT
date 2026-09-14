import React, { useState, useEffect } from 'react';
import { X, Activity, RefreshCw, Bot, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AuditEvent } from '../../types/lead';
import { api } from '../../services/api';

interface AuditStreamProps {
  onClose: () => void;
}

export const AuditStream: React.FC<AuditStreamProps> = ({ onClose }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditEvents();
      setEvents(data);
    } catch (err: any) {
      alert(`Error fetching audit events: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  const getAgentBadgeColor = (agent: string) => {
    switch (agent) {
      case 'IntentParserAgent': return 'badge-info';
      case 'ResearchAgent': return 'badge-warning';
      case 'VerificationAgent': return 'badge-success';
      case 'CallingAgent': return 'badge-danger';
      case 'IntelligenceAgent': return 'badge-info';
      case 'StrategyAgent': return 'badge-success';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '750px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--accent-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Immutable Multi-Agent Audit Log</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Provable trail of all research, deduplication, compliance gates, and voice events
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={fetchAuditEvents} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
              <RefreshCw size={14} className={isLoading ? 'live-pulse' : ''} />
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Event List */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              {isLoading ? 'Loading audit trail...' : 'No audit events recorded yet.'}
            </div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${getAgentBadgeColor(ev.agent_name)}`} style={{ fontSize: '0.7rem' }}>
                      {ev.agent_name}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.825rem', fontFamily: 'var(--font-mono)' }}>
                      {ev.event_type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(ev.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {ev.description}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
