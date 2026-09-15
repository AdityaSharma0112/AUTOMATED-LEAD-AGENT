import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Volume2,
  Loader2,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  Phone,
  Download,
  Copy,
  Check,
  Calendar,
  Clock,
  History,
  AlertOctagon,
  FileText,
  UserCheck
} from 'lucide-react';
import { Lead, CallSession, CollectedQuery } from '../../types/lead';
import { api } from '../../services/api';
import { exportCallRecord, exportStrategyProposal } from '../../utils/exportLead';

interface CallCenterTabProps {
  lead: Lead;
  onLeadUpdated: () => void;
  killSwitchActive: boolean;
}

export const CallCenterTab: React.FC<CallCenterTabProps> = ({ lead, onLeadUpdated, killSwitchActive }) => {
  const [selectedCallIndex, setSelectedCallIndex] = useState<number>(0);
  const [activeCall, setActiveCall] = useState<CallSession | null>(
    lead.calls && lead.calls.length > 0 ? lead.calls[0] : null
  );
  const [targetPhone, setTargetPhone] = useState(lead.phone || lead.normalized_phone || '');
  const [isCalling, setIsCalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(lead.strategy?.follow_up_date || lead.follow_up_date || '');

  const totalCalls = lead.calls ? lead.calls.length : (lead.calls_count || 0);

  // Sync active call when lead or selectedCallIndex changes
  useEffect(() => {
    if (lead.calls && lead.calls.length > 0) {
      const idx = Math.min(selectedCallIndex, lead.calls.length - 1);
      setActiveCall(lead.calls[idx]);
    } else {
      setActiveCall(null);
    }
    if (lead.strategy?.follow_up_date || lead.follow_up_date) {
      setFollowUpDate(lead.strategy?.follow_up_date || lead.follow_up_date || '');
    }
  }, [lead, selectedCallIndex]);

  const handleStartCall = async () => {
    if (!lead.calling_approved) {
      alert('Please approve calling for this lead first via the Human Approval Gate.');
      return;
    }
    if (killSwitchActive) {
      alert('Global Emergency Kill Switch is ACTIVE. Outbound calling is prohibited.');
      return;
    }
    if (lead.opted_out) {
      alert('This lead has opted out / requested Do Not Call (DNC). Outbound calls are prohibited.');
      return;
    }
    if (!targetPhone.trim()) {
      alert('Please provide a valid phone number to dial.');
      return;
    }

    setIsCalling(true);
    setStatusMessage(`Dialing phone number ${targetPhone.trim()} via Twilio Voice...`);

    try {
      const call = await api.initiateCall(lead.id, {
        call_type: 'twilio_phone',
        phone: targetPhone.trim(),
      });
      setActiveCall(call);
      setSelectedCallIndex(0);
      setStatusMessage(`Real call placed to ${targetPhone}! Answer your phone to speak with Priya.`);
      onLeadUpdated();
    } catch (err: any) {
      setStatusMessage(`Call error: ${err.message}`);
    } finally {
      setIsCalling(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      const finished = await api.endCall(activeCall.id);
      setActiveCall(finished);
      onLeadUpdated();
      setStatusMessage('Call concluded. Lead marked and next sales pitch prepared.');
    } catch (err: any) {
      alert(`Failed to end call: ${err.message}`);
    }
  };

  const handleCopyTranscript = () => {
    if (!activeCall || !activeCall.transcript_turns || activeCall.transcript_turns.length === 0) {
      alert('No transcript available to copy.');
      return;
    }
    const text = activeCall.transcript_turns
      .map((t) => `${t.speaker === 'agent' ? 'Priya (Digital Growth Hub)' : lead.business_name}: "${t.text}"`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleDownloadTranscript = () => {
    if (!activeCall) {
      alert('No active or selected call record to export.');
      return;
    }
    const callNum = totalCalls > 0 ? totalCalls - selectedCallIndex : 1;
    exportCallRecord(lead, activeCall, callNum);
  };

  const handleDownloadProposal = () => {
    exportStrategyProposal(lead, lead.strategy);
  };

  const handleSaveFollowUp = async () => {
    if (!followUpDate) return;
    setIsScheduling(true);
    try {
      await api.updateStrategy(lead.id, {
        follow_up_date: followUpDate,
        next_action: lead.strategy?.next_action || `Scheduled follow-up call on ${followUpDate}`
      });
      onLeadUpdated();
      setStatusMessage(`Follow-up scheduled for ${followUpDate}`);
    } catch (err: any) {
      alert(`Failed to save follow-up date: ${err.message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  // WhatsApp Pitch Message
  const whatsappPhone = (targetPhone || lead.normalized_phone || lead.phone || '').replace(/[^\d]/g, '');
  const pitchText =
    lead.intelligence?.next_sales_pitch_hook ||
    lead.strategy?.pitch_script ||
    `Hello ${lead.contact_person || 'there'}, Priya here from Digital Growth Hub reaching out regarding ${lead.business_name}.`;
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(pitchText)}`;

  // Queries list
  const collectedQueries: CollectedQuery[] =
    activeCall?.collected_queries || lead.intelligence?.collected_queries || [];

  const currentInterest = activeCall?.interest_level || lead.intelligence?.interest_status || lead.interest_status;

  const renderInterestBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'interested_hot':
      case 'hot':
        return (
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🟢 HOT LEAD — HIGH CONVERSION INTEREST
          </span>
        );
      case 'interested_warm':
      case 'warm':
        return (
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🟡 WARM LEAD (EXPLORING PROPOSAL)
          </span>
        );
      case 'call_back':
        return (
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🔵 FOLLOW-UP / CALL BACK REQUESTED
          </span>
        );
      case 'not_interested':
        return (
          <span className="badge badge-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            ⚪ NOT INTERESTED
          </span>
        );
      case 'opted_out':
      case 'dnc':
        return (
          <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🔴 OPTED OUT (DO NOT CALL)
          </span>
        );
      default:
        return (
          <span className="badge badge-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            ⚪ QUALIFICATION PENDING
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Opted Out / DNC Warning Banner */}
      {lead.opted_out && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.12)',
            borderRadius: 'var(--radius-md)',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertOctagon size={28} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f87171' }}>
              DO NOT CALL (DNC) / OPTED OUT
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              The client explicitly requested not to be called again during a prior conversation. Outbound automated dialing is permanently disabled for compliance.
            </div>
          </div>
        </div>
      )}

      {/* Human Approval Gate & Safety Banner */}
      <div
        style={{
          padding: '16px',
          background: lead.calling_approved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${lead.calling_approved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lead.calling_approved ? (
            <ShieldCheck size={24} color="#34d399" />
          ) : (
            <ShieldAlert size={24} color="#fbbf24" />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {lead.calling_approved ? 'Human Calling Gate: APPROVED' : 'Human Calling Gate: PENDING APPROVAL'}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              {lead.opted_out
                ? 'Lead requested Do Not Call (DNC). All outreach blocked.'
                : lead.calling_approved
                ? 'Outbound cellular calling approved. Voice agent: Priya (Digital Growth Hub).'
                : 'Safety requirement: Explicit human approval required before initiating calls.'}
            </div>
          </div>
        </div>

        {/* Global Kill Switch Alert */}
        {killSwitchActive && (
          <span className="badge badge-danger">
            <ShieldAlert size={12} /> GLOBAL KILL SWITCH ACTIVE
          </span>
        )}
      </div>

      {/* Call History & Repeat Call Switcher */}
      {lead.calls && lead.calls.length > 0 && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
              <History size={16} color="var(--accent-primary)" />
              <span>RECORDED CALL HISTORY ({lead.calls.length} Total {lead.calls.length === 1 ? 'Call' : 'Calls'})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {lead.calls.length > 1 && (
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  Repeat Client ({lead.calls.length} Calls Recorded)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {lead.calls.map((call, idx) => {
              const isSelected = selectedCallIndex === idx;
              const callNum = lead.calls.length - idx;
              const isRepeat = callNum > 1;
              const dateText = call.created_at ? new Date(call.created_at).toLocaleDateString() : `#${callNum}`;
              return (
                <button
                  key={call.id || idx}
                  onClick={() => setSelectedCallIndex(idx)}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.775rem',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  <Phone size={12} />
                  <span>Call #{callNum} {isRepeat ? '(Repeat/Follow-up)' : '(Initial)'}</span>
                  <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>• {dateText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interest Status & Qualification Indicator */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>CLIENT RESPONSE:</span>
          {renderInterestBadge(currentInterest)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadTranscript}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            title="Download full dialogue and call transcript as a file"
          >
            <Download size={13} />
            <span>Download Call Record</span>
          </button>

          <button
            onClick={handleDownloadProposal}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            title="Download tailored strategy pitch and proposals"
          >
            <FileText size={13} />
            <span>Download Pitch & Proposal</span>
          </button>
        </div>
      </div>

      {/* Follow-up Call Arrangement Scheduler */}
      <div
        style={{
          padding: '16px',
          background: 'rgba(16, 185, 129, 0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={20} color="#34d399" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Arrange Follow-Up Call & Next Move
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Schedule next outreach or check-in consultation date with this client.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="e.g. Tomorrow 3:00 PM or 2026-09-20"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              width: '240px',
            }}
          />
          <button
            onClick={handleSaveFollowUp}
            disabled={isScheduling || !followUpDate.trim()}
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.775rem' }}
          >
            {isScheduling ? 'Saving...' : 'Set Follow-up'}
          </button>
        </div>
      </div>

      {/* Outbound Voice Calling Action Bar */}
      <div
        style={{
          padding: '20px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <PhoneCall size={20} color="#34d399" />
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {lead.business_name} — {targetPhone || 'No Phone Specified'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span className={`badge ${
                  activeCall?.status === 'completed'
                    ? 'badge-success'
                    : activeCall?.status === 'connected' || activeCall?.status === 'calling'
                    ? 'badge-warning'
                    : 'badge-secondary'
                }`}>
                  {activeCall ? activeCall.status.toUpperCase() : 'READY TO CALL'}
                </span>
                <span className="badge badge-info">Agent: Priya (Digital Growth Hub)</span>
                {totalCalls > 0 && (
                  <span className="badge badge-secondary">
                    Call Record {totalCalls > selectedCallIndex ? totalCalls - selectedCallIndex : 1} of {totalCalls}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Number Input */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '380px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Phone Number (e.g. +91 9876543210)..."
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                style={{
                  padding: '10px 12px 10px 34px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleStartCall}
              disabled={isCalling || !lead.calling_approved || killSwitchActive || lead.opted_out || !targetPhone.trim()}
              className="btn btn-primary"
              style={{
                background: lead.opted_out
                  ? 'var(--bg-card)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: lead.opted_out ? 'var(--border-subtle)' : '#10b981',
                padding: '10px 18px',
                fontWeight: 700,
              }}
            >
              {isCalling ? <Loader2 size={16} className="live-pulse" /> : <PhoneCall size={16} />}
              <span>{totalCalls > 0 ? `Place Call #${totalCalls + 1} (Repeat)` : 'Place Initial Phone Call'}</span>
            </button>

            {/* WhatsApp Direct Pitch */}
            {whatsappPhone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
                title="Send customized WhatsApp proposal addressing their queries"
              >
                <MessageCircle size={16} />
                <span>WhatsApp Pitch</span>
              </a>
            )}

            {/* Direct Dial Link */}
            {targetPhone && (
              <a
                href={`tel:${targetPhone.replace(/\s+/g, '')}`}
                className="btn btn-secondary"
                title="Dial from your computer or mobile dialer"
              >
                <ExternalLink size={14} />
                <span>Direct Dial</span>
              </a>
            )}

            {/* Conclude Button */}
            {activeCall && activeCall.status === 'connected' && (
              <button onClick={handleEndCall} className="btn btn-danger">
                <PhoneOff size={16} />
                <span>Conclude & Qualify</span>
              </button>
            )}
          </div>
        </div>

        {activeCall?.status === 'failed' && activeCall?.error_reason && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.4 }}>
            <strong>⚠️ Twilio Notice:</strong> {activeCall.error_reason}
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Note: If testing on Twilio trial, dial verified number <strong style={{ color: '#34d399', cursor: 'pointer' }} onClick={() => setTargetPhone('+918219562353')}>+91 82195 62353</strong> (Click to set).
            </div>
          </div>
        )}

        {statusMessage && (
          <div style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>
            ✓ {statusMessage}
          </div>
        )}
      </div>

      {/* Real-Time "Collected Customer Queries & Inquiries" Board */}
      <div
        style={{
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
            <HelpCircle size={16} color="var(--accent-primary)" />
            <span>COLLECTED CUSTOMER QUERIES & INQUIRIES</span>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            {collectedQueries.length} Captured
          </span>
        </div>

        {collectedQueries.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No customer queries collected yet for this call. Any questions asked by the caller during calls appear here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {collectedQueries.map((q, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
                    {q.category}
                  </span>
                  <span
                    className={`badge ${
                      q.priority === 'High' ? 'badge-danger' : q.priority === 'Medium' ? 'badge-warning' : 'badge-info'
                    }`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {q.priority || 'Normal'} Priority
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                  "{q.query}"
                </div>
                {q.answer_given && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px' }}>
                    <strong style={{ color: '#818cf8' }}>Priya Spoken Response:</strong> {q.answer_given}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tailored Next Sales Pitch Box */}
      {(lead.intelligence?.next_sales_pitch_hook || lead.strategy?.pitch_script) && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.06)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem', color: '#34d399' }}>
              <ArrowRight size={16} />
              <span>RECOMMENDED NEXT MOVE & SALES PITCH</span>
            </div>
            {whatsappPhone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <MessageCircle size={13} />
                <span>Send WhatsApp</span>
              </a>
            )}
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
            {lead.intelligence?.next_sales_pitch_hook || lead.strategy?.pitch_script}
          </p>
        </div>
      )}

      {/* Transcript Stream */}
      <div
        style={{
          background: 'rgba(10, 14, 23, 0.95)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          maxHeight: '420px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Volume2 size={14} color="var(--accent-primary)" />
            <span>
              CONVERSATION TRANSCRIPT {activeCall ? `(CALL #${totalCalls > selectedCallIndex ? totalCalls - selectedCallIndex : 1})` : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyTranscript}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              disabled={!activeCall?.transcript_turns?.length}
            >
              {copiedTranscript ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              <span>{copiedTranscript ? 'Copied!' : 'Copy Transcript'}</span>
            </button>

            <button
              onClick={handleDownloadTranscript}
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              disabled={!activeCall}
            >
              <Download size={12} />
              <span>Export Record (.txt)</span>
            </button>
          </div>
        </div>

        {!activeCall || !activeCall.transcript_turns || activeCall.transcript_turns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {totalCalls === 0
              ? 'No calls placed yet. Click "Place Initial Phone Call" above to initiate outreach.'
              : 'No transcript recorded for this specific call session.'}
          </div>
        ) : (
          activeCall.transcript_turns.map((turn, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: turn.speaker === 'agent' ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                alignSelf: turn.speaker === 'agent' ? 'flex-start' : 'flex-end',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: turn.speaker === 'agent' ? '#818cf8' : '#34d399',
                  marginBottom: '3px',
                  fontWeight: 600,
                }}
              >
                {turn.speaker === 'agent' ? 'Priya (Digital Growth Hub)' : `${lead.contact_person || lead.business_name || 'Phone Caller'}`}
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  background: turn.speaker === 'agent' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${turn.speaker === 'agent' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  color: 'var(--text-primary)',
                }}
              >
                {turn.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
