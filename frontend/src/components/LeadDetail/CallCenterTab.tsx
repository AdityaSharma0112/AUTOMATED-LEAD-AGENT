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
  Phone
} from 'lucide-react';
import { Lead, CallSession, CollectedQuery } from '../../types/lead';
import { api } from '../../services/api';

interface CallCenterTabProps {
  lead: Lead;
  onLeadUpdated: () => void;
  killSwitchActive: boolean;
}

export const CallCenterTab: React.FC<CallCenterTabProps> = ({ lead, onLeadUpdated, killSwitchActive }) => {
  const [activeCall, setActiveCall] = useState<CallSession | null>(
    lead.calls && lead.calls.length > 0 ? lead.calls[0] : null
  );
  const [targetPhone, setTargetPhone] = useState(lead.phone || lead.normalized_phone || '');
  const [isCalling, setIsCalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [latestInterest, setLatestInterest] = useState<string | null>(
    lead.intelligence?.interest_status || null
  );

  // Update active call when lead changes
  useEffect(() => {
    if (lead.calls && lead.calls.length > 0) {
      setActiveCall(lead.calls[0]);
    }
    if (lead.intelligence?.interest_status) {
      setLatestInterest(lead.intelligence.interest_status);
    }
  }, [lead]);

  const handleStartCall = async () => {
    if (!lead.calling_approved) {
      alert('Please approve calling for this lead first via the Human Approval Gate.');
      return;
    }
    if (killSwitchActive) {
      alert('Global Emergency Kill Switch is ACTIVE. Outbound calling is prohibited.');
      return;
    }
    if (!targetPhone.trim()) {
      alert('Please provide a valid phone number to dial.');
      return;
    }

    setIsCalling(true);
    setStatusMessage(`Dialing cellular phone number ${targetPhone.trim()} via Twilio...`);

    try {
      const call = await api.initiateCall(lead.id, {
        call_type: 'twilio_phone',
        phone: targetPhone.trim(),
      });
      setActiveCall(call);
      setStatusMessage(`Real call placed to ${targetPhone}! Answer your phone to talk live with the AI consultant.`);
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

  // WhatsApp Pitch Message
  const whatsappPhone = (targetPhone || lead.normalized_phone || lead.phone || '').replace(/[^\d]/g, '');
  const pitchText =
    lead.intelligence?.next_sales_pitch_hook ||
    lead.strategy?.pitch_script ||
    `Hello ${lead.contact_person || 'there'}, reaching out regarding ${lead.business_name} in ${lead.city}.`;
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(pitchText)}`;

  // Queries list
  const collectedQueries: CollectedQuery[] =
    activeCall?.collected_queries || lead.intelligence?.collected_queries || [];

  const renderInterestBadge = (status: string | null) => {
    switch (status) {
      case 'interested_hot':
        return (
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🟢 INTERESTED — READY FOR SALES PITCH
          </span>
        );
      case 'interested_warm':
        return (
          <span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🟡 WARM LEAD (EXPLORING)
          </span>
        );
      case 'call_back':
        return (
          <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🔵 CALL BACK REQUESTED
          </span>
        );
      case 'not_interested':
        return (
          <span className="badge badge-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            ⚪ NOT INTERESTED
          </span>
        );
      case 'opted_out':
        return (
          <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            🔴 OPTED OUT (DNC)
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
                ? 'Lead requested Do Not Call (DNC). All outreach permanently blocked.'
                : lead.calling_approved
                ? 'Outbound cellular calling approved. Real phone calls will be placed via Twilio.'
                : 'Safety requirement: Explicit user approval is required before initiating calls.'}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>LEAD QUALIFICATION STATUS:</span>
          {renderInterestBadge(latestInterest)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Queries Collected: <strong style={{ color: 'var(--text-primary)' }}>{collectedQueries.length}</strong>
        </div>
      </div>

      {/* Outbound Cellular Calling Action Bar */}
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
                <span className="badge badge-info">Carrier: Twilio Voice</span>
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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#10b981',
                padding: '10px 18px',
                fontWeight: 700,
              }}
            >
              {isCalling ? <Loader2 size={16} className="live-pulse" /> : <PhoneCall size={16} />}
              <span>{activeCall ? 'Call Again' : 'Place Real Phone Call'}</span>
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
            <strong>⚠️ Twilio Trial Notice:</strong> {activeCall.error_reason}
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Note: Twilio trial accounts can only place calls to verified phone numbers. To test live on your mobile, dial <strong style={{ color: '#34d399', cursor: 'pointer' }} onClick={() => setTargetPhone('+918219562353')}>+91 82195 62353</strong> (Click to set).
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
            <span>COLLECTED CUSTOMER QUERIES & QUESTIONS</span>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            {collectedQueries.length} Captured
          </span>
        </div>

        {collectedQueries.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No customer queries collected yet. During the phone call, any questions asked by the caller (e.g. website design, Google Maps ranking, pricing) will appear here in real time.
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
                    <strong style={{ color: '#818cf8' }}>AI Spoken Response:</strong> {q.answer_given}
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
              <span>TAILORED NEXT SALES PITCH (READY TO CLOSE)</span>
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
          maxHeight: '380px',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Volume2 size={14} color="var(--accent-primary)" />
            <span>REAL TELEPHONE CONVERSATION TRANSCRIPT</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            AI Engine: Google Gemini 3.5 Flash
          </span>
        </div>

        {!activeCall || !activeCall.transcript_turns || activeCall.transcript_turns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Click "Place Real Phone Call" above. The AI will dial the phone line and converse naturally in real time.
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
                {turn.speaker === 'agent' ? 'AI Voice Consultant (Digital Growth Lab)' : `${lead.contact_person || 'Phone Caller'}`}
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
