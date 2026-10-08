import { OfferLetterData } from '../types';
import { CompanyConfig } from '../config';
import { formatDate, getExpiryDate, formatCompensation, buildRefNumber } from '../utils';
import { getLogoBase64 } from '../utils';
import { getRoleScopeAndStandards } from '../roleScope';

/**
 * Generates the clean, standalone, print-perfect HTML offer letter document.
 * Intended to be embedded in the browser (preview/download) or converted to PDF via Puppeteer.
 */
export function generateOfferLetterHtml(data: OfferLetterData): string {
    const cfg         = CompanyConfig;
    const roleScope   = getRoleScopeAndStandards(data);
    const logoBase64  = data.logoUrl || getLogoBase64();
    const issueDateStr = formatDate(data.issueDate);
    const expiryDateStr = getExpiryDate(data.issueDate, data.expiryDays ?? cfg.defaultExpiryDays);
    const firstName   = data.name.split(' ')[0] || data.name;
    const year        = new Date().getFullYear();
    const refNumber   = buildRefNumber(cfg.refPrefix, year, data.employeeId);
    const location    = data.workLocation  || cfg.defaultWorkLocation;
    const schedule    = data.workSchedule  || cfg.defaultWorkSchedule;
    const reporting   = data.reportingManager || cfg.defaultReportingMgr;
    const compStr     = formatCompensation(data);
    const engType     = (data.employmentType || '').toLowerCase() === 'intern'
        ? 'Internship' : 'Full-time Employment';
    const probation   = data.probationDuration
        || ((data.employmentType || '').toLowerCase() === 'intern' ? '3 Months Internship Period' : '3 Months Probation');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${cfg.name} — Official Offer Letter (${data.name})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.65;
      padding: 40px 20px;
    }
    .offer-page {
      max-width: 820px; margin: 0 auto; background: #fff;
      padding: 56px 64px; border-radius: 20px;
      box-shadow: 0 10px 40px -10px rgba(0,0,0,.08), 0 0 1px 1px rgba(0,0,0,.04);
    }
    /* ── Header ── */
    .brand-header { display:flex; justify-content:space-between; align-items:center;
      border-bottom: 2.5px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 28px; }
    .brand-logo-wrap { display:flex; align-items:center; gap:14px; }
    .brand-logo { height:46px; width:auto; object-fit:contain; }
    .brand-wordmark-title {
      font-family: 'Space Grotesk', sans-serif; font-size: 26px;
      font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .brand-wordmark-tagline { font-size: 10px; font-weight: 700; color: #4338ca;
      text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px; }
    .meta-box { text-align: right; font-size: 12px; color: #64748b; line-height: 1.6; }
    .meta-ref { font-family: monospace; font-size: 11px; color: #334155; font-weight: 700; }
    /* ── Doc badge ── */
    .doc-badge-wrap { display:flex; align-items:center; justify-content:space-between; margin-bottom: 24px; }
    .doc-title { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: 0.06em; text-transform: uppercase; }
    .validity-pill { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 20px;
      padding: 5px 14px; font-size: 12px; font-weight: 700; color: #92400e; }
    /* ── Body ── */
    .recipient-info { margin-bottom: 20px; font-size: 13.5px; color: #334155; line-height: 1.8; }
    .subject-line { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 18px; }
    .letter-body p { font-size: 13.5px; color: #334155; line-height: 1.75; margin-bottom: 12px; }
    /* ── Summary table ── */
    .section-title { font-size: 11px; font-weight: 800; color: #4338ca; text-transform: uppercase;
      letter-spacing: 0.10em; margin: 24px 0 10px; }
    .summary-table { width: 100%; border-collapse: collapse; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 4px; }
    .summary-table td { padding: 10px 16px; font-size: 13px; }
    .summary-table tr:nth-child(even) { background: #f8fafc; }
    .summary-table tr { border-bottom: 1px solid #f1f5f9; }
    .col-label { font-weight: 700; color: #64748b; width: 36%; }
    .col-val   { font-weight: 700; color: #0f172a; }
    /* ── Terms ── */
    .expectations-list, .terms-list { font-size: 13px; color: #334155; padding-left: 20px; line-height: 1.8; }
    .expectations-list li, .terms-list li { margin-bottom: 8px; }
    /* ── Acceptance ── */
    .acceptance-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px;
      padding: 16px 20px; font-size: 13.5px; color: #1e40af; line-height: 1.65; margin: 20px 0; }
    /* ── Signatures ── */
    .signatures-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 24px; padding-top: 20px; border-top: 1.5px solid #e2e8f0; }
    .sig-col { font-size: 13px; color: #334155; line-height: 2; }
    .sig-col strong { color: #0f172a; font-weight: 800; }
    /* ── Footer ── */
    .brand-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9;
      font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="offer-page">
    <!-- Header -->
    <div class="brand-header">
      <div class="brand-logo-wrap">
        ${logoBase64 ? `<img src="${logoBase64}" alt="${cfg.name}" class="brand-logo">` : ''}
        <div>
          <div class="brand-wordmark-title">${cfg.name}</div>
          <div class="brand-wordmark-tagline">${cfg.tagline}</div>
        </div>
      </div>
      <div class="meta-box">
        <div><strong>Date:</strong> ${issueDateStr}</div>
        <div class="meta-ref">${refNumber}</div>
      </div>
    </div>

    <!-- Doc badge -->
    <div class="doc-badge-wrap">
      <div class="doc-title">Offer Letter</div>
      <div class="validity-pill">⏰ Valid Till: ${expiryDateStr}</div>
    </div>

    <!-- Recipient -->
    <div class="recipient-info">
      <p><strong>To,</strong></p>
      <p style="font-size:14px;font-weight:700;color:#0f172a;">${data.name}</p>
      ${data.personalEmail ? `<p>Email: ${data.personalEmail}</p>` : ''}
      ${data.phone        ? `<p>Phone: ${data.phone}</p>` : ''}
      ${location          ? `<p>Location: ${location}</p>` : ''}
    </div>

    <!-- Subject -->
    <div class="subject-line">Subject: Offer of ${engType} — ${cfg.legalName}</div>

    <!-- Opening -->
    <div class="letter-body">
      <p>Dear <strong>${firstName}</strong>,</p>
      <p>
        We are pleased to offer you the position of <strong>${data.position}</strong> at
        <strong>${cfg.legalName}</strong>. Your selection reflects your skills, potential,
        and alignment with our organizational vision.
      </p>
      <p>
        This offer letter outlines the key terms of your association with ${cfg.name}.
        The detailed appointment agreement, company policies, and operational guidelines
        will be shared separately and shall form part of your engagement.
      </p>
    </div>

    <!-- Summary -->
    <div class="section-title">Offer Summary</div>
    <table class="summary-table">
      <tr><td class="col-label">Designation</td>      <td class="col-val">${data.position}</td></tr>
      <tr><td class="col-label">Department</td>       <td class="col-val">${data.department || roleScope.categoryName || 'General Operations'}</td></tr>
      <tr><td class="col-label">Work Location</td>    <td class="col-val">${location}</td></tr>
      <tr><td class="col-label">Reporting To</td>     <td class="col-val">${reporting}</td></tr>
      <tr><td class="col-label">Joining Date</td>     <td class="col-val">${formatDate(data.joinDate)}</td></tr>
      <tr><td class="col-label">Engagement Type</td>  <td class="col-val">${engType}</td></tr>
      <tr><td class="col-label">Work Schedule</td>    <td class="col-val">${schedule}</td></tr>
      <tr><td class="col-label">Probation / Duration</td><td class="col-val">${probation}</td></tr>
      <tr><td class="col-label">Compensation</td>     <td class="col-val" style="color:#4f46e5;font-weight:800;">${compStr}</td></tr>
      <tr style="background:#fffbeb;">
        <td class="col-label" style="color:#92400e;">Offer Valid Till</td>
        <td class="col-val"   style="color:#b45309;font-weight:800;">${expiryDateStr}</td>
      </tr>
    </table>

    <!-- Role Expectations & Responsibilities -->
    <div class="section-title">Role Scope &amp; Responsibilities</div>
    <ul class="expectations-list">
      <li><strong>Primary Deliverables:</strong> ${roleScope.primaryDeliverables}</li>
      <li><strong>${roleScope.standardsLabel}:</strong> ${roleScope.professionalStandards}</li>
      <li><strong>Professional Integrity:</strong> ${roleScope.professionalIntegrity}</li>
    </ul>

    <!-- Terms -->
    <div class="section-title">Terms & Conditions</div>
    <ol class="terms-list">
      <li><strong>Documentation:</strong> This offer is subject to successful verification of identity, qualifications, experience, and any documents requested by ${cfg.name}.</li>
      <li><strong>Confidentiality:</strong> You must not disclose company, client, customer, business methods, proprietary data, designs, code, operational, pricing, or confidential information to any unauthorised person.</li>
      <li><strong>Company Policies:</strong> You are required to follow all current and future company policies, workplace practices, and communication guidelines.</li>
      <li><strong>Intellectual Property:</strong> All deliverables, documentation, work product, inventions, designs, and materials produced during your engagement remain the exclusive property of ${cfg.legalName}.</li>
      <li><strong>Termination:</strong> Either party may end the engagement per the applicable notice period of ${cfg.defaultNoticePeriod}. ${cfg.name} may withdraw this offer if any information provided is false or incomplete.</li>
    </ol>

    <!-- Acceptance -->
    <div class="acceptance-box">
      <strong>Acceptance:</strong> Please sign and return a copy of this offer letter on or before
      <strong>${expiryDateStr}</strong> to confirm your acceptance. We are excited to welcome you to
      ${cfg.name} and look forward to building meaningful work together.
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-col">
        <strong>For ${cfg.legalName}</strong>
        <p>Authorised Signatory</p>
        <p>${cfg.hrSignatory}</p>
        <p>Date: ${issueDateStr}</p>
      </div>
      <div class="sig-col">
        <strong>Accepted and Agreed By Candidate</strong>
        <p>Signature: __________________________</p>
        <p>Name: ${data.name}</p>
        <p>Date: __________________________</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="brand-footer">
      <div>${cfg.name} | ${cfg.industry}</div>
      <div>Confidential offer document issued by ${cfg.legalName}</div>
    </div>
  </div>
</body>
</html>`;
}
