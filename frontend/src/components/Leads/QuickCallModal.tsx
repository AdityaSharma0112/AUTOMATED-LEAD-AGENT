import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  X,
  User,
  Building2,
  MapPin,
  FileText,
  Loader2,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';
import { CallSession } from '../../types/lead';

interface QuickCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallInitiated: (leadId: string, session: CallSession) => void;
}

export const QuickCallModal: React.FC<QuickCallModalProps> = ({ isOpen, onClose, onCallInitiated }) => {
  const [phone, setPhone] = useState('+918219562353');
  const [businessName, setBusinessName] = useState('Apex Auto Care');
  const [category, setCategory] = useState('Local Business & Services');
  const [contactPerson, setContactPerson] = useState('Business Owner');
  const [city, setCity] = useState('Solan');
  const [notes, setNotes] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg('A valid phone number is required to place the call.');
      return;
    }
    if (!businessName.trim()) {
      setErrorMsg('Business name is required.');
      return;
    }

    setIsCalling(true);
    setErrorMsg('');

    try {
      const session = await api.quickCall({
        phone: phone.trim(),
        business_name: businessName.trim(),
        category: category.trim(),
        contact_person: contactPerson.trim() || 'Business Owner',
        city: city.trim() || 'Solan',
        notes: notes.trim(),
        call_type: 'twilio_phone',
        webhook_base_url: webhookUrl.trim() || undefined,
      });

      onCallInitiated(session.lead, session);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place call.');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '90%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
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
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Direct AI Phone Caller</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Dial any mobile number directly via Twilio to converse live with Google Gemini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Target Phone Number */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={13} color="#34d399" />
              <span>Target Mobile Phone Number *</span>
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210 (or 10-digit mobile number)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {/* Optional Public Tunnel URL */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} color="#10b981" />
              <span>Public Tunnel / ngrok URL (Optional — for live 2-way WebSockets voice)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. https://xxxx.ngrok-free.app (leave blank to use .env PUBLIC_WEBHOOK_URL)"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Business Name & Contact Person Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={13} />
                <span>Business Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Auto Garage"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} />
                <span>Contact Person</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Category & City Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Category / Niche
              </label>
              <input
                type="text"
                placeholder="e.g. Car Repair, Bakery, Clinic"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} />
                <span>City / Location</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Solan, Shimla, Delhi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Custom Notes / Specific Focus */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={13} />
              <span>Specific Context / Focus for AI</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Discuss custom website in 48 hours and ask if they want a demo on WhatsApp..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                resize: 'none',
              }}
            />
          </div>

          {errorMsg && (
            <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem' }}>
              ✕ {errorMsg}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCalling}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderColor: '#10b981',
                padding: '10px 18px',
                fontWeight: 700,
              }}
            >
              {isCalling ? <Loader2 size={16} className="live-pulse" /> : <PhoneCall size={16} />}
              <span>{isCalling ? 'Dialing Number...' : 'Place Outbound Call (Twilio)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
