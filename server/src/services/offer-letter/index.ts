/**
 * Offer Letter Service — Public API
 *
 * Sub-modules:
 *  types.ts          — OfferLetterData interface
 *  config.ts         — CompanyConfig (env-driven, no hardcodes)
 *  utils.ts          — date, currency, logo, refNumber helpers
 *  templates/        — HTML email & document templates
 *  pdf.generator.ts  — PDFKit 2-page vector offer letter
 *
 * Usage:
 *   import { generateOfferLetterHtml, buildWelcomeAndOfferEmailHtml, generateOfferLetterPdfBuffer } from './offer-letter';
 */

// Core
export * from './types';
export * from './config';
export * from './utils';
export * from './roleScope';

// Templates
export { generateOfferLetterHtml, buildWelcomeAndOfferEmailHtml, buildOnboardingCredentialsEmailHtml } from './templates';

// PDF
export * from './pdf.generator';
