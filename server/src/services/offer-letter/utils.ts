import fs from 'fs';
import path from 'path';
import { OfferLetterData } from './types';

/**
 * Format date nicely, e.g. "30 September 2026"
 */
export function formatDate(dateInput?: string | Date): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Calculate expiry date (default 7 days from issue date)
 */
export function getExpiryDate(issueDate?: string | Date, days = 7): string {
    const d = issueDate ? new Date(issueDate) : new Date();
    const target = isNaN(d.getTime()) ? new Date() : new Date(d);
    target.setDate(target.getDate() + days);
    return target.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Get base64 string of the Ozofi logo for HTML embedding
 */
export function getLogoBase64(): string {
    const logoPaths = [
        path.join(__dirname, '../../../public/Images/logo-removebg-preview.png'),
        path.join(__dirname, '../../../public/Images/logo.png'),
        path.join(process.cwd(), 'public/Images/logo-removebg-preview.png'),
        path.join(process.cwd(), 'public/Images/logo.png'),
    ];

    for (const p of logoPaths) {
        if (fs.existsSync(p)) {
            const data = fs.readFileSync(p);
            return `data:image/png;base64,${data.toString('base64')}`;
        }
    }
    return '';
}

/**
 * Get absolute path of the logo image
 */
export function getLogoPath(): string | null {
    const logoPaths = [
        path.join(__dirname, '../../../public/Images/logo.png'),
        path.join(__dirname, '../../../public/Images/logo-removebg-preview.png'),
        path.join(process.cwd(), 'public/Images/logo.png'),
        path.join(process.cwd(), 'public/Images/logo-removebg-preview.png'),
    ];

    for (const p of logoPaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

/**
 * Formats currency amount in INR
 */
export function formatCompensation(data: OfferLetterData): string {
    const isIntern = (data.employmentType || '').toLowerCase() === 'intern';
    if (isIntern) {
        const stipend = Number(data.internshipStipend) || 0;
        return stipend > 0 ? `₹${stipend.toLocaleString('en-IN')} / month (Stipend)` : 'Fixed Monthly Stipend as per policy';
    }

    const ctc = Number(data.annualCTC) || 0;
    if (ctc > 0) {
        return `₹${ctc.toLocaleString('en-IN')} per annum (CTC)`;
    }
    return 'Competitive Compensation as discussed';
}
