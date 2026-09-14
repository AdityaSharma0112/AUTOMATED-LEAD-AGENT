import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  PackageCheck,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Target,
  FileText,
  Edit3,
  Save,
  X,
  Send,
  CheckCircle2,
  Clock,
  DollarSign,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { Lead, Strategy, SolutionItem, OfferPackage, ObjectionResponse } from '../../types/lead';
import { api } from '../../services/api';

interface StrategyTabProps {
  lead: Lead;
  onLeadUpdated: () => void;
}

export const StrategyTab: React.FC<StrategyTabProps> = ({ lead, onLeadUpdated }) => {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Editable Form State
  const [editProblem, setEditProblem] = useState('');
  const [editOpportunity, setEditOpportunity] = useState('');
  const [editNextAction, setEditNextAction] = useState('');
  const [editPitchScript, setEditPitchScript] = useState('');
  const [editPricingGuidance, setEditPricingGuidance] = useState('');
  const [editFitRationale, setEditFitRationale] = useState('');

  const strat = lead.strategy;

  useEffect(() => {
    if (strat) {
      setEditProblem(strat.problem_statement || '');
      setEditOpportunity(strat.opportunity || '');
      setEditNextAction(strat.next_action || '');
      setEditPitchScript(strat.pitch_script || '');
      setEditPricingGuidance(strat.pricing_guidance || '');
      setEditFitRationale(strat.fit_rationale || '');
    }
  }, [strat]);

  const handleCopyPitch = () => {
    if (!strat?.pitch_script) return;
    navigator.clipboard.writeText(strat.pitch_script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await api.regenerateStrategy(lead.id);
      onLeadUpdated();
    } catch (err: any) {
      alert(`Failed to regenerate strategy: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRefineWithAI = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiInstruction;
    if (!promptToUse.trim()) {
      alert('Please enter an instruction or choose a quick prompt to refine the plan.');
      return;
    }

    setIsRefining(true);
    try {
      await api.refineStrategy(lead.id, promptToUse);
      setAiInstruction('');
      onLeadUpdated();
    } catch (err: any) {
      alert(`Failed to refine plan with AI: ${err.message}`);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveManualEdit = async () => {
    setIsSaving(true);
    try {
      await api.updateStrategy(lead.id, {
        problem_statement: editProblem,
        opportunity: editOpportunity,
        next_action: editNextAction,
        pitch_script: editPitchScript,
        pricing_guidance: editPricingGuidance,
        fit_rationale: editFitRationale,
      });
      setIsEditing(false);
      onLeadUpdated();
    } catch (err: any) {
      alert(`Failed to save strategy edits: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const quickPrompts = [
    'Add 24-Hour Express Launch Guarantee',
    'Emphasize WhatsApp direct booking (Zero Swiggy/Zomato commission)',
    'Set starter package to ₹3,999/mo with free SSL and Google Maps setup',
    'Include 14-day zero-risk trial guarantee',
    'Highlight Google Maps Top-3 local ranking strategy',
  ];

  if (!strat) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
        <Sparkles size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          No Tailored Next Step Plan Generated Yet
        </h3>
        <p style={{ fontSize: '0.825rem', marginBottom: '16px' }}>
          Generate a tailored client requirements & delivery plan based on the call conversation and online intelligence.
        </p>
        <button onClick={handleRegenerate} disabled={isRegenerating} className="btn btn-primary">
          <Sparkles size={15} />
          <span>{isRegenerating ? 'Generating Plan...' : 'Generate Tailored Plan'}</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '8px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: '10px',
            color: 'var(--accent-primary)',
          }}>
            <Briefcase size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Tailored Next Step & Delivery Plan</h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
              Synthesized exact client demands & Digital Growth Lab delivery roadmap for {lead.business_name}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isEditing ? (
            <>
              <button
                onClick={handleSaveManualEdit}
                disabled={isSaving}
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Save size={13} />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Edit3 size={13} />
                <span>Edit Plan Manually</span>
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating || isRefining}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <RotateCcw size={13} className={isRegenerating ? 'live-pulse' : ''} />
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Plan'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI PLAN REFINEMENT TOOLBAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            AI Plan Refiner & Editor (Powered by Gemini)
          </span>
          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
            Interactive AI Customization
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Tell AI how to customize this plan (e.g. 'Add 24h turnaround guarantee', 'Change pricing to ₹4,999/mo', 'Emphasize WhatsApp direct booking')..."
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isRefining) handleRefineWithAI();
            }}
            disabled={isRefining}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.35)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              fontSize: '0.835rem',
              padding: '10px 14px',
            }}
          />
          <button
            onClick={() => handleRefineWithAI()}
            disabled={isRefining || !aiInstruction.trim()}
            className="btn btn-primary"
            style={{
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Send size={14} className={isRefining ? 'live-pulse' : ''} />
            <span>{isRefining ? 'Refining Plan...' : '✨ Refine with AI'}</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '2px' }}>Quick Presets:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleRefineWithAI(prompt)}
              disabled={isRefining}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
            >
              + {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: EXACT CLIENT DEMANDS & BUSINESS PROBLEM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Identified Client Demands & Problem */}
        <div style={{
          padding: '18px',
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 700, fontSize: '0.85rem' }}>
            <Target size={15} />
            <span>EXACT CLIENT DEMANDS & PROBLEM STATEMENT</span>
          </div>

          {isEditing ? (
            <textarea
              className="input-field"
              rows={4}
              value={editProblem}
              onChange={(e) => setEditProblem(e.target.value)}
              style={{ fontSize: '0.825rem', lineHeight: 1.4, resize: 'vertical' }}
            />
          ) : (
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
              {strat.problem_statement}
            </p>
          )}

          {strat.evidence_call && (
            <div style={{
              marginTop: '6px',
              padding: '8px 10px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '6px',
              borderLeft: '3px solid #f87171',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}>
              <strong style={{ color: '#fca5a5' }}>Call Evidence:</strong> {strat.evidence_call}
            </div>
          )}
        </div>

        {/* Growth & Revenue Opportunity */}
        <div style={{
          padding: '18px',
          background: 'rgba(16, 185, 129, 0.05)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>
            <TrendingUp size={15} />
            <span>DIGITAL GROWTH & REVENUE OPPORTUNITY</span>
          </div>

          {isEditing ? (
            <textarea
              className="input-field"
              rows={4}
              value={editOpportunity}
              onChange={(e) => setEditOpportunity(e.target.value)}
              style={{ fontSize: '0.825rem', lineHeight: 1.4, resize: 'vertical' }}
            />
          ) : (
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)', margin: 0 }}>
              {strat.opportunity}
            </p>
          )}

          {strat.fit_rationale && (
            <div style={{
              marginTop: '6px',
              padding: '8px 10px',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '6px',
              borderLeft: '3px solid #34d399',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}>
              <strong style={{ color: '#6ee7b7' }}>Fit Rationale:</strong> {strat.fit_rationale}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: WHAT DIGITAL GROWTH LAB CAN DO & DELIVER */}
      {strat.recommended_solutions && strat.recommended_solutions.length > 0 && (
        <div style={{
          padding: '18px',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PackageCheck size={16} color="var(--accent-primary)" />
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
                WHAT DIGITAL GROWTH LAB WILL DELIVER (ACTION PLAN & SERVICES)
              </h4>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tailored high-converting deliverables
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {strat.recommended_solutions.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    Deliverable #{item.priority || idx + 1}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    {item.impact || 'High'} Impact
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {item.title}
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: OFFER TIERS & PRICING PACKAGES */}
      {strat.offer_packages && strat.offer_packages.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="#34d399" />
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                RECOMMENDED PRICING & OFFER TIERS
              </h4>
            </div>

            {isEditing ? (
              <input
                type="text"
                className="input-field"
                placeholder="Pricing guidance..."
                value={editPricingGuidance}
                onChange={(e) => setEditPricingGuidance(e.target.value)}
                style={{ fontSize: '0.75rem', width: '280px', padding: '4px 8px' }}
              />
            ) : (
              strat.pricing_guidance && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  💡 {strat.pricing_guidance}
                </span>
              )
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
            {strat.offer_packages.map((pkg, idx) => {
              const isHighlighted = pkg.tier.toLowerCase().includes('growth') || pkg.tier.toLowerCase().includes('recommended') || pkg.tier.toLowerCase().includes('accelerator');
              return (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    background: isHighlighted ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isHighlighted ? 'rgba(99, 102, 241, 0.45)' : 'var(--border-subtle)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                  }}
                >
                  {isHighlighted && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '12px',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                    }}>
                      Recommended
                    </div>
                  )}

                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{pkg.tier}</span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6ee7b7', marginTop: '2px' }}>
                      {pkg.price}
                    </div>
                  </div>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, padding: 0 }}>
                    {pkg.features.map((f, fIdx) => (
                      <li key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Check size={12} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: OUTREACH PITCH SCRIPT */}
      <div style={{
        padding: '18px',
        background: 'rgba(99, 102, 241, 0.08)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
            <MessageSquare size={15} color="var(--accent-primary)" />
            <span>TAILORED OUTREACH & SALES PITCH SCRIPT</span>
          </div>
          <button onClick={handleCopyPitch} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
            <span>{copied ? 'Copied!' : 'Copy Script'}</span>
          </button>
        </div>

        {isEditing ? (
          <textarea
            className="input-field"
            rows={4}
            value={editPitchScript}
            onChange={(e) => setEditPitchScript(e.target.value)}
            style={{ fontSize: '0.835rem', lineHeight: 1.5, resize: 'vertical' }}
          />
        ) : (
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text-primary)', margin: 0 }}>
            "{strat.pitch_script}"
          </p>
        )}
      </div>

      {/* SECTION 5: ANTICIPATED OBJECTIONS & REBUTTALS */}
      {strat.objections_and_responses && strat.objections_and_responses.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            ANTICIPATED OBJECTIONS & SUGGESTED REBUTTALS
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {strat.objections_and_responses.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#fca5a5', marginBottom: '4px' }}>
                  Objection: "{item.objection}"
                </div>
                <div style={{ fontSize: '0.825rem', color: '#6ee7b7', lineHeight: 1.4 }}>
                  Suggested Rebuttal: {item.response}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: NEXT STEP & FOLLOW-UP ACTION */}
      <div style={{
        padding: '16px 18px',
        background: 'rgba(16, 185, 129, 0.08)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <Calendar size={20} color="#34d399" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RECOMMENDED NEXT ACTION</div>
            {isEditing ? (
              <input
                type="text"
                className="input-field"
                value={editNextAction}
                onChange={(e) => setEditNextAction(e.target.value)}
                style={{ fontSize: '0.825rem', marginTop: '4px' }}
              />
            ) : (
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {strat.next_action}
              </div>
            )}
          </div>
        </div>

        <div className="badge badge-success" style={{ fontSize: '0.75rem' }}>
          Follow-up: {strat.follow_up_date || 'Within 24-48 Hours'}
        </div>
      </div>
    </div>
  );
};
