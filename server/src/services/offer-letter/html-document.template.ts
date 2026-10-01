import { OfferLetterData } from './types';
import { formatDate, getExpiryDate, getLogoBase64, formatCompensation } from './utils';

/**
 * Generates the clean, standalone, printable Offer Letter HTML document
 */
export function generateOfferLetterHtml(data: OfferLetterData): string {
    const logoBase64 = getLogoBase64();
    const issueDateStr = formatDate(data.issueDate);
    const expiryDateStr = getExpiryDate(data.issueDate, data.expiryDays || 7);
    const firstName = data.name.split(' ')[0] || data.name;
    const year = new Date().getFullYear();
    const empNum = (data.employeeId || '001').replace(/[^0-9]/g, '').padStart(3, '0') || '001';
    const refNumber = `OZO/HR/OFFER/${year}/${empNum}`;

    const location = data.workLocation || [data.city, data.state].filter(Boolean).join(', ') || 'Hybrid / Office';
    const engagementTypeStr = (data.employmentType || '').toLowerCase() === 'intern' ? 'Internship' : 'Full-time Employment';
    const compStr = formatCompensation(data);
    const probationStr = data.probationDuration || ((data.employmentType || '').toLowerCase() === 'intern' ? '3 Months Internship' : '3 Months Probation');
    const scheduleStr = data.workSchedule || 'Monday – Friday, 9:30 AM – 6:30 PM IST';
    const reportingStr = data.reportingManager || 'Engineering & Operations Lead';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ozofi — Official Offer Letter (${data.name})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      padding: 40px 20px;
    }
    
    .offer-page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 56px 64px;
      border-radius: 20px;
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08), 0 0 1px 1px rgba(0,0,0,0.04);
      position: relative;
    }

    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }

    .brand-logo-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }

    .brand-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .brand-tagline {
      font-size: 11px;
      color: #6366f1;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 2px;
    }

    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #64748b;
    }

    .meta-ref {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: #334155;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      display: inline-block;
      margin-top: 4px;
    }

    .doc-badge-wrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .doc-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .validity-pill {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .recipient-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 22px;
      margin-bottom: 24px;
      font-size: 13px;
    }

    .recipient-info p {
      margin-bottom: 3px;
    }

    .subject-line {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
    }

    .letter-body {
      font-size: 13.5px;
      color: #334155;
      margin-bottom: 28px;
    }

    .letter-body p {
      margin-bottom: 14px;
      text-align: justify;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 24px 0 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }

    .summary-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 28px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      font-size: 12.5px;
    }

    .summary-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .summary-table td {
      padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .summary-table tr:last-child td {
      border-bottom: none;
    }

    .summary-table .col-label {
      width: 38%;
      font-weight: 700;
      color: #475569;
    }

    .summary-table .col-val {
      font-weight: 600;
      color: #0f172a;
    }

    .expectations-list, .terms-list {
      padding-left: 20px;
      font-size: 12.5px;
      color: #334155;
      margin-bottom: 24px;
    }

    .expectations-list li, .terms-list li {
      margin-bottom: 8px;
      text-align: justify;
    }

    .acceptance-box {
      background: #faf5ff;
      border: 1px solid #f3e8ff;
      border-radius: 14px;
      padding: 20px 24px;
      margin: 28px 0;
      font-size: 12.5px;
      color: #581c87;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-top: 40px;
      padding-top: 20px;
    }

    .sig-col {
      flex: 1;
      border-top: 2px dashed #cbd5e1;
      padding-top: 14px;
      font-size: 12px;
      color: #475569;
    }

    .sig-col strong {
      display: block;
      color: #0f172a;
      font-size: 13px;
      margin-bottom: 2px;
    }

    .brand-footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .offer-page { box-shadow: none; padding: 30px; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="offer-page">
    <div class="brand-header">
      <div class="brand-logo-wrap">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Ozofi" class="brand-logo"/>` : ''}
        <div>
          <div class="brand-title">Ozofi</div>
          <div class="brand-tagline">Building Intelligent Digital Systems</div>
        </div>
      </div>
      <div class="meta-box">
        <div><strong>Date:</strong> ${issueDateStr}</div>
        <div class="meta-ref">${refNumber}</div>
      </div>
    </div>

    <div class="doc-badge-wrap">
      <div class="doc-title">OFFER LETTER</div>
      <div class="validity-pill">
        <span>⏰ Offer Valid Till: ${expiryDateStr}</span>
      </div>
    </div>

    <div class="recipient-info">
      <p><strong>To,</strong></p>
      <p style="font-size: 14px; font-weight: 700; color: #0f172a;">${data.name}</p>
      ${data.personalEmail ? `<p>Email: ${data.personalEmail}</p>` : ''}
      ${data.phone ? `<p>Phone: ${data.phone}</p>` : ''}
      ${location ? `<p>Address / Location: ${location}</p>` : ''}
    </div>

    <div class="subject-line">
      Subject: Offer of ${engagementTypeStr} with Ozofi
    </div>

    <div class="letter-body">
      <p>Dear <strong>${firstName}</strong>,</p>
      <p>
        We are pleased to offer you the position of <strong>${data.position}</strong> at <strong>Ozofi</strong>.
        Your selection reflects your skills, potential, attitude, and alignment with our mission to build intelligent
        digital systems for modern businesses.
      </p>
      <p>
        This offer letter outlines the key terms of your association with Ozofi. The detailed appointment agreement,
        company policies, confidentiality obligations, and operational guidelines may be shared separately and will form
        part of your engagement with the company.
      </p>
    </div>

    <div class="section-title">Offer Summary</div>
    <table class="summary-table">
      <tr>
        <td class="col-label">Position</td>
        <td class="col-val">${data.position}</td>
      </tr>
      <tr>
        <td class="col-label">Department</td>
        <td class="col-val">${data.department || 'Engineering'}</td>
      </tr>
      <tr>
        <td class="col-label">Work Location</td>
        <td class="col-val">${location}</td>
      </tr>
      <tr>
        <td class="col-label">Reporting To</td>
        <td class="col-val">${reportingStr}</td>
      </tr>
      <tr>
        <td class="col-label">Joining Date</td>
        <td class="col-val">${formatDate(data.joinDate)}</td>
      </tr>
      <tr>
        <td class="col-label">Engagement Type</td>
        <td class="col-val">${engagementTypeStr}</td>
      </tr>
      <tr>
        <td class="col-label">Compensation</td>
        <td class="col-val" style="color: #4f46e5; font-weight: 700;">${compStr}</td>
      </tr>
      <tr>
        <td class="col-label">Probation / Duration</td>
        <td class="col-val">${probationStr}</td>
      </tr>
      <tr>
        <td class="col-label">Work Schedule</td>
        <td class="col-val">${scheduleStr}</td>
      </tr>
      <tr style="background: #fffbeb;">
        <td class="col-label" style="color: #92400e;">Offer Valid Till</td>
        <td class="col-val" style="color: #b45309; font-weight: 800;">${expiryDateStr}</td>
      </tr>
    </table>

    <div class="section-title">Role Expectations</div>
    <ul class="expectations-list">
      <li>You will be responsible for supporting product development, project execution, documentation, research, testing, client deliverables, and other duties aligned with your assigned role and department.</li>
      <li>You are expected to maintain professional discipline, timely communication, ownership of assigned tasks, confidentiality of company and client information, and a learning-first mindset throughout your engagement.</li>
    </ul>

    <div class="section-title">Terms and Conditions</div>
    <ol class="terms-list">
      <li><strong>Documentation:</strong> This offer is subject to successful submission and verification of identity, qualification, address, experience, and any other documents requested by Ozofi.</li>
      <li><strong>Confidentiality:</strong> You must not disclose company, client, product, code, operational, pricing, or business information to any unauthorized person or platform.</li>
      <li><strong>Company Policies:</strong> You will be required to follow all current and future company policies, security practices, attendance expectations, communication guidelines, and work protocols.</li>
      <li><strong>Intellectual Property:</strong> All work, code, designs, documents, strategies, systems, and deliverables created during your engagement will remain the property of Ozofi unless agreed otherwise in writing.</li>
      <li><strong>Termination:</strong> Either party may end the engagement as per the applicable notice period or company policy. Ozofi may withdraw this offer if any information provided is found to be false or incomplete.</li>
    </ol>

    <div class="acceptance-box">
      <strong>Acceptance:</strong> Please sign and return a copy of this offer letter on or before <strong>${expiryDateStr}</strong> to confirm your acceptance. We are excited to welcome you to Ozofi and look forward to building meaningful work together.
    </div>

    <div class="signatures-row">
      <div class="sig-col">
        <strong>For Ozofi</strong>
        <p>Authorized Signatory</p>
        <p>People & Culture Operations</p>
        <p>Date: ${issueDateStr}</p>
      </div>
      <div class="sig-col">
        <strong>Accepted and Agreed By Candidate</strong>
        <p>Signature: __________________________</p>
        <p>Name: ${data.name}</p>
        <p>Date: __________________________</p>
      </div>
    </div>

    <div class="brand-footer">
      <div>Ozofi | AI Solutions • SaaS Platforms • Business Automation</div>
      <div>Confidential offer document issued by Ozofi</div>
    </div>
  </div>
</body>
</html>`;
}
