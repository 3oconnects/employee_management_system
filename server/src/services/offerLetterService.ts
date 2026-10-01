/**
 * Offer Letter Service Facade
 * 
 * Re-exports sub-modules from `./offer-letter/` for clean modular architecture
 * and 100% backward compatibility with existing callers.
 * 
 * Sub-modules:
 *  - types.ts: Interface definitions (OfferLetterData)
 *  - utils.ts: Asset path resolution, base64 encoder, currency & date formatters
 *  - html-document.template.ts: Standalone printable HTML offer document (generateOfferLetterHtml)
 *  - email.template.ts: Welcome & offer email HTML template with credentials card (buildWelcomeAndOfferEmailHtml)
 *  - pdf.generator.ts: 2-page PDFKit vector document generator (generateOfferLetterPdfBuffer)
 */

export * from './offer-letter';
