import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldCheck, Key, Cpu, PhoneCall, Sliders, Save, Sparkles, Globe } from 'lucide-react';
import { SystemSettings } from '../../types/lead';
import { api } from '../../services/api';

interface SettingsModalProps {
  onClose: () => void;
  onSettingsSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSettingsSaved }) => {
  const [llmProvider, setLlmProvider] = useState('groq');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [telephonyProvider, setTelephonyProvider] = useState('twilio');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');
  const [publicWebhookUrl, setPublicWebhookUrl] = useState('');
  const [googlePlacesEnabled, setGooglePlacesEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.getSettings();
        if (data.llm_provider?.provider) setLlmProvider(data.llm_provider.provider);
        if (data.telephony_provider?.provider) setTelephonyProvider(data.telephony_provider.provider);
        if (data.telephony_provider?.twilio_account_sid) setTwilioSid(data.telephony_provider.twilio_account_sid);
        if (data.telephony_provider?.twilio_auth_token) setTwilioToken(data.telephony_provider.twilio_auth_token);
        if (data.telephony_provider?.twilio_from_number) setTwilioFrom(data.telephony_provider.twilio_from_number);
        if (data.telephony_provider?.public_webhook_url) setPublicWebhookUrl(data.telephony_provider.public_webhook_url);
      } catch (err) {
        // use defaults
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSetting('llm_provider', {
        provider: llmProvider,
        groq_api_key: groqKey,
        gemini_api_key: geminiKey,
        openai_api_key: openaiKey,
      });
      await api.updateSetting('telephony_provider', {
        provider: telephonyProvider,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
        twilio_from_number: twilioFrom,
        public_webhook_url: publicWebhookUrl,
      });
      await api.updateSetting('research_providers', { enable_google: googlePlacesEnabled });
      onSettingsSaved();
      onClose();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel"
        style={{
          width: '620px',
          maxWidth: '95vw',
          maxHeight: '90vh',
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
            <Settings size={20} color="var(--accent-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Free & Real Resources Configuration</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Zero-cost live engines: OpenStreetMap, DuckDuckGo, Groq Free API & Web Speech
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Research Providers */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              <Globe size={15} color="var(--accent-primary)" />
              <span>REAL BUSINESS DATA PROVIDERS (100% FREE)</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--tab-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                <span><strong>OpenStreetMap Overpass API</strong> (Global ground-truth physical businesses)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                <span><strong>Nominatim Geocoder</strong> (City & location boundary coordinates)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                <span><strong>DuckDuckGo Live Web Search</strong> (Directory citations & contact extraction)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                <span><strong>HTTP Domain Accessibility Checker</strong> (Live 200/404/500 probe)</span>
              </div>
            </div>
          </div>

          {/* AI Inference Model */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              <Cpu size={15} color="var(--accent-secondary)" />
              <span>AI REASONING & STRATEGY ENGINE</span>
            </label>
            <select
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            >
              <option value="gemini">Google Gemini (Gemini 3.6 Flash / Live Auto-Discovery)</option>
              <option value="groq">Groq Cloud API (Free Llama 3.3 70B Versatile)</option>
              <option value="mock">Local Deterministic NLP Engine (No key needed)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
            </select>

            {llmProvider === 'groq' && (
              <input
                type="password"
                placeholder="Paste Groq API Key (Optional — Free from console.groq.com)..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
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
            )}

            {llmProvider === 'gemini' && (
              <input
                type="password"
                placeholder="Paste Gemini API Key (Optional — Free from aistudio.google.com)..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
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
            )}
          </div>

          {/* Voice Calling Engine */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
              <PhoneCall size={15} color="#34d399" />
              <span>REAL VOICE & CALLING METHOD</span>
            </label>
            <select
              value={telephonyProvider}
              onChange={(e) => setTelephonyProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            >
              <option value="twilio">Twilio Cellular Voice Gateway (Direct Mobile Calling)</option>
              <option value="web_speech">Browser Web Speech API (Microphone + Speaker — Free)</option>
            </select>

            {telephonyProvider === 'twilio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Twilio Account SID (e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)..."
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
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
                <input
                  type="password"
                  placeholder="Twilio Auth Token..."
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
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
                <input
                  type="text"
                  placeholder="Twilio Phone Number (e.g. +17372508034)..."
                  value={twilioFrom}
                  onChange={(e) => setTwilioFrom(e.target.value)}
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
                <input
                  type="text"
                  placeholder="Public Webhook / ngrok URL (e.g. https://xxxx.ngrok-free.app)..."
                  value={publicWebhookUrl}
                  onChange={(e) => setPublicWebhookUrl(e.target.value)}
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
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  ℹ️ <strong>For 2-way real-time voice streaming:</strong> Run <code>ngrok http 5050</code> or <code>ngrok http 8000</code> in your terminal and paste the generated HTTPS URL above. For direct spoken announcements, no ngrok is required.
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn btn-primary">
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Apply Real Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
