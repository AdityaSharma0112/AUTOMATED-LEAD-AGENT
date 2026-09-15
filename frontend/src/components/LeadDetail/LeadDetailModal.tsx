import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Globe,
  MapPin,
  Clock,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Database,
  BrainCircuit,
  PhoneCall,
  Sparkles,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Lead } from '../../types/lead';
import { api } from '../../services/api';
import { exportCompleteLeadDossier, exportStrategyProposal } from '../../utils/exportLead';
import { CallCenterTab } from './CallCenterTab';
import { IntelligenceTab } from './IntelligenceTab';
import { StrategyTab } from './StrategyTab';

interface LeadDetailModalProps {
  leadId: string;
  onClose: () => void;
  onLeadUpdated: () => void;
  killSwitchActive: boolean;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  leadId,
  onClose,
  onLeadUpdated,
  killSwitchActive,
}) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'calls' | 'intelligence' | 'strategy'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isReverifying, setIsReverifying] = useState(false);

  const fetchLead = async () => {
    try {
      const data = await api.getLead(leadId);
      setLead(data);
    } catch (err: any) {
      alert(`Error loading lead: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const handleReverify = async () => {
    if (!lead) return;
    setIsReverifying(true);
    try {
      const updated = await api.reverifyLead(lead.id);
      setLead(updated);
      onLeadUpdated();
    } catch (err: any) {
      alert(`Failed to reverify: ${err.message}`);
    } finally {
      setIsReverifying(false);
    }
  };

  const handleToggleApproval = async () => {
    if (!lead) return;
    try {
      const res = await api.toggleCallingApproval(lead.id, !lead.calling_approved);
      setLead({ ...lead, calling_approved: res.calling_approved });
      onLeadUpdated();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="modal-overlay">
        <div className="glass-panel" style={{ padding: '40px', width: '500px', textAlign: 'center' }}>
          <div className="live-pulse" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
            Loading 360° Lead Profile...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{lead.business_name}</h2>
                <span className="badge badge-secondary" style={{ fontFamily: 'var(--font-mono)' }}>
                  {lead.lead_id}
                </span>
                <span className="badge badge-info">{lead.category}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color="var(--accent-primary)" /> {lead.locality ? `${lead.locality}, ${lead.city}` : lead.city}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} color="#34d399" /> {lead.phone || 'No phone'}
                </span>
                <span>•</span>
                <span>Score: <strong>{lead.lead_score}/100</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => exportStrategyProposal(lead, lead.strategy)}
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '6px 12px' }}
              title="Download Sales Strategy & Proposal Document"
            >
              <Download size={13} />
              <span>Download Strategy</span>
            </button>

            <button
              onClick={() => exportCompleteLeadDossier(lead)}
              className="btn btn-secondary"
              style={{ fontSize: '0.775rem', padding: '6px 12px' }}
              title="Download Complete Lead Intelligence & Call Dossier"
            >
              <Download size={13} />
              <span>Export Dossier</span>
            </button>

            <button
              onClick={handleToggleApproval}
              className={`btn ${lead.calling_approved ? 'btn-success' : 'btn-secondary'}`}
              style={{ fontSize: '0.775rem', padding: '6px 12px' }}
            >
              {lead.calling_approved ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              <span>{lead.calling_approved ? 'Approved for Calling' : 'Approve for Calling'}</span>
            </button>

            <button
              onClick={handleReverify}
              disabled={isReverifying}
              className="btn btn-secondary"
              style={{ padding: '6px 10px' }}
              title="Re-run verification agent"
            >
              <RefreshCw size={14} className={isReverifying ? 'live-pulse' : ''} />
            </button>

            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}>
          {[
            { id: 'overview', label: 'Overview & Facts', icon: <Building2 size={14} /> },
            { id: 'sources', label: `Evidence & Sources (${lead.sources?.length || 0})`, icon: <Database size={14} /> },
            { id: 'calls', label: `Voice Call Center (${lead.calls?.length || 0})`, icon: <PhoneCall size={14} /> },
            { id: 'intelligence', label: 'Conversation Intel', icon: <BrainCircuit size={14} /> },
            { id: 'strategy', label: 'Sales Strategy & Pitch', icon: <Sparkles size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Score Breakdown Card */}
              <div style={{
                padding: '16px',
                background: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: '#a5b4fc' }}>
                  OPPORTUNITY SCORE BREAKDOWN ({lead.lead_score}/100)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(lead.score_breakdown || {}).map(([key, val], idx) => (
                    <span key={idx} className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                      {key}: <strong>+{val} pts</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Grid Information */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {/* Location & Address */}
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
                    <MapPin size={15} color="var(--accent-primary)" />
                    <span>PHYSICAL ADDRESS</span>
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {lead.address || 'Address not listed'}
                  </p>
                  {lead.latitude && lead.longitude && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
                      GPS: {lead.latitude}, {lead.longitude}
                    </div>
                  )}
                </div>

                {/* Operating Hours */}
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
                    <Clock size={15} color="#fbbf24" />
                    <span>OPERATING HOURS</span>
                  </div>
                  {Object.keys(lead.hours || {}).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                      {Object.entries(lead.hours).map(([days, time], idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{days}:</span>
                          <span>{time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hours not published</span>
                  )}
                </div>
              </div>

              {/* Services Offered */}
              {lead.services && lead.services.length > 0 && (
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
                    <Wrench size={15} color="#34d399" />
                    <span>SERVICES & CAPABILITIES</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {lead.services.map((s, idx) => (
                      <span key={idx} className="badge badge-secondary" style={{ fontSize: '0.775rem' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SOURCES & EVIDENCE */}
          {activeTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '16px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                  Website Presence & Evidence Rating
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  Status: <strong>{lead.website_status.toUpperCase()}</strong> (Confidence: {Math.round(lead.website_confidence * 100)}%)
                </div>
              </div>

              {/* Sources List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  DISCOVERY SOURCES ({lead.sources?.length || 0})
                </h4>
                {lead.sources && lead.sources.length > 0 ? (
                  lead.sources.map((src, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{src.source_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Discovered: {new Date(src.discovered_at).toLocaleString()}
                        </div>
                      </div>
                      {src.source_url && (
                        <a
                          href={src.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <ExternalLink size={12} />
                          <span>View Source</span>
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No source records</span>
                )}
              </div>

              {/* Conflicts Log */}
              {lead.conflicts && lead.conflicts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                    SOURCE CONFLICTS & DISCREPANCIES ({lead.conflicts.length})
                  </h4>
                  {lead.conflicts.map((conf, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>
                        Conflict on field: {conf.field_name}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Source A ({conf.source_a}): {conf.value_a} vs. Source B ({conf.source_b}): {conf.value_b}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CALL CENTER */}
          {activeTab === 'calls' && (
            <CallCenterTab
              lead={lead}
              onLeadUpdated={fetchLead}
              killSwitchActive={killSwitchActive}
            />
          )}

          {/* TAB 4: INTELLIGENCE */}
          {activeTab === 'intelligence' && (
            <IntelligenceTab
              lead={lead}
              onLeadUpdated={fetchLead}
            />
          )}

          {/* TAB 5: STRATEGY */}
          {activeTab === 'strategy' && (
            <StrategyTab
              lead={lead}
              onLeadUpdated={fetchLead}
            />
          )}
        </div>
      </div>
    </div>
  );
};
