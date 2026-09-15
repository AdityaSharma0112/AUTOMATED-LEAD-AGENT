import { Lead, CallSession, Strategy } from '../types/lead';

/**
 * Trigger download of any text content as a file in the browser reliably
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/markdown;charset=utf-8;') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      } catch (e) {
        // ignore cleanup error
      }
    }, 2000);
  } catch (err: any) {
    console.error('Download error:', err);
    alert(`Download failed: ${err.message}`);
  }
}

/**
 * Generates and downloads the Call Record & Conversation Transcript for a specific Call Session
 */
export function exportCallRecord(lead: Lead, callSession: CallSession | null, callIndex: number = 1) {
  try {
    if (!lead) {
      alert('No lead selected to export call record.');
      return;
    }
    const dateStr = callSession?.created_at ? new Date(callSession.created_at).toLocaleString() : new Date().toLocaleString();
    const durationStr = callSession?.duration_seconds ? `${Math.floor(callSession.duration_seconds / 60)}m ${callSession.duration_seconds % 60}s` : '0s';
    const isRepeatCall = callIndex > 1;

    let content = `# CALL RECORD: ${lead.business_name || 'Client'} (Call #${callIndex})
Generated: ${new Date().toLocaleString()}
Agent: Priya (Digital Growth Hub)

================================================================================
CALL METADATA & STATUS
================================================================================
Client Name:        ${lead.business_name || 'N/A'}
Contact Phone:      ${lead.phone || 'N/A'}
Contact Email:      ${lead.email || 'N/A'}
Call Number:        Call #${callIndex} ${isRepeatCall ? '(Repeat / Follow-up Call)' : '(Initial Outreach)'}
Call Date & Time:   ${dateStr}
Call Duration:      ${durationStr}
Call Status:        ${(callSession?.status || 'COMPLETED').toUpperCase()}
Outcome / State:    ${callSession?.outcome ? String(callSession.outcome).toUpperCase() : 'N/A'}
Customer Sentiment: ${callSession?.sentiment || 'N/A'}
Interest Level:     ${callSession?.interest_level || lead.interest_status || 'N/A'}
Do Not Call / DNC:  ${lead.opted_out ? 'YES (Client requested not to call again)' : 'NO (Active)'}
Next Follow-up:     ${lead.follow_up_date || lead.strategy?.follow_up_date || 'Not Scheduled'}

================================================================================
CALL SUMMARY & NEXT ACTION
================================================================================
${callSession?.summary ? callSession.summary : 'No summary recorded.'}

Key Objections Raised:
${callSession?.objections && Array.isArray(callSession.objections) && callSession.objections.length > 0 ? callSession.objections.map(obj => ` - ${obj}`).join('\n') : ' - None recorded'}

Recommended Next Move:
${lead.strategy?.next_action || 'Review conversation and arrange follow-up.'}

================================================================================
FULL CONVERSATION TRANSCRIPT (PRIYA <-> CLIENT)
================================================================================
`;

    if (callSession?.transcript_turns && Array.isArray(callSession.transcript_turns) && callSession.transcript_turns.length > 0) {
      const turnsText = callSession.transcript_turns
        .map((turn, i) => {
          const speaker = turn.speaker === 'agent' ? 'Priya (AI Consultant)' : `${lead.business_name || 'Client'}`;
          const time = turn.created_at ? ` [${new Date(turn.created_at).toLocaleTimeString()}]` : '';
          return `[${i + 1}] ${speaker}${time}:\n"${turn.text}"\n`;
        })
        .join('\n');
      content += turnsText;
    } else {
      content += 'No transcript turns recorded for this call session.\n';
    }

    const safeName = (lead.business_name || 'lead').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `Call_Record_Call${callIndex}_${safeName}.txt`;
    downloadTextFile(content, filename, 'text/plain;charset=utf-8;');
  } catch (err: any) {
    console.error('Failed to export call record:', err);
    alert(`Failed to export call record: ${err.message}`);
  }
}

/**
 * Generates and downloads the Sales Pitch Strategy and Proposal
 */
