import { buildWelcomeAndOfferEmailHtml } from '../src/services/offer-letter';

const html = buildWelcomeAndOfferEmailHtml({
    employeeId: 'EMP013',
    name: 'Sridhar',
    email: 'sridhar02@ozofi.com',
    position: 'Managing Director',
    joinDate: '2026-10-15',
    annualCTC: 1200000,
    logoUrl: 'https://iili.io/ncJqnZG.png',
});

const idx = html.indexOf('table cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#ffffff');
if (idx !== -1) {
    console.log('SUCCESS! Found logo badge HTML:');
    console.log(html.slice(idx, idx + 400));
} else {
    console.error('Logo badge not found in html');
}
