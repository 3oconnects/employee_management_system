/**
 * Barrel export for all offer-letter templates and email domain submodels.
 */
export { generateOfferLetterHtml } from './html-document.template';
export { 
    buildWelcomeAndOfferEmailHtml, 
    buildOnboardingCredentialsEmailHtml,
    WelcomeOfferEmailSubmodel,
    OnboardingCredentialsSubmodel,
    EmailLetterheadSubmodel,
    EmailSummaryRowSubmodel,
    EmailNextStepSubmodel
} from './email.template';