export function exportStrategyProposal(lead: Lead, strategy?: Strategy | null) {
  try {
    if (!lead) {
      alert('No lead selected to export strategy.');
      return;
    }
    const strat = strategy || lead.strategy;
    const dateStr = new Date().toLocaleDateString();

    let content = `# SALES STRATEGY & PROPOSAL DOSSIER
Client: ${lead.business_name || 'Valued Business'}
Prepared By: Priya | Digital Growth Hub
Date: ${dateStr}

================================================================================
1. EXECUTIVE SUMMARY & TARGET PROFILE
================================================================================
Business Name:      ${lead.business_name || 'N/A'}
Category / Niche:   ${lead.category || 'General Business'}
Location / Address: ${lead.address || (lead.locality ? `${lead.locality}, ${lead.city}` : lead.city) || 'N/A'}
Website:            ${lead.website || lead.website_url || 'N/A'}
Contact Phone:      ${lead.phone || 'N/A'}
Primary Pain Points:
${lead.pain_points && Array.isArray(lead.pain_points) && lead.pain_points.length > 0 ? lead.pain_points.map(p => ` • ${p}`).join('\n') : ' • Under-optimized online visibility, missing local digital capture'}

================================================================================
2. PROBLEM STATEMENT & OPPORTUNITY
================================================================================
Problem Statement:
${strat?.problem_statement || 'Business is missing inbound organic leads due to lack of automated local web presence and search discovery.'}

Revenue Opportunity:
${strat?.opportunity || 'Capture high-intent local customer queries and convert calls into direct bookings 24/7.'}

================================================================================
3. CUSTOM SALES PITCH SCRIPT (PRIYA'S PLAYBOOK)
================================================================================
"${strat?.pitch_script || lead.intelligence?.next_sales_pitch_hook || `Hello ${lead.contact_person || 'there'}, Priya here from Digital Growth Hub. We noticed your business ${lead.business_name || 'here'} has great potential and we'd love to help automate your customer booking and digital visibility!`}"

================================================================================
4. TAILORED OFFER PACKAGES & PROPOSALS
================================================================================
`;

    if (strat?.offer_packages && Array.isArray(strat.offer_packages) && strat.offer_packages.length > 0) {
      strat.offer_packages.forEach((pkg: any, index: number) => {
        const tierName = pkg.tier || pkg.name || `Package #${index + 1}`;
        const priceVal = pkg.price || 'Contact for pricing';
        const features = pkg.features || pkg.deliverables || [];
        content += `
--------------------------------------------------------------------------------
PACKAGE #${index + 1}: ${String(tierName).toUpperCase()}
Price: ${priceVal}
Deliverables:
${Array.isArray(features) && features.length > 0 ? features.map((d: any) => `  ✓ ${d}`).join('\n') : '  ✓ Complete digital growth & AI booking setup'}
--------------------------------------------------------------------------------
`;
      });
    } else {
      content += `
- Standard Growth Package: ₹3,999/mo (Local SEO, Google Profile Optimization, Automated AI Booking)
- Scale Accelerator Package: ₹7,999/mo (Complete CRM integration, WhatsApp Lead Auto-Responder, AI Calling Receptionist)
`;
    }

    content += `
================================================================================
5. OBJECTION HANDLING GUIDE
================================================================================
`;

    const objections = strat?.objections_and_responses || (strat as any)?.objection_guide;
    if (objections && Array.isArray(objections) && objections.length > 0) {
      objections.forEach((guide: any) => {
        content += `
[Objection]: "${guide.objection || 'Common hesitation'}"
[Priya's Response]: "${guide.response || guide.rebuttal || 'We offer zero-risk launch with guaranteed turnaround.'}"
`;
      });
    } else {
      content += `
[Objection]: "We already have an agency / handling this in-house."
[Priya's Response]: "That's wonderful! We don't replace your team; we supply high-converting AI automation tools that amplify their results with zero extra hours required."

[Objection]: "Send me details on WhatsApp/Email first."
[Priya's Response]: "Absolutely, I'll send our exact audit breakdown to your WhatsApp right now. Let's touch base briefly on Friday once you've had a moment to review it."
`;
    }

    content += `
================================================================================
6. NEXT MOVE & ACTION PLAN
================================================================================
Recommended Next Move: ${strat?.next_action || 'Schedule follow-up consultation and share live demo.'}
Scheduled Follow-up:   ${strat?.follow_up_date || lead.follow_up_date || 'Within 24-48 Hours'}
Lead Status:           ${lead.opted_out ? 'DO NOT CONTACT (Opted Out)' : (lead.status ? String(lead.status).toUpperCase() : 'ACTIVE')}
`;

    const safeName = (lead.business_name || 'lead').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `Strategy_Proposal_${safeName}.md`;
    downloadTextFile(content, filename);
  } catch (err: any) {
    console.error('Failed to export strategy:', err);
    alert(`Failed to export strategy: ${err.message}`);
  }
}

/**
 * Generates and downloads the Complete 360° Lead Dossier (Data + Calls + Strategy)
 */
