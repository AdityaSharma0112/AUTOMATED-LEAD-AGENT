import React from 'react';
import { ShieldAlert, ShieldCheck, Download, Settings, Activity, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  onOpenQuickCall?: () => void;
  onClearAllLeads?: () => void;
  totalLeadsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  killSwitchActive,
  onToggleKillSwitch,
  onOpenSettings,
  onOpenAudit,
  onOpenQuickCall,
  onClearAllLeads,
  totalLeadsCount,
}) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand & Multi-Agent Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
        }}>
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ANTIGRAVITY <span className="gradient-text">LEAD AGENT</span>
            </h1>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
              v1.0 • Real Multi-Agent
            </span>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            100% Real Geodata, Web Verification, Voice Qualification & Strategy
          </p>
        </div>
      </div>

      {/* Agents Status & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Active Agents Pulse */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '20px',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 10px #10b981',
          }} className="live-pulse" />
          <span><strong>5 Agents</strong> Online</span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span>{totalLeadsCount} Leads</span>
        </div>

        {/* Direct AI Phone Caller */}
        {onOpenQuickCall && (
          <button
            onClick={onOpenQuickCall}
            className="btn btn-primary"
            style={{
              padding: '7px 14px',
              fontWeight: 700,
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            }}
            title="Call any custom number or client with the AI Voice Agent"
          >
            <Sparkles size={15} />
            <span>📞 Direct AI Caller</span>
          </button>
        )}

        {/* Global Kill Switch Button */}
        <button
          onClick={onToggleKillSwitch}
          className={`btn ${killSwitchActive ? 'btn-danger' : 'btn-secondary'}`}
          style={{
            borderColor: killSwitchActive ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: killSwitchActive ? '0 0 15px rgba(239, 68, 68, 0.4)' : 'none',
          }}
          title={killSwitchActive ? "Calling Kill Switch ACTIVE (Click to Disarm)" : "Click to ACTIVATE Emergency Kill Switch"}
        >
          {killSwitchActive ? (
            <>
              <ShieldAlert size={16} color="#ffffff" />
              <span>KILL SWITCH ACTIVE</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} color="#34d399" />
              <span>Kill Switch Ready</span>
            </>
          )}
        </button>

        {/* Clear All Leads */}
        {totalLeadsCount > 0 && onClearAllLeads && (
          <button
            onClick={onClearAllLeads}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', color: '#f87171' }}
            title="Wipe all leads and start completely fresh"
          >
            <Trash2 size={15} />
            <span>Clear Leads</span>
          </button>
        )}

        {/* CSV Export */}
        <a
          href={api.getExportCsvUrl()}
          download="leads_export.csv"
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
          title="Export all leads to CSV"
        >
          <Download size={15} />
          <span>Export CSV</span>
        </a>

        {/* Audit Stream Button */}
        <button
          onClick={onOpenAudit}
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
          title="View Live Agent Audit Events"
        >
          <Activity size={15} />
          <span>Audit</span>
        </button>

        {/* Settings Modal */}
        <button
          onClick={onOpenSettings}
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
          title="Provider & Model Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
