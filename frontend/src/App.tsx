import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatHub } from './components/Chat/ChatHub';
import { LeadTable } from './components/Leads/LeadTable';
import { LeadDetailModal } from './components/LeadDetail/LeadDetailModal';
import { AuditStream } from './components/Audit/AuditStream';
import { SettingsModal } from './components/Settings/SettingsModal';
import { QuickCallModal } from './components/Leads/QuickCallModal';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Lead, SearchJob } from './types/lead';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

const MainWorkspace: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('antigravity_theme') as 'dark' | 'light') || 'dark';
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeJob, setActiveJob] = useState<SearchJob | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuickCallModal, setShowQuickCallModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('antigravity_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchSettingsAndLeads = async () => {
    if (!isAuthenticated) return;
    setIsLoadingLeads(true);
    try {
      const settings = await api.getSettings();
      setKillSwitchActive(settings.kill_switch?.active || false);

      const existingLeads = await api.getLeads();
      setLeads(existingLeads);
    } catch (err) {
      console.error("Initial load error:", err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettingsAndLeads();
    } else {
      setLeads([]);
      setActiveJob(null);
      setIsLoadingLeads(false);
    }
  }, [isAuthenticated, user?.id]);

  const handleSearch = async (params: string | { query?: string; city?: string; category?: string; radius_km?: number; website_filter?: string }) => {
    setIsSearching(true);
    try {
      const job = await api.search(params);
      setActiveJob(job);
      const updatedLeads = await api.getLeads();
      setLeads(updatedLeads);
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearAllLeads = async () => {
    if (!window.confirm("Are you sure you want to delete all leads and start fresh?")) return;
    try {
      await api.clearAllLeads();
      setLeads([]);
      setActiveJob(null);
    } catch (err: any) {
      alert(`Clear error: ${err.message}`);
    }
  };

  const handleToggleApproval = async (leadId: string, currentStatus: boolean) => {
    try {
      const res = await api.toggleCallingApproval(leadId, !currentStatus);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, calling_approved: res.calling_approved } : l))
      );
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleToggleKillSwitch = async () => {
    const nextState = !killSwitchActive;
    try {
      await api.updateSetting('kill_switch', {
        active: nextState,
        reason: nextState ? 'Manual Emergency Trigger' : 'Disarmed',
      });
      setKillSwitchActive(nextState);
    } catch (err: any) {
      alert(`Kill switch error: ${err.message}`);
    }
  };

  const handleStartCall = (lead: Lead) => {
    setSelectedLeadId(lead.id);
  };

  const handleReverify = async (leadId: string) => {
    try {
      await api.reverifyLead(leadId);
      const updated = await api.getLeads();
      setLeads(updated);
    } catch (err: any) {
      alert(`Reverify error: ${err.message}`);
    }
  };

  const refreshLeads = async () => {
    const updated = await api.getLeads();
    setLeads(updated);
  };

  if (isAuthLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main, #0b0f19)',
        color: 'var(--text-primary, #ffffff)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Loader2 size={36} className="animate-spin" color="#6366f1" />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading Workspace...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation & Status */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        killSwitchActive={killSwitchActive}
        onToggleKillSwitch={handleToggleKillSwitch}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenAudit={() => setShowAuditModal(true)}
        onOpenQuickCall={() => setShowQuickCallModal(true)}
        onClearAllLeads={handleClearAllLeads}
        totalLeadsCount={leads.length}
      />

      {/* Main Container */}
      <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px', flex: 1 }}>
        {/* Chat & NL Pipeline Hub */}
        <ChatHub
          onSearch={handleSearch}
          isSearching={isSearching}
          activeJob={activeJob}
        />

        {/* Qualified Leads Explorer */}
        <LeadTable
          leads={leads}
          onSelectLead={(lead) => setSelectedLeadId(lead.id)}
          onToggleApproval={handleToggleApproval}
          onStartCall={handleStartCall}
          onReverify={handleReverify}
          onClearAllLeads={handleClearAllLeads}
          isLoading={isLoadingLeads}
        />
      </main>

      {/* Auth Modal when not logged in */}
      {!isAuthenticated && (
        <AuthModal onSuccess={fetchSettingsAndLeads} />
      )}

      {/* Direct AI Quick Call Modal */}
      {showQuickCallModal && (
        <QuickCallModal
          isOpen={showQuickCallModal}
          onClose={() => setShowQuickCallModal(false)}
          onCallInitiated={async (leadId) => {
            await refreshLeads();
            setSelectedLeadId(leadId);
          }}
        />
      )}

      {/* 360° Lead Detail Profile Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={refreshLeads}
          killSwitchActive={killSwitchActive}
        />
      )}

      {/* Audit Event Stream Modal */}
      {showAuditModal && (
        <AuditStream onClose={() => setShowAuditModal(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSettingsSaved={fetchSettingsAndLeads}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainWorkspace />
    </AuthProvider>
  );
};
