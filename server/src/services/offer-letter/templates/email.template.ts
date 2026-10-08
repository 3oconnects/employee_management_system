/**
 * Offer Letter & Onboarding Email Templates Facade
 * 
 * Re-exports domain submodels and specialized template generators:
 * 1. buildWelcomeAndOfferEmailHtml - Executive offer letter & appointment email
 * 2. buildOnboardingCredentialsEmailHtml - Verified employee portal access credentials email
 * 
 * Maintained with 100% backward compatibility for all callers.
 */

export * from './offer-email.submodels';
export { buildWelcomeAndOfferEmailHtml } from './offer-email.template';
export { buildOnboardingCredentialsEmailHtml } from './credentials-email.template';
