import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ChatHub } from './components/Chat/ChatHub';
import { LeadTable } from './components/Leads/LeadTable';
import { LeadDetailModal } from './components/LeadDetail/LeadDetailModal';
import { AuditStream } from './components/Audit/AuditStream';
import { SettingsModal } from './components/Settings/SettingsModal';
import { QuickCallModal } from './components/Leads/QuickCallModal';
import { Lead, SearchJob, CallSession } from './types/lead';
import { api } from './services/api';

export const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeJob, setActiveJob] = useState<SearchJob | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showQuickCallModal, setShowQuickCallModal] = useState(false);

  const fetchSettingsAndLeads = async () => {
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
    fetchSettingsAndLeads();
  }, []);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation & Status */}
      <Header
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
