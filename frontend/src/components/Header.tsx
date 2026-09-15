import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Settings,
  Activity,
  Sparkles,
  Trash2,
  Sun,
  Moon
} from 'lucide-react';
import { api } from '../services/api';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  killSwitchActive: boolean;
  onToggleKillSwitch: () => void;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  onOpenQuickCall?: () => void;
  onClearAllLeads?: () => void;
  totalLeadsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
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
      background: 'var(--header-bg)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'background-color 0.25s ease, border-color 0.25s ease',
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
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
        }}>
          <Sparkles size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              <span className="gradient-text">[AUTOMATED-LEAD-AGENT]</span>
            </h1>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            100% Real Geodata, Web Verification, Voice Qualification & Strategy
          </p>
        </div>
      </div>

      {/* Agents Status & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Theme Toggle (Dark / Light Mode) */}
        <button
          onClick={onToggleTheme}
          className="btn btn-secondary"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} color="#fbbf24" />
              <span style={{ fontSize: '0.775rem', fontWeight: 600 }}>Light</span>
            </>
          ) : (
            <>
              <Moon size={15} color="#6366f1" />
              <span style={{ fontSize: '0.775rem', fontWeight: 600 }}>Dark</span>
            </>
          )}
        </button>

        {/* Direct AI Phone Caller */}
        {onOpenQuickCall && (
          <button
            onClick={onOpenQuickCall}
            className="btn btn-primary"
            style={{
              padding: '7px 14px',
              fontWeight: 700,
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
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
            borderColor: killSwitchActive ? '#ef4444' : 'var(--border-subtle)',
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
              <ShieldCheck size={16} color="#10b981" />
              <span>Kill Switch Ready</span>
            </>
          )}
        </button>

        {/* Clear All Leads */}
        {totalLeadsCount > 0 && onClearAllLeads && (
          <button
            onClick={onClearAllLeads}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', color: 'var(--danger)' }}
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
