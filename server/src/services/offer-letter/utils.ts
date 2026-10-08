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
 * Calculate expiry date (days after issue date).
 */
export function getExpiryDate(issueDate?: string | Date, days = 7): string {
    const d = issueDate ? new Date(issueDate) : new Date();
    const target = isNaN(d.getTime()) ? new Date() : new Date(d);
    target.setDate(target.getDate() + days);
    return target.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Build a formatted reference number for the offer letter.
 * Example: OZO/HR/OFFER/2026/003
 */
export function buildRefNumber(prefix: string, year: number, employeeId?: string): string {
    const empNum = (employeeId || '001').replace(/[^0-9]/g, '').padStart(3, '0') || '001';
    return `${prefix}/${year}/${empNum}`;
}

/**
 * Resolve base64 string of the company logo for inline HTML embedding.
 * Searches known public asset paths; returns '' if not found.
 */
export function getLogoBase64(): string {
    const candidates = [
        path.join(__dirname, '../../../public/Images/logo-removebg-preview.png'),
        path.join(__dirname, '../../../public/Images/logo.png'),
        path.join(process.cwd(), 'public/Images/logo-removebg-preview.png'),
        path.join(process.cwd(), 'public/Images/logo.png'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
        }
    }
    return '';
}

/**
 * Resolve the absolute path of the company logo file.
 * Returns null if no file is found.
 */
export function getLogoPath(): string | null {
    const candidates = [
        path.join(__dirname, '../../../public/Images/logo.png'),
        path.join(__dirname, '../../../public/Images/logo-removebg-preview.png'),
        path.join(process.cwd(), 'public/Images/logo.png'),
        path.join(process.cwd(), 'public/Images/logo-removebg-preview.png'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

/**
 * Formats compensation as a human-readable string.
 * Reads annualCTC (full-time) or internshipStipend (intern) from OfferLetterData.
 */
export function formatCompensation(data: OfferLetterData): string {
    const isIntern = (data.employmentType || '').toLowerCase() === 'intern';
    if (isIntern) {
        const stipend = Number(data.internshipStipend) || 0;
        return stipend > 0
            ? `₹${stipend.toLocaleString('en-IN')} / month (Stipend)`
            : 'Fixed Monthly Stipend as per policy';
    }
    const ctc = Number(data.annualCTC) || 0;
    return ctc > 0
        ? `₹${ctc.toLocaleString('en-IN')} per annum (CTC)`
        : 'Competitive Compensation as discussed';
}
