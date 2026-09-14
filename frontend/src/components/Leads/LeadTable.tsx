import React, { useState, useMemo } from 'react';
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
  Trash2
} from 'lucide-react';
import { Lead } from '../../types/lead';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedWebsiteStatus, setSelectedWebsiteStatus] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [sortField, setSortField] = useState<'lead_score' | 'rating' | 'review_count' | 'business_name'>('lead_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Categories & Cities for filters
  const categories = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.category && set.add(l.category));
    return Array.from(set);
  }, [leads]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.city && set.add(l.city));
    return Array.from(set);
  }, [leads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          const match =
            lead.business_name.toLowerCase().includes(s) ||
            lead.phone.toLowerCase().includes(s) ||
            lead.city.toLowerCase().includes(s) ||
            lead.category.toLowerCase().includes(s);
          if (!match) return false;
        }
        if (selectedCategory !== 'all' && lead.category !== selectedCategory) return false;
        if (selectedCity !== 'all' && lead.city !== selectedCity) return false;
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
  }, [leads, searchTerm, selectedCategory, selectedCity, selectedWebsiteStatus, minScore, approvedOnly, sortField, sortDirection]);

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

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Header & Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
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
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Discovered Leads</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {filteredLeads.length} of {leads.length} discovered businesses
            </p>
          </div>
        </div>

        {/* Quick Stats & Clear button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-warning">
            {leads.filter((l) => l.website_status === 'likely_absent').length} Without Website
          </span>
          <span className="badge badge-success">
            {leads.filter((l) => l.calling_approved).length} Approved
          </span>
          {leads.length > 0 && onClearAllLeads && (
            <button
              onClick={onClearAllLeads}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#f87171' }}
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter business, phone, city..."
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

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px 12px',
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

        {/* City */}
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
          }}
        >
          <option value="all">All Cities ({cities.length})</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Website Status */}
        <select
          value={selectedWebsiteStatus}
          onChange={(e) => setSelectedWebsiteStatus(e.target.value)}
          style={{
            padding: '8px 12px',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            <span>Min Score:</span>
            <strong>{minScore}+</strong>
          </div>
          <input
            type="range"
            min="0"
            max="95"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Approved Only Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          userSelect: 'none',
          color: 'var(--text-secondary)',
        }}>
          <input
            type="checkbox"
            checked={approvedOnly}
            onChange={(e) => setApprovedOnly(e.target.checked)}
            style={{ accentColor: 'var(--success)', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span>Approved Only</span>
        </label>
      </div>

      {/* Leads Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-card)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ padding: '12px 14px' }}>ID & Business</th>
              <th style={{ padding: '12px 14px' }}>Location</th>
              <th style={{ padding: '12px 14px' }}>Phone / Contact</th>
              <th style={{ padding: '12px 14px' }}>Website Status</th>
              <th style={{ padding: '12px 14px' }}>Reputation</th>
              <th style={{ padding: '12px 14px' }}>Lead Score</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Call Approval</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Loading leads...' : 'No leads found yet. Type a search query above to discover real businesses.'}
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Business Name & ID */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {lead.business_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {lead.lead_id}
                      </span>
                      <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                        {lead.category}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                      <MapPin size={13} color="var(--accent-primary)" />
                      <span>{lead.locality ? `${lead.locality}, ${lead.city}` : lead.city}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '14px' }}>
                    {lead.phone ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                          <Phone size={12} color="#34d399" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.contact_person && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            {lead.contact_person}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Website Status */}
                  <td style={{ padding: '14px' }}>
                    {renderWebsiteStatusBadge(lead.website_status, lead.website_confidence, lead.website_url)}
                  </td>

                  {/* Reputation */}
                  <td style={{ padding: '14px' }}>
                    {lead.rating ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={13} fill="#fbbf24" color="#fbbf24" />
                        <span style={{ fontWeight: 700 }}>{lead.rating}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({lead.review_count})
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Lead Score */}
                  <td style={{ padding: '14px' }}>
                    {renderScorePill(lead.lead_score)}
                  </td>

                  {/* Approval Gate Toggle */}
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <button
                      onClick={() => onToggleApproval(lead.id, lead.calling_approved)}
                      className={`btn ${lead.calling_approved ? 'btn-success' : 'btn-secondary'}`}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '20px',
                      }}
                      title={lead.calling_approved ? "Human calling approval GRANTED" : "Click to APPROVE for calling"}
                    >
                      {lead.calling_approved ? (
                        <>
                          <Check size={12} />
                          <span>Approved</span>
                        </>
                      ) : (
                        <span>Approve</span>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      {/* Call Button */}
                      <button
                        onClick={() => onStartCall(lead)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        disabled={!lead.calling_approved}
                        title={lead.calling_approved ? "Start Live Voice Qualification" : "Requires calling approval first"}
                      >
                        <PhoneCall size={13} />
                        <span>Call</span>
                      </button>

                      {/* 360 Profile Button */}
                      <button
                        onClick={() => onSelectLead(lead)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        title="View Complete 360° Lead Profile"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
