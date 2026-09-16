import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Globe,
  GlobeLock,
  Phone,
  PhoneCall,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  FileSpreadsheet,
  Check,
  ShieldCheck,
  Building2,
  MapPin,
  TrendingUp,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Filter,
  RotateCcw,
  Sparkles,
  Calendar,
  AlertOctagon,
  Download
} from 'lucide-react';
import { Lead } from '../../types/lead';
import { exportStrategyProposal } from '../../utils/exportLead';

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onToggleApproval: (leadId: string, currentStatus: boolean) => void;
  onStartCall: (lead: Lead) => void;
  onReverify: (leadId: string) => void;
  onClearAllLeads?: () => void;
  isLoading: boolean;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onToggleApproval,
  onStartCall,
  onReverify,
  onClearAllLeads,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWebsiteStatus, setSelectedWebsiteStatus] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [sortField, setSortField] = useState<'lead_score' | 'rating' | 'review_count' | 'business_name' | 'city'>('lead_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grouped'>('table');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Extract distinct areas & localities with counts
  const areaCounts = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const area = (l.locality || l.city || 'Other Area').trim();
      map.set(area, (map.get(area) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  // Extract distinct categories with counts
  const categories = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.category && set.add(l.category));
    return Array.from(set).sort();
  }, [leads]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedArea, selectedCategory, selectedWebsiteStatus, minScore, approvedOnly, pageSize]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const match =
            lead.business_name.toLowerCase().includes(s) ||
            (lead.phone && lead.phone.toLowerCase().includes(s)) ||
            (lead.city && lead.city.toLowerCase().includes(s)) ||
            (lead.locality && lead.locality.toLowerCase().includes(s)) ||
            (lead.category && lead.category.toLowerCase().includes(s));
          if (!match) return false;
        }

        if (selectedArea !== 'all') {
          const area = (lead.locality || lead.city || '').toLowerCase();
          const target = selectedArea.toLowerCase();
          if (!area.includes(target) && !(lead.city || '').toLowerCase().includes(target)) {
            return false;
          }
        }

        if (selectedCategory !== 'all' && lead.category !== selectedCategory) return false;
        if (selectedWebsiteStatus !== 'all' && lead.website_status !== selectedWebsiteStatus) return false;
        if (lead.lead_score < minScore) return false;
        if (approvedOnly && !lead.calling_approved) return false;
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || 0;
        let valB = b[sortField] || 0;
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [leads, searchTerm, selectedArea, selectedCategory, selectedWebsiteStatus, minScore, approvedOnly, sortField, sortDirection]);

  // Pagination calculations
  const totalItems = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(startIndex, startIndex + pageSize);
  }, [filteredLeads, startIndex, pageSize]);

  // Area-wise grouping for grouped view
  const groupedLeads = useMemo(() => {
    const groups: { [key: string]: Lead[] } = {};
    filteredLeads.forEach((l) => {
      const areaKey = (l.locality || l.city || 'Other Area').trim();
      if (!groups[areaKey]) groups[areaKey] = [];
      groups[areaKey].push(l);
    });
    return groups;
  }, [filteredLeads]);

  const hasActiveFilters = searchTerm || selectedArea !== 'all' || selectedCategory !== 'all' || selectedWebsiteStatus !== 'all' || minScore > 0 || approvedOnly;

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedArea('all');
    setSelectedCategory('all');
    setSelectedWebsiteStatus('all');
    setMinScore(0);
    setApprovedOnly(false);
  };

  const renderWebsiteStatusBadge = (status: string, confidence: number, url: string) => {
    const pct = Math.round((confidence || 0.5) * 100);
    switch (status) {
      case 'likely_absent':
        return (
          <span className="badge badge-warning" title={`No website found across directories (${pct}% confidence)`}>
            <GlobeLock size={12} />
            <span>Likely Absent ({pct}%)</span>
          </span>
        );
      case 'verified_present':
        return (
          <span className="badge badge-success" title={`Active website verified: ${url}`}>
            <Globe size={12} />
            <span>Verified ({pct}%)</span>
          </span>
        );
      case 'likely_present':
        return (
          <span className="badge badge-info" title="Social page or listing detected">
            <Globe size={12} />
            <span>Likely Present ({pct}%)</span>
          </span>
        );
      case 'inaccessible':
        return (
          <span className="badge badge-danger" title="Broken / Inaccessible domain">
            <AlertCircle size={12} />
            <span>Inaccessible</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-secondary" title="Unconfirmed status">
            <AlertCircle size={12} />
            <span>Unknown ({pct}%)</span>
          </span>
        );
    }
  };

  const renderScorePill = (score: number) => {
    let cls = 'score-mid';
    if (score >= 75) cls = 'score-high';
    else if (score < 40) cls = 'score-low';
    return <span className={`score-pill ${cls}`}>{score}/100</span>;
  };

  const renderCallDisposition = (lead: Lead) => {
    const totalCalls = lead.calls ? lead.calls.length : (lead.calls_count || 0);
    const interest = lead.intelligence?.interest_status || lead.interest_status;
    const followUp = lead.strategy?.follow_up_date || lead.follow_up_date;

    if (lead.opted_out || interest === 'opted_out') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="badge badge-danger" style={{ fontSize: '0.68rem', width: 'fit-content' }}>
            🔴 DNC (Opted Out)
          </span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {totalCalls > 0 ? `${totalCalls} Call${totalCalls > 1 ? 's' : ''} held` : 'No calls'}
          </span>
        </div>
      );
    }

    if (totalCalls === 0) {
      return (
        <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
          ⚪ No Calls Yet
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <span className="badge badge-info" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
            Call #{totalCalls} {totalCalls > 1 ? '(Repeat)' : ''}
          </span>
          {String(interest || '') === 'interested_hot' || String(interest || '') === 'hot' ? (
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>🟢 Hot</span>
          ) : String(interest || '') === 'interested_warm' || String(interest || '') === 'warm' ? (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>🟡 Warm</span>
          ) : String(interest || '') === 'call_back' ? (
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>🔵 Follow-up</span>
          ) : (
            <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>⚪ Qualified</span>
          )}
        </div>
        {followUp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#6ee7b7' }}>
            <Calendar size={10} />
            <span>{followUp}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header & Stats Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '10px',
            color: 'var(--success)',
          }}>
            <Building2 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Discovered Business Leads</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Showing {totalItems} of {leads.length} discovered businesses
            </p>
          </div>
        </div>

        {/* View Switch & Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'var(--tab-bg)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`btn ${viewMode === 'grouped' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Layers size={12} />
              <span>Area Wise</span>
            </button>
          </div>

          <span className="badge badge-warning">
            {leads.filter((l) => l.website_status === 'likely_absent').length} No Website
          </span>
          <span className="badge badge-success">
            {leads.filter((l) => l.calling_approved).length} Approved
          </span>

          {leads.length > 0 && onClearAllLeads && (
            <button
              onClick={onClearAllLeads}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '5px 10px', color: 'var(--danger)' }}
              title="Delete all leads and start fresh"
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* AREA-WISE HORIZONTAL PILLS STRIP */}
      {areaCounts.length > 0 && (
        <div style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollbarWidth: 'thin',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={13} color="var(--accent-primary)" />
            <span>AREAS:</span>
          </span>

          <button
            onClick={() => setSelectedArea('all')}
            style={{
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: selectedArea === 'all' ? 700 : 500,
              background: selectedArea === 'all' ? 'var(--accent-primary)' : 'var(--chip-bg)',
              color: selectedArea === 'all' ? '#fff' : 'var(--chip-text)',
              border: `1px solid ${selectedArea === 'all' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            📍 All Areas ({leads.length})
          </button>

          {areaCounts.map(([area, count]) => (
            <button
              key={area}
              onClick={() => setSelectedArea(selectedArea === area ? 'all' : area)}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: selectedArea === area ? 700 : 500,
                background: selectedArea === area ? 'var(--chip-active-bg)' : 'var(--chip-bg)',
                color: selectedArea === area ? 'var(--accent-primary)' : 'var(--chip-text)',
                border: `1px solid ${selectedArea === area ? 'var(--chip-active-border)' : 'var(--border-subtle)'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              📍 {area} ({count})
            </button>
          ))}
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '18px',
        padding: '14px',
        background: 'var(--tab-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search business, phone, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
            }}
          />
        </div>

        {/* Area / Locality Selector */}
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          style={{
            padding: '8px 10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="all">All Areas ({areaCounts.length})</option>
          {areaCounts.map(([a, count]) => (
            <option key={a} value={a}>📍 {a} ({count})</option>
          ))}
        </select>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px 10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="all">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Website Status */}
        <select
          value={selectedWebsiteStatus}
          onChange={(e) => setSelectedWebsiteStatus(e.target.value)}
          style={{
            padding: '8px 10px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="all">All Website Statuses</option>
          <option value="likely_absent">Likely Absent (High Opportunity)</option>
          <option value="verified_present">Verified Present</option>
          <option value="likely_present">Likely Present</option>
          <option value="inaccessible">Inaccessible</option>
          <option value="unknown">Unknown</option>
        </select>

        {/* Min Score Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            <span>Min Score:</span>
            <strong style={{ color: minScore > 0 ? 'var(--accent-primary)' : 'inherit' }}>{minScore}+</strong>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer', height: '4px' }}
          />
        </div>

        {/* Approved Toggle & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            cursor: 'pointer',
            userSelect: 'none',
            color: 'var(--text-secondary)',
          }}>
            <input
              type="checkbox"
              checked={approvedOnly}
              onChange={(e) => setApprovedOnly(e.target.checked)}
              style={{ accentColor: 'var(--success)', width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <span>Approved Only</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Reset all filters"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE: GROUPED BY AREA */}
      {viewMode === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {Object.keys(groupedLeads).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              {isLoading ? 'Loading leads...' : 'No leads match the selected area and filters.'}
            </div>
          ) : (
            Object.entries(groupedLeads).map(([areaName, areaLeads]) => (
              <div
                key={areaName}
                style={{
                  background: 'var(--tab-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* Area Group Header */}
                <div style={{
                  padding: '10px 16px',
                  background: 'var(--chip-active-bg)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      📍 {areaName}
                    </span>
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                      {areaLeads.length} Lead{areaLeads.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {areaLeads.filter((l) => l.website_status === 'likely_absent').length} Need Website
                  </div>
                </div>

                {/* Area Leads Grid */}
                <div style={{
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '10px',
                }}>
                  {areaLeads.map((lead) => (
                    <div
                      key={lead.id}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {lead.business_name}
                          </div>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                            {lead.category}
                          </span>
                        </div>
                        {renderScorePill(lead.lead_score)}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} color="#10b981" />
                        <span>{lead.phone || 'No phone'}</span>
                      </div>

                      <div>
                        {renderWebsiteStatusBadge(lead.website_status, lead.website_confidence, lead.website_url)}
                      </div>

                      <div style={{ marginTop: '2px' }}>
                        {renderCallDisposition(lead)}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-subtle)',
                        marginTop: '2px',
                      }}>
                        <button
                          onClick={() => onToggleApproval(lead.id, lead.calling_approved)}
                          className={`btn ${lead.calling_approved ? 'btn-success' : 'btn-secondary'}`}
                          style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '12px' }}
                        >
                          {lead.calling_approved ? '✓ Approved' : 'Approve'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => exportStrategyProposal(lead, lead.strategy)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 7px', fontSize: '0.7rem' }}
                            title="Download Sales Strategy & Proposal"
                          >
                            <Download size={11} />
                          </button>
                          <button
                            onClick={() => onStartCall(lead)}
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                            disabled={!lead.calling_approved || lead.opted_out}
                          >
                            <PhoneCall size={11} />
                            <span>Call</span>
                          </button>
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            <Eye size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VIEW MODE: PAGINATED FLAT TABLE */
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-card)',
                  background: 'var(--table-head-bg)',
                  color: 'var(--text-muted)',
                  fontSize: '0.73rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <th style={{ padding: '12px 14px' }}>Business Name</th>
                  <th style={{ padding: '12px 14px' }}>Area / Locality</th>
                  <th style={{ padding: '12px 14px' }}>Phone / Contact</th>
                  <th style={{ padding: '12px 14px' }}>Website Status</th>
                  <th style={{ padding: '12px 14px' }}>Reputation</th>
                  <th style={{ padding: '12px 14px' }}>Score</th>
                  <th style={{ padding: '12px 14px' }}>Call Status & Move</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Call Approval</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {isLoading ? 'Loading leads...' : 'No leads match the selected area and filters.'}
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Business Name & ID */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.885rem' }}>
                          {lead.business_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {lead.lead_id}
                          </span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                            {lead.category}
                          </span>
                        </div>
                      </td>

                      {/* Area / Locality */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <MapPin size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {lead.locality ? `${lead.locality}, ${lead.city}` : lead.city}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '12px 14px' }}>
                        {lead.phone ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                              <Phone size={12} color="#34d399" />
                              <span>{lead.phone}</span>
                            </div>
                            {lead.contact_person && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {lead.contact_person}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Website Status */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderWebsiteStatusBadge(lead.website_status, lead.website_confidence, lead.website_url)}
                      </td>

                      {/* Reputation */}
                      <td style={{ padding: '12px 14px' }}>
                        {lead.rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={13} fill="#fbbf24" color="#fbbf24" />
                            <span style={{ fontWeight: 700 }}>{lead.rating}</span>
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                              ({lead.review_count})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Lead Score */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderScorePill(lead.lead_score)}
                      </td>

                      {/* Call Status & Move */}
                      <td style={{ padding: '12px 14px' }}>
                        {renderCallDisposition(lead)}
                      </td>

                      {/* Approval Gate Toggle */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => onToggleApproval(lead.id, lead.calling_approved)}
                          className={`btn ${lead.calling_approved ? 'btn-success' : 'btn-secondary'}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            borderRadius: '16px',
                          }}
                          title={lead.calling_approved ? "Human calling approval GRANTED" : "Click to APPROVE for calling"}
                        >
                          {lead.calling_approved ? (
                            <>
                              <Check size={11} />
                              <span>Approved</span>
                            </>
                          ) : (
                            <span>Approve</span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => exportStrategyProposal(lead, lead.strategy)}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                            title="Download Sales Strategy & Proposal"
                          >
                            <Download size={12} />
                            <span>Strategy</span>
                          </button>

                          <button
                            onClick={() => onStartCall(lead)}
                            className="btn btn-primary"
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.72rem',
                              opacity: lead.opted_out ? 0.4 : 1,
                              cursor: lead.opted_out ? 'not-allowed' : 'pointer',
                            }}
                            disabled={!lead.calling_approved || lead.opted_out}
                            title={lead.opted_out ? "Client requested Do Not Call (DNC)" : lead.calling_approved ? "Start Live Voice Call" : "Requires calling approval"}
                          >
                            <PhoneCall size={12} />
                            <span>Call</span>
                          </button>

                          <button
                            onClick={() => onSelectLead(lead)}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.72rem' }}
                            title="View Complete 360° Lead Profile"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION TOOLBAR */}
          {totalItems > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              marginTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              {/* Items range & Page size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> leads
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Page Navigator Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  title="First Page"
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  title="Previous Page"
                >
                  <ChevronLeft size={13} />
                </button>

                {/* Page number buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span style={{ padding: '0 4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: currentPage === p ? 700 : 500,
                          background: currentPage === p ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
                          color: currentPage === p ? '#fff' : 'var(--text-primary)',
                          border: `1px solid ${currentPage === p ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  title="Next Page"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  title="Last Page"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
