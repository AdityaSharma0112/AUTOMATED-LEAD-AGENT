import { Lead, CallSession, Strategy } from '../types/lead';

/**
 * Trigger download of formatted Microsoft Word (.doc) document in the browser
 */
export function downloadWordDocument(htmlBody: string, filename: string, title: string = 'Document') {
  try {
    const wordDocumentContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      margin: 40px;
    }
    h1 {
      font-size: 20pt;
      color: #1e3a8a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 16px;
      font-weight: bold;
    }
    h2 {
      font-size: 13pt;
      color: #1e40af;
      margin-top: 22px;
      margin-bottom: 8px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h3 {
      font-size: 11.5pt;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
      font-size: 10.5pt;
      vertical-align: top;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
      color: #0f172a;
      width: 25%;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: bold;
      background: #e0e7ff;
      color: #3730a3;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 14px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .pitch-quote {
      border-left: 4px solid #10b981;
      background: #f0fdf4;
      padding: 12px 16px;
      font-style: italic;
      color: #065f46;
      margin: 14px 0;
      font-size: 11pt;
    }
    .dialogue-turn {
      margin-bottom: 8px;
      padding: 8px 12px;
      border-radius: 4px;
    }
    .dialogue-agent {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
    }
    .dialogue-client {
      background: #f0fdf4;
      border-left: 3px solid #10b981;
    }
    .speaker-name {
      font-weight: bold;
      font-size: 9.5pt;
      margin-bottom: 2px;
    }
    .speaker-agent { color: #2563eb; }
    .speaker-client { color: #059669; }
    .footer {
      font-size: 9pt;
      color: #64748b;
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
${htmlBody}
<div class="footer">
  <strong>[AUTOMATED-LEAD-AGENT]</strong> • Generated on ${new Date().toLocaleString()} • Voice Consultant: Priya (Digital Growth Hub)
</div>
</body>
</html>`;

    const blob = new Blob([wordDocumentContent], { type: 'application/msword;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
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
    console.error('Word document export error:', err);
    alert(`Failed to download Word document: ${err.message}`);
  }
}

/**
 * Generates and downloads the Call Record & Conversation Transcript as a Microsoft Word (.doc) document
 */
export function exportCallRecord(lead: Lead, callSession: CallSession | null, callIndex: number = 1) {
  try {
    if (!lead) {
      alert('No lead selected to export call record.');
      return;
    }
    const sess: any = callSession;
    const dateStr = sess?.created_at ? new Date(sess.created_at).toLocaleString() : new Date().toLocaleString();
    const durationStr = sess?.duration_seconds ? `${Math.floor(sess.duration_seconds / 60)}m ${sess.duration_seconds % 60}s` : '0s';
    const isRepeatCall = callIndex > 1;

    let turnsHtml = '';
    if (sess?.transcript_turns && Array.isArray(sess.transcript_turns) && sess.transcript_turns.length > 0) {
      turnsHtml = sess.transcript_turns
        .map((turn: any, i: number) => {
          const isAgent = turn.speaker === 'agent';
          const speaker = isAgent ? 'Priya (Digital Growth Hub)' : (lead.contact_person || lead.business_name || 'Client');
          const time = turn.timestamp ? ` [${turn.timestamp}]` : (turn.created_at ? ` [${new Date(turn.created_at).toLocaleTimeString()}]` : '');
          return `
            <div class="dialogue-turn ${isAgent ? 'dialogue-agent' : 'dialogue-client'}">
              <div class="speaker-name ${isAgent ? 'speaker-agent' : 'speaker-client'}">
                #${i + 1} ${speaker}${time}
              </div>
              <div>"${turn.text}"</div>
            </div>
          `;
        })
        .join('');
    } else {
      turnsHtml = '<p style="color: #64748b; font-style: italic;">No conversation transcript turns recorded for this call session.</p>';
    }

    const htmlBody = `
      <h1>CALL RECORD: ${lead.business_name || 'Client'} (Call #${callIndex})</h1>
      
      <h2>1. Call Metadata & Status</h2>
      <table>
        <tr><th>Client Name</th><td>${lead.business_name || 'N/A'}</td></tr>
        <tr><th>Contact Phone</th><td>${lead.phone || 'N/A'}</td></tr>
        <tr><th>Contact Email</th><td>${lead.email || 'N/A'}</td></tr>
        <tr><th>Call Type</th><td>Call #${callIndex} ${isRepeatCall ? '<span class="badge badge-warning">Repeat / Follow-up Call</span>' : '<span class="badge">Initial Outreach</span>'}</td></tr>
        <tr><th>Call Date & Time</th><td>${dateStr}</td></tr>
        <tr><th>Call Duration</th><td>${durationStr}</td></tr>
        <tr><th>Call Status</th><td><strong>${(sess?.status || 'COMPLETED').toUpperCase()}</strong></td></tr>
        <tr><th>Outcome</th><td>${sess?.outcome ? String(sess.outcome).toUpperCase() : 'N/A'}</td></tr>
        <tr><th>Customer Sentiment</th><td>${sess?.sentiment || 'N/A'}</td></tr>
        <tr><th>Interest Level</th><td>${sess?.interest_level || lead.interest_status || 'N/A'}</td></tr>
        <tr><th>Do Not Call (DNC)</th><td>${lead.opted_out ? '<span class="badge badge-danger">YES - Client Opted Out</span>' : '<span class="badge badge-success">NO - Active</span>'}</td></tr>
        <tr><th>Next Scheduled Follow-up</th><td><strong>${lead.follow_up_date || lead.strategy?.follow_up_date || 'Not Scheduled'}</strong></td></tr>
      </table>

      <h2>2. Call Summary & Recommended Next Action</h2>
      <div class="card">
        <p><strong>Summary:</strong> ${sess?.summary ? sess.summary : 'Call concluded normally.'}</p>
        <p><strong>Recommended Next Move:</strong> ${lead.strategy?.next_action || 'Review conversation insights and arrange follow-up.'}</p>
      </div>

      <h2>3. Full Spoken Dialogue Transcript (Priya &harr; Client)</h2>
      ${turnsHtml}
    `;

    const safeName = (lead.business_name || 'lead').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `Call_Record_Call${callIndex}_${safeName}.doc`;
    downloadWordDocument(htmlBody, filename, `Call Record - ${lead.business_name}`);
  } catch (err: any) {
    console.error('Failed to export call record:', err);
    alert(`Failed to export call record: ${err.message}`);
  }
}

/**
 * Generates and downloads the Sales Pitch Strategy and Proposal as a Microsoft Word (.doc) document
 */
export function exportStrategyProposal(lead: Lead, strategy?: Strategy | null) {
  try {
    if (!lead) {
      alert('No lead selected to export strategy.');
      return;
    }
    const l: any = lead;
    const strat = strategy || l.strategy;
    const dateStr = new Date().toLocaleDateString();

    let packagesHtml = '';
    if (strat?.offer_packages && Array.isArray(strat.offer_packages) && strat.offer_packages.length > 0) {
      packagesHtml = strat.offer_packages
        .map((pkg: any, index: number) => {
          const tierName = pkg.tier || pkg.name || `Package #${index + 1}`;
          const priceVal = pkg.price || 'Contact for pricing';
          const features = pkg.features || pkg.deliverables || [];
          const featuresList = Array.isArray(features) && features.length > 0
            ? features.map((f: any) => `<li>${f}</li>`).join('')
            : '<li>Custom digital presence and automated booking setup</li>';
          return `
            <div class="card" style="margin-bottom: 14px;">
              <h3 style="color: #1e3a8a; margin-top: 0;">Package #${index + 1}: ${String(tierName).toUpperCase()}</h3>
              <p style="font-size: 13pt; font-weight: bold; color: #059669; margin: 4px 0;">Price: ${priceVal}</p>
              <p style="font-weight: bold; margin-bottom: 4px;">Deliverables & Inclusions:</p>
              <ul style="margin-top: 4px;">${featuresList}</ul>
            </div>
          `;
        })
        .join('');
    } else {
      packagesHtml = `
        <div class="card">
          <h3 style="color: #1e3a8a; margin-top: 0;">Standard Growth Package</h3>
          <p style="font-size: 13pt; font-weight: bold; color: #059669; margin: 4px 0;">Price: ₹3,999/month</p>
          <ul>
            <li>Google Maps Top-3 Local Ranking Optimization</li>
            <li>Direct WhatsApp AI Booking Integration (Zero commission)</li>
            <li>Free SSL & Fast Mobile Responsive Landing Page</li>
          </ul>
        </div>
      `;
    }

    let objectionsHtml = '';
    const objections = strat?.objections_and_responses || (strat as any)?.objection_guide;
    if (objections && Array.isArray(objections) && objections.length > 0) {
      objectionsHtml = objections
        .map((guide: any) => `
          <div class="card" style="margin-bottom: 8px;">
            <p style="color: #dc2626; font-weight: bold; margin: 0 0 4px 0;">[Objection]: "${guide.objection || 'Common hesitation'}"</p>
            <p style="color: #059669; margin: 0;"><strong>[Priya's Suggested Response]:</strong> "${guide.response || guide.rebuttal || 'We offer a 14-day zero-risk turnaround guarantee.'}"</p>
          </div>
        `)
        .join('');
    } else {
      objectionsHtml = `
        <div class="card">
          <p style="color: #dc2626; font-weight: bold; margin: 0 0 4px 0;">[Objection]: "We already have an agency / handling this in-house."</p>
          <p style="color: #059669; margin: 0;"><strong>[Priya's Response]:</strong> "That's wonderful! We don't replace your team; we supply high-converting AI automation tools that amplify their results with zero extra hours required."</p>
        </div>
      `;
    }

    const htmlBody = `
      <h1>SALES STRATEGY & PROPOSAL DOSSIER</h1>
      <p style="font-size: 12pt; color: #475569; margin-top: -10px;">
        <strong>Client:</strong> ${l.business_name || 'Valued Business'} &bull; <strong>Prepared By:</strong> Priya (Digital Growth Hub) &bull; <strong>Date:</strong> ${dateStr}
      </p>

      <h2>1. Executive Summary & Target Profile</h2>
      <table>
        <tr><th>Business Name</th><td>${l.business_name || 'N/A'}</td></tr>
        <tr><th>Industry / Niche</th><td>${l.category || 'General Business'}</td></tr>
        <tr><th>Location</th><td>${l.address || (l.locality ? `${l.locality}, ${l.city}` : l.city) || 'N/A'}</td></tr>
        <tr><th>Website Presence</th><td>${l.website || l.website_url || 'Likely Absent / Under-optimized'}</td></tr>
        <tr><th>Phone Contact</th><td>${l.phone || 'N/A'}</td></tr>
        <tr><th>Key Pain Points</th><td>${l.pain_points && Array.isArray(l.pain_points) && l.pain_points.length > 0 ? l.pain_points.join('<br>&bull; ') : 'Under-optimized online visibility, missing local digital capture'}</td></tr>
      </table>

      <h2>2. Problem Statement & Growth Opportunity</h2>
      <div class="card">
        <p><strong>Identified Problem:</strong> ${strat?.problem_statement || 'Business is missing inbound organic leads due to lack of automated local web presence and search discovery.'}</p>
        <p><strong>Digital Growth Opportunity:</strong> ${strat?.opportunity || 'Capture high-intent local customer queries and convert calls into direct bookings 24/7.'}</p>
        ${strat?.fit_rationale ? `<p><strong>Fit Rationale:</strong> ${strat.fit_rationale}</p>` : ''}
      </div>

      <h2>3. Custom Sales Pitch Script (Priya's Playbook)</h2>
      <div class="pitch-quote">
        "${strat?.pitch_script || l.intelligence?.next_sales_pitch_hook || `Hello ${l.contact_person || 'there'}, Priya here from Digital Growth Hub. We noticed your business ${l.business_name || 'here'} has great potential and we'd love to help automate your customer booking and digital visibility!`}"
      </div>

      <h2>4. Tailored Offer Packages & Proposals</h2>
      ${packagesHtml}

      <h2>5. Anticipated Objections & Rebuttal Guide</h2>
      ${objectionsHtml}

      <h2>6. Recommended Next Move & Timeline</h2>
      <table>
        <tr><th>Recommended Next Move</th><td><strong>${strat?.next_action || 'Schedule discovery consultation call.'}</strong></td></tr>
        <tr><th>Scheduled Follow-up</th><td>${strat?.follow_up_date || l.follow_up_date || 'Within 24-48 Hours'}</td></tr>
        <tr><th>Client Status</th><td>${l.opted_out ? '<span class="badge badge-danger">DO NOT CALL (Opted Out)</span>' : '<span class="badge badge-success">ACTIVE PIPELINE</span>'}</td></tr>
      </table>
    `;

    const safeName = (l.business_name || 'lead').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `Strategy_Proposal_${safeName}.doc`;
    downloadWordDocument(htmlBody, filename, `Strategy Proposal - ${l.business_name}`);
  } catch (err: any) {
    console.error('Failed to export strategy proposal:', err);
    alert(`Failed to export strategy proposal: ${err.message}`);
  }
}

/**
 * Generates and downloads the Complete 360° Lead Dossier as a Microsoft Word (.doc) document
 */
export function exportCompleteLeadDossier(lead: Lead) {
  try {
    if (!lead) {
      alert('No lead selected to export dossier.');
      return;
    }
    const l: any = lead;
    const callsCount = l.calls ? l.calls.length : (l.calls_count || 0);
    const dateStr = new Date().toLocaleString();

    let callsHtml = '';
    if (l.calls && Array.isArray(l.calls) && l.calls.length > 0) {
      callsHtml = l.calls
        .map((c: any, idx: number) => {
          const callNum = idx + 1;
          const duration = c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}m ${c.duration_seconds % 60}s` : '0s';
          const callDate = c.created_at ? new Date(c.created_at).toLocaleString() : 'Recent';
          
          let turns = '';
          if (c.transcript_turns && Array.isArray(c.transcript_turns) && c.transcript_turns.length > 0) {
            turns = c.transcript_turns
              .map((t: any) => {
                const isAgent = t.speaker === 'agent';
                const spk = isAgent ? 'Priya (AI Consultant)' : `${l.business_name || 'Client'}`;
                return `<div class="dialogue-turn ${isAgent ? 'dialogue-agent' : 'dialogue-client'}"><strong>${spk}:</strong> "${t.text}"</div>`;
              })
              .join('');
          } else {
            turns = '<p style="color: #64748b; font-style: italic;">No transcript turns recorded for this call.</p>';
          }

          return `
            <div class="card" style="margin-bottom: 16px;">
              <h3 style="color: #1e3a8a; margin-top: 0;">Call #${callNum} &bull; ${callDate}</h3>
              <p><strong>Duration:</strong> ${duration} &bull; <strong>Outcome:</strong> ${c.outcome || 'N/A'} &bull; <strong>Sentiment:</strong> ${c.sentiment || 'N/A'} &bull; <strong>Interest:</strong> ${c.interest_level || 'N/A'}</p>
              <p><strong>Summary:</strong> ${c.summary || 'N/A'}</p>
              <h4 style="margin-bottom: 6px; font-size: 10pt; text-transform: uppercase; color: #475569;">Dialogue Transcript:</h4>
              ${turns}
            </div>
          `;
        })
        .join('');
    } else {
      callsHtml = '<p style="color: #64748b; font-style: italic;">No voice calls recorded for this lead yet.</p>';
    }

    const htmlBody = `
      <h1>COMPLETE 360&deg; LEAD INTELLIGENCE DOSSIER</h1>
      <p style="font-size: 12pt; color: #475569; margin-top: -10px;">
        <strong>Business:</strong> ${l.business_name || 'Lead'} &bull; <strong>Export Date:</strong> ${dateStr} &bull; <strong>System:</strong> [AUTOMATED-LEAD-AGENT]
      </p>

      <h2>1. Verified Lead Profile & Contact Data</h2>
      <table>
        <tr><th>Business Name</th><td><strong>${l.business_name || 'N/A'}</strong></td></tr>
        <tr><th>Category / Niche</th><td>${l.category || 'N/A'}</td></tr>
        <tr><th>Direct Phone</th><td>${l.phone || 'N/A'}</td></tr>
        <tr><th>Email</th><td>${l.email || 'N/A'}</td></tr>
        <tr><th>Website</th><td>${l.website || l.website_url || 'N/A'}</td></tr>
        <tr><th>Address / Locality</th><td>${l.address || (l.locality ? `${l.locality}, ${l.city}` : l.city) || 'N/A'}</td></tr>
        <tr><th>Lead Score</th><td><strong>${l.lead_score || l.overall_score || 0}/100</strong></td></tr>
        <tr><th>Pipeline Status</th><td>${l.opted_out ? '<span class="badge badge-danger">DO NOT CALL (Opted Out)</span>' : '<span class="badge badge-success">ACTIVE PIPELINE</span>'}</td></tr>
        <tr><th>Total Calls Held</th><td>${callsCount} Call${callsCount === 1 ? '' : 's'}</td></tr>
        <tr><th>Next Follow-up</th><td><strong>${l.follow_up_date || l.strategy?.follow_up_date || 'Not scheduled'}</strong></td></tr>
      </table>

      <h2>2. Digital Audit & Verification Intelligence</h2>
      <table>
        <tr><th>Google Rating</th><td>${l.rating ? `${l.rating} ★ (${l.review_count || 0} reviews)` : 'N/A'}</td></tr>
        <tr><th>SEO Score</th><td>${l.seo_audit?.score ?? 'N/A'}/100</td></tr>
        <tr><th>Mobile Friendly</th><td>${l.seo_audit?.mobile_friendly ? 'Yes' : 'No'}</td></tr>
        <tr><th>Load Speed</th><td>${l.seo_audit?.load_speed_seconds ? `${l.seo_audit.load_speed_seconds}s` : 'N/A'}</td></tr>
        <tr><th>SSL Security</th><td>${l.seo_audit?.has_ssl ? 'Secure (HTTPS)' : 'Insecure / Missing SSL'}</td></tr>
        <tr><th>Social Footprint</th><td>Instagram: ${l.social_footprint?.instagram_url || 'N/A'}<br>Facebook: ${l.social_footprint?.facebook_url || 'N/A'}<br>LinkedIn: ${l.social_footprint?.linkedin_url || 'N/A'}</td></tr>
      </table>

      <h2>3. Sales Strategy & Recommended Next Move</h2>
      <div class="card">
        <p><strong>Next Action:</strong> <strong>${l.strategy?.next_action || 'Follow up with tailored proposal.'}</strong></p>
        <p><strong>Follow-up Timeline:</strong> ${l.strategy?.follow_up_date || l.follow_up_date || 'Within 24-48 Hours'}</p>
        <p><strong>Priya's Sales Pitch:</strong></p>
        <div class="pitch-quote">
          "${l.strategy?.pitch_script || l.intelligence?.next_sales_pitch_hook || 'Standard Consultative Pitch'}"
        </div>
      </div>

      <h2>4. Complete Voice Call History & Dialogue Transcripts (${callsCount} Calls Recorded)</h2>
      ${callsHtml}
    `;

    const safeName = (l.business_name || 'lead').replace(/[^a-z0-9_-]/gi, '_');
    const filename = `Lead_Dossier_${safeName}.doc`;
    downloadWordDocument(htmlBody, filename, `Lead Dossier - ${l.business_name}`);
  } catch (err: any) {
    console.error('Failed to export dossier:', err);
    alert(`Failed to export dossier: ${err.message}`);
  }
}
