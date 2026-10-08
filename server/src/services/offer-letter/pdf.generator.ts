import fs from 'fs';
import PDFDocument from 'pdfkit';
import { OfferLetterData } from './types';
import { CompanyConfig } from './config';
import { formatDate, getExpiryDate, getLogoPath, buildRefNumber } from './utils';
import { getRoleScopeAndStandards } from './roleScope';

/**
 * Generates an executive, 2-page print-perfect vector PDF offer letter buffer using PDFKit.
 * Matches exact corporate branding with complete terms and counter-signatures.
 * All brand parameters, legal names, and defaults come from CompanyConfig (env-driven).
 */
export async function generateOfferLetterPdfBuffer(data: OfferLetterData): Promise<Buffer> {
    const cfg = CompanyConfig;
    const roleScope = getRoleScopeAndStandards(data);
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 40,
            autoFirstPage: true,
            info: {
                Title: `${cfg.name} Official Offer Letter - ${data.name}`,
                Author: `${cfg.name} ${cfg.hrTeamName}`,
                Subject: `Offer of Employment for ${data.name} (${data.employeeId})`,
            }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const issueDateStr = formatDate(data.issueDate);
        const expiryDateStr = getExpiryDate(data.issueDate, data.expiryDays ?? cfg.defaultExpiryDays);
        const firstName = data.name.split(' ')[0] || data.name;
        const year = new Date().getFullYear();
        const refNumber = buildRefNumber(cfg.refPrefix, year, data.employeeId);
        const location = data.workLocation || [data.city, data.state].filter(Boolean).join(', ') || cfg.defaultWorkLocation;
        const engagementTypeStr = (data.employmentType || '').toLowerCase() === 'intern' ? 'Internship' : 'Full-time Employment';

        const isIntern = (data.employmentType || '').toLowerCase() === 'intern';
        let compStr = 'Competitive Compensation';
        if (isIntern) {
            const stipend = Number(data.internshipStipend) || 0;
            compStr = stipend > 0 ? `INR ${stipend.toLocaleString('en-IN')} / month (Stipend)` : 'Fixed Monthly Stipend';
        } else {
            const ctc = Number(data.annualCTC) || 0;
            compStr = ctc > 0 ? `INR ${ctc.toLocaleString('en-IN')} per annum (CTC)` : 'Competitive Compensation';
        }

        const probationStr = data.probationDuration || (isIntern ? '3 Months Internship' : '3 Months Probation');
        const scheduleStr = data.workSchedule || cfg.defaultWorkSchedule;
        const reportingStr = data.reportingManager || cfg.defaultReportingMgr;
        const logoPath = getLogoPath();

        // ══════════════════════════════════════════════════════════
        // PAGE 1: APPOINTMENT & OFFER SUMMARY
        // ══════════════════════════════════════════════════════════

        // Header Top: Logo & Metadata
        if (logoPath && fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, 40, 36, { width: 105 });
            } catch (e) {
                doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(cfg.name.toUpperCase(), 40, 38);
            }
        } else {
            doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(cfg.name.toUpperCase(), 40, 38);
        }

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#4338ca').text(cfg.tagline.toUpperCase(), 40, 80);

        // Header Right: Date & Reference
        doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text(`Date: ${issueDateStr}`, 320, 38, { width: 235, align: 'right' });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(`Ref: ${refNumber}`, 320, 52, { width: 235, align: 'right' });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#b45309').text(`Offer Valid Till: ${expiryDateStr}`, 320, 66, { width: 235, align: 'right' });

        // Dividing rule
        doc.moveTo(40, 96).lineTo(555, 96).strokeColor('#e2e8f0').lineWidth(1.2).stroke();

        // Document Title
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text('OFFER OF EMPLOYMENT', 40, 108, { width: 515, align: 'center' });

        // Recipient block
        doc.rect(40, 132, 515, 62).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b').text('CANDIDATE DETAILS', 52, 140);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(data.name, 52, 153);
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
        const candidateContact = [
            data.personalEmail ? `Email: ${data.personalEmail}` : '',
            data.phone ? `Phone: ${data.phone}` : '',
            location ? `Location: ${location}` : ''
        ].filter(Boolean).join('   |   ');
        doc.text(candidateContact, 52, 172);

        // Subject Line
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1e1b4b').text(`Subject: Official Offer of ${engagementTypeStr} — ${data.position}`, 40, 206);
        doc.moveTo(40, 220).lineTo(555, 220).strokeColor('#f1f5f9').lineWidth(1).stroke();

        // Formal Letter Body
        doc.font('Helvetica').fontSize(9).fillColor('#334155');
        doc.text(`Dear ${firstName},`, 40, 228);

        doc.text(
            `On behalf of ${cfg.legalName}, we are delighted to offer you the position of ${data.position}. Your selection for this key role reflects your proven professional background, domain expertise, and our strong confidence in your capability to drive impactful results and contribute meaningfully to the growth of ${cfg.name}.`,
            40, 244, { width: 515, align: 'justify', lineGap: 3 }
        );

        doc.text(
            `This offer letter outlines the operational and financial terms of your engagement. Upon acceptance, the formal employment agreement and intellectual property covenants will be executed to establish your onboarding.`,
            40, 286, { width: 515, align: 'justify', lineGap: 3 }
        );

        // Offer Summary Header
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('APPOINTMENT & COMPENSATION SUMMARY', 40, 328);
        doc.moveTo(40, 342).lineTo(555, 342).strokeColor('#cbd5e1').lineWidth(1).stroke();

        // Table Rows
        const summaryRows: [string, string][] = [
            ['Official Position', data.position],
            ['Department / Unit', data.department || roleScope.categoryName || 'General Operations'],
            ['Work Location', location],
            ['Reporting Hierarchy', reportingStr],
            ['Effective Date of Joining', formatDate(data.joinDate)],
            ['Nature of Employment', engagementTypeStr],
            ['Total Annual Compensation (CTC)', compStr],
            ['Probation / Review Period', probationStr],
            ['Working Hours & Schedule', scheduleStr],
            ['Offer Acceptance Deadline', expiryDateStr],
        ];

        const tableStartY = 348;
        const rowHeight = 21;
        const totalTableHeight = summaryRows.length * rowHeight;

        // Table background border
        doc.rect(40, tableStartY, 515, totalTableHeight).strokeColor('#cbd5e1').lineWidth(1).stroke();

        summaryRows.forEach(([lbl, val], idx) => {
            const currentY = tableStartY + (idx * rowHeight);
            if (idx % 2 === 1) {
                doc.rect(40.5, currentY, 514, rowHeight).fill('#f8fafc');
            }
            if (idx === 6) { // CTC row highlight
                doc.rect(40.5, currentY, 514, rowHeight).fill('#eef2ff');
            }
            if (idx === summaryRows.length - 1) { // Validity row
                doc.rect(40.5, currentY, 514, rowHeight).fill('#fffbeb');
            }

            // Cell border line
            if (idx < summaryRows.length - 1) {
                doc.moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
            }

            // Divider between columns
            doc.moveTo(215, currentY).lineTo(215, currentY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.8).stroke();

            // Label
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(idx === 6 ? '#3730a3' : idx === summaryRows.length - 1 ? '#92400e' : '#475569')
               .text(lbl, 50, currentY + 6);

            // Value
            doc.font(idx === 6 || idx === summaryRows.length - 1 ? 'Helvetica-Bold' : 'Helvetica')
               .fontSize(idx === 6 ? 9 : 8.5)
               .fillColor(idx === 6 ? '#312e81' : idx === summaryRows.length - 1 ? '#b45309' : '#0f172a')
               .text(val, 225, currentY + 6, { width: 320 });
        });

        // Page 1 Footer
        doc.moveTo(40, 775).lineTo(555, 775).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
           .text(`${cfg.name} | Confidential Employment Offer | Registered People Operations Document`, 40, 782, { width: 380 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b')
           .text('Page 1 of 2', 420, 782, { width: 135, align: 'right' });

        // ══════════════════════════════════════════════════════════
        // PAGE 2: TERMS, CONDITIONS & FORMAL SIGNATURES
        // ══════════════════════════════════════════════════════════
        doc.addPage({ size: 'A4', margin: 40 });

        // Mini Header
        if (logoPath && fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, 40, 36, { width: 75 });
            } catch (e) {
                doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(cfg.name.toUpperCase(), 40, 38);
            }
        } else {
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text(cfg.name.toUpperCase(), 40, 38);
        }
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
           .text(`Offer Letter — ${data.name} | Ref: ${refNumber}`, 140, 42, { width: 260 });
        doc.font('Helvetica').fontSize(8).fillColor('#64748b')
           .text(`Date: ${issueDateStr}`, 400, 42, { width: 155, align: 'right' });
        doc.moveTo(40, 60).lineTo(555, 60).strokeColor('#e2e8f0').lineWidth(1).stroke();

        // 1. Role Scope & Responsibilities
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('1. ROLE SCOPE & RESPONSIBILITIES', 40, 72);
        doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#f1f5f9').lineWidth(0.8).stroke();

        doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
        doc.text(`• Primary Deliverables: ${roleScope.primaryDeliverables}`, 50, 92, { width: 505, lineGap: 2 });
        doc.text(`• ${roleScope.standardsLabel}: ${roleScope.professionalStandards}`, 50, 120, { width: 505, lineGap: 2 });
        doc.text(`• Professional Integrity: ${roleScope.professionalIntegrity}`, 50, 148, { width: 505, lineGap: 2 });

        // 2. Terms & Conditions
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('2. TERMS & CONDITIONS OF APPOINTMENT', 40, 184);
        doc.moveTo(40, 197).lineTo(555, 197).strokeColor('#f1f5f9').lineWidth(0.8).stroke();

        const termsList: [string, string][] = [
            ['Verification of Credentials', 'This appointment is contingent upon comprehensive verification of academic records, prior employment credentials, government identification, and professional references.'],
            ['Confidentiality & Non-Disclosure', 'You shall protect all company, customer, pricing, business methods, proprietary data, designs, codebases, and trade secrets from unauthorized dissemination or disclosure at all times.'],
            ['Intellectual Property', `All deliverables, documentation, work product, inventions, designs, and materials produced in the course of your engagement are the sole, exclusive intellectual property of ${cfg.legalName}.`],
            ['Compliance & Code of Conduct', `You agree to abide by ${cfg.name} corporate policies, security protocols, workplace guidelines, non-solicitation covenants, and operational directives throughout your tenure.`],
            ['Termination & Notice Period', `Either party may initiate resignation or separation subject to the agreed notice period of ${cfg.defaultNoticePeriod} or payment in lieu thereof as governed by company policy. ${cfg.name} reserves the right to terminate engagement immediately in cases of material breach, ethical violations, or document falsification.`]
        ];

        let termY = 205;
        termsList.forEach(([title, desc], i) => {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text(`${i + 1}. ${title}: `, 48, termY, { continued: true });
            doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(desc, { width: 505, align: 'justify', lineGap: 2 });
            termY += (i === termsList.length - 1 ? 40 : 32);
        });

        // 3. Acceptance Callout Box
        const accY = termY + 8;
        doc.rect(40, accY, 515, 36).fillAndStroke('#faf5ff', '#d8b4fe');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#581c87')
           .text(`ACCEPTANCE DEADLINE: Please sign, date, and return a duplicate copy of this letter on or before ${expiryDateStr} to confirm your formal acceptance. We look forward to welcoming you to the ${cfg.name} team.`, 52, accY + 9, { width: 495, lineGap: 2 });

        // 4. Formal Signatures
        const sigTopY = accY + 68;

        // Left Signature: Company
        doc.moveTo(40, sigTopY).lineTo(250, sigTopY).strokeColor('#94a3b8').lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(`For ${cfg.legalName}`, 40, sigTopY + 8);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569').text(cfg.hrSignatory, 40, sigTopY + 22);
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(cfg.hrTeamName, 40, sigTopY + 34);
        doc.text(`Issuance Date: ${issueDateStr}`, 40, sigTopY + 46);

        // Right Signature: Candidate
        doc.moveTo(345, sigTopY).lineTo(555, sigTopY).strokeColor('#94a3b8').lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Accepted & Agreed by Candidate', 345, sigTopY + 8);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569').text(`Name: ${data.name}`, 345, sigTopY + 22);
        doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Candidate Signature: ___________________________', 345, sigTopY + 34);
        doc.text('Date of Acceptance:  ___________________________', 345, sigTopY + 46);

        // Page 2 Footer
        doc.moveTo(40, 775).lineTo(555, 775).strokeColor('#e2e8f0').lineWidth(0.8).stroke();
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
           .text(`${cfg.name} | Confidential Employment Offer | Registered People Operations Document`, 40, 782, { width: 380 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b')
           .text('Page 2 of 2', 420, 782, { width: 135, align: 'right' });

        doc.end();
    });
}