export function exportCompleteLeadDossier(lead: Lead) {
  try {
    if (!lead) {
      alert('No lead selected to export dossier.');
      return;
    }
    const callsCount = lead.calls ? lead.calls.length : (lead.calls_count || 0);
    const safeName = (lead.business_name || 'lead').replace(/[^a-z0-9_-]/gi, '_');

    let content = `# COMPLETE LEAD INTELLIGENCE DOSSIER: ${lead.business_name || 'Lead'}
Export Date: ${new Date().toLocaleString()}
System: [AUTOMATED-LEAD-AGENT]

--------------------------------------------------------------------------------
LEAD OVERVIEW
--------------------------------------------------------------------------------
Business Name:     ${lead.business_name || 'N/A'}
Category:          ${lead.category || 'N/A'}
Phone:             ${lead.phone || 'N/A'}
Email:             ${lead.email || 'N/A'}
Website:           ${lead.website || lead.website_url || 'N/A'}
Address:           ${lead.address || (lead.locality ? `${lead.locality}, ${lead.city}` : lead.city) || 'N/A'}
Overall Score:     ${lead.lead_score || lead.overall_score || 0}/100
Lead Status:       ${lead.opted_out ? 'DO NOT CONTACT (Opted Out)' : (lead.status ? String(lead.status).toUpperCase() : 'ACTIVE')}
Do Not Call (DNC): ${lead.opted_out ? 'YES (Client requested not to be called)' : 'NO (Active)'}
Total Calls Held:  ${callsCount}
Next Follow-up:    ${lead.follow_up_date || lead.strategy?.follow_up_date || 'Not scheduled'}

--------------------------------------------------------------------------------
VERIFIED AUDIT & METRICS
--------------------------------------------------------------------------------
Google Rating:     ${lead.rating ? `${lead.rating} ★ (${lead.review_count || 0} reviews)` : 'N/A'}
SEO Score:         ${lead.seo_audit?.score ?? 'N/A'}/100
Mobile Friendly:   ${lead.seo_audit?.mobile_friendly ? 'Yes' : 'No'}
Load Speed:        ${lead.seo_audit?.load_speed_seconds ? `${lead.seo_audit.load_speed_seconds}s` : 'N/A'}
SSL Secure:        ${lead.seo_audit?.has_ssl ? 'Yes' : 'No'}

Social Footprint:
- Instagram:       ${lead.social_footprint?.instagram_url || 'N/A'}
- Facebook:        ${lead.social_footprint?.facebook_url || 'N/A'}
- LinkedIn:        ${lead.social_footprint?.linkedin_url || 'N/A'}

--------------------------------------------------------------------------------
SALES STRATEGY & NEXT MOVE
--------------------------------------------------------------------------------
Next Move:         ${lead.strategy?.next_action || 'Follow up with tailored proposal.'}
Scheduled Followup:${lead.strategy?.follow_up_date || lead.follow_up_date || 'None'}
Pitch Script:
${lead.strategy?.pitch_script || lead.intelligence?.next_sales_pitch_hook || 'Standard Consultative Pitch'}

--------------------------------------------------------------------------------
CALL HISTORY & TRANSCRIPTS (${callsCount} Calls Recorded)
--------------------------------------------------------------------------------
`;

    if (lead.calls && Array.isArray(lead.calls) && lead.calls.length > 0) {
      lead.calls.forEach((c, idx) => {
        const callNum = idx + 1;
        content += `
### Call #${callNum} - ${c.created_at ? new Date(c.created_at).toLocaleString() : 'Recent'}
- Duration: ${c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : '0s'}
- Outcome: ${c.outcome || 'N/A'} | Sentiment: ${c.sentiment || 'N/A'} | Interest: ${c.interest_level || 'N/A'}
- Summary: ${c.summary || 'N/A'}

Transcript:
`;
        if (c.transcript_turns && Array.isArray(c.transcript_turns) && c.transcript_turns.length > 0) {
          c.transcript_turns.forEach(turn => {
            const spk = turn.speaker === 'agent' ? 'Priya (Digital Growth Hub)' : `${lead.business_name || 'Client'}`;
            content += `[${spk}]: ${turn.text}\n`;
          });
        } else {
          content += '(No turns recorded)\n';
        }
        content += `\n--------------------------------------------------------------------------------\n`;
      });
    } else {
      content += 'No call sessions recorded for this lead yet.\n';
    }

    downloadTextFile(content, `Lead_Dossier_${safeName}.md`);
  } catch (err: any) {
    console.error('Failed to export dossier:', err);
    alert(`Failed to export dossier: ${err.message}`);
  }
}
