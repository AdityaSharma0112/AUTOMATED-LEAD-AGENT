import React, { useState } from 'react';
import {
  Mail,
  KeyRound,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const { sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await sendOtp(cleanEmail);
      setStep('otp');
      setSuccessMessage(res.message || `Verification code sent to ${cleanEmail}`);
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage('Please enter the verification code sent to your email.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await verifyOtp(email.trim().toLowerCase(), cleanOtp, fullName.trim() || undefined);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await sendOtp(email.trim().toLowerCase());
      setSuccessMessage('A fresh verification code was sent to your email.');
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(5, 7, 15, 0.82)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--card-bg, #111827)',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease-out',
      }}>
        {/* Top Header Banner */}
        <div style={{
          padding: '28px 28px 20px 28px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, transparent 100%)',
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.45)',
            marginBottom: '14px',
          }}>
            <Sparkles size={28} color="#ffffff" />
          </div>

          <h2 style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
            color: 'var(--text-primary, #f9fafb)',
          }}>
            <span className="gradient-text">[AUTOMATED-LEAD-AGENT]</span>
          </h2>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #9ca3af)',
            margin: 0,
            lineHeight: 1.4,
          }}>
            Sign in or create your account via Email & OTP to access your isolated leads workspace.
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px 28px 28px 28px' }}>
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '18px',
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ flex: 1 }}>{errorMessage}</span>
            </div>
          )}

          {successMessage && !errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              marginBottom: '18px',
            }}>
              <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ flex: 1 }}>{successMessage}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #9ca3af)',
                  marginBottom: '8px',
                }}>
                  Work / Personal Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={17}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary, #9ca3af)',
                    }}
                  />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    id="auth-email-input"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      fontSize: '0.95rem',
                      borderRadius: '10px',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-send-otp-btn"
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                  marginTop: '6px',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '4px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary, #9ca3af)',
              }}>
                <Lock size={13} />
                <span>Passwordless & Secure • Instant Access</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary, #9ca3af)',
                  }}>
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setErrorMessage(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary, #6366f1)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Change Email
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <KeyRound
                    size={17}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary, #9ca3af)',
                    }}
                  />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    id="auth-otp-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      fontSize: '1.2rem',
                      letterSpacing: '0.3em',
                      fontWeight: 700,
                      borderRadius: '10px',
                    }}
                  />
                </div>

                {devOtpHint && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span>💡 Dev OTP:</span>
                    <button
                      type="button"
                      id="dev-otp-autofill-btn"
                      onClick={() => setOtpCode(devOtpHint)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        color: 'var(--primary, #818cf8)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {devOtpHint} (Click to fill)
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary, #9ca3af)',
                  marginBottom: '8px',
                }}>
                  Your Name (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={17}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary, #9ca3af)',
                    }}
                  />
                  <input
                    type="text"
                    id="auth-fullname-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="input"
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      fontSize: '0.95rem',
                      borderRadius: '10px',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                id="auth-verify-btn"
                disabled={isLoading || otpCode.length < 4}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                  marginTop: '4px',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Access Leads</span>
                    <CheckCircle2 size={17} />
                  </>
                )}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: '0.8rem',
              }}>
                <button
                  type="button"
                  id="auth-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? 'var(--text-secondary)' : 'var(--primary, #6366f1)',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                  <span>
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
