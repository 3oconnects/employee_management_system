/**
 * Company & application configuration for the Offer Letter service.
 *
 * ALL values are sourced from environment variables with safe fallbacks.
 * Never hardcode company-specific strings anywhere else — import from here.
 */

export const CompanyConfig = {
    // ── Brand ──────────────────────────────────────────────────────────────
    name:           process.env.COMPANY_NAME         || 'Ozofi',
    legalName:      process.env.COMPANY_LEGAL_NAME   || 'Ozofi Technologies Private Limited',
    tagline:        process.env.COMPANY_TAGLINE       || 'Building Intelligent Digital Systems',
    industry:       process.env.COMPANY_INDUSTRY      || 'AI Solutions • SaaS Platforms • Business Automation',
    website:        process.env.COMPANY_WEBSITE       || 'https://ozofi.com',

    // ── Headquarters ────────────────────────────────────────────────────────
    hqCity:         process.env.COMPANY_HQ_CITY       || 'Bengaluru',
    hqState:        process.env.COMPANY_HQ_STATE      || 'Karnataka',
    offices:        process.env.COMPANY_OFFICES       || 'Bengaluru & Chennai, India',

    // ── HR / People Ops ─────────────────────────────────────────────────────
    hrTeamName:     process.env.HR_TEAM_NAME          || 'People Operations & Talent Culture',
    hrSignatory:    process.env.HR_SIGNATORY_LABEL    || 'People & Culture Operations',
    hrEmail:        process.env.HR_EMAIL              || process.env.SMTP_FROM || '',

    // ── Defaults for offer letter fields ────────────────────────────────────
    defaultWorkLocation:   process.env.DEFAULT_WORK_LOCATION  || 'Hybrid (Office & Remote)',
    defaultWorkSchedule:   process.env.DEFAULT_WORK_SCHEDULE  || 'Monday – Friday, 9:30 AM – 6:30 PM IST',
    defaultReportingMgr:   process.env.DEFAULT_REPORTING_MGR  || 'Department Head / Operations Lead',
    defaultExpiryDays:     Number(process.env.OFFER_EXPIRY_DAYS) || 7,
    defaultNoticePeriod:   process.env.DEFAULT_NOTICE_PERIOD  || '30 days',

    // ── App URLs ────────────────────────────────────────────────────────────
    appUrl:         process.env.APP_URL               || 'http://localhost:5173',
    loginUrl:       process.env.APP_LOGIN_URL         || (process.env.APP_URL ? `${process.env.APP_URL}/login` : 'http://localhost:5173/login'),
    logoUrl:        process.env.APP_LOGO_URL          || '',

    // ── Ref number prefix ───────────────────────────────────────────────────
    refPrefix:      process.env.OFFER_REF_PREFIX      || 'OZO/HR/OFFER',
} as const;

export type CompanyConfigType = typeof CompanyConfig;
