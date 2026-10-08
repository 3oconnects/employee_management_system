import { OfferLetterData } from './types';

export interface RoleScopeDetails {
    categoryName: string;
    primaryDeliverables: string;
    standardsLabel: string;
    professionalStandards: string;
    professionalIntegrity: string;
    keyResponsibilities: string[];
}

/**
 * Checks whether text matches any of the given keywords.
 * For short acronyms (<= 3 chars, e.g. 'hr', 'pr', 'it', 'qa', 'ui', 'ux'),
 * matches only complete token boundaries to prevent substring collisions (e.g. 'product' matching 'pr').
 */
function matchesKeywords(text: string, words: string[]): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const tokens = lower.split(/[^a-z0-9]+/);
    return words.some(w => {
        const lw = w.toLowerCase();
        if (lw.length <= 3) {
            return tokens.includes(lw);
        }
        return lower.includes(lw);
    });
}

/**
 * Dynamically resolves role scope, primary deliverables, and professional standards
 * tailored to the candidate's actual department and position.
 *
 * Avoids default engineering bias when candidates belong to Sales, Marketing, HR,
 * Finance, Operations, Design, Support, Legal, or General Management.
 */
export function getRoleScopeAndStandards(data: Partial<OfferLetterData>): RoleScopeDetails {
    const dept = (data.department || '').trim();
    const pos = (data.position || '').trim();
    const combined = `${dept} ${pos}`.trim();
    const isIntern = (data.employmentType || '').trim().toLowerCase() === 'intern';

    // 1. If explicit custom responsibilities are supplied by the caller, respect them
    if (data.responsibilities && Array.isArray(data.responsibilities) && data.responsibilities.length > 0) {
        return {
            categoryName: dept || 'Designated Role Scope',
            primaryDeliverables: data.responsibilities[0] || 'Execute key deliverables aligning with organizational roadmaps and department commitments.',
            standardsLabel: `${dept || 'Professional'} Standards`,
            professionalStandards: data.responsibilities[1] || 'Uphold the highest benchmarks of functional rigor, disciplined execution, and continuous excellence.',
            professionalIntegrity: data.responsibilities[2] || 'Maintain active ownership, timely execution of commitments, and absolute compliance with organizational governance.',
            keyResponsibilities: data.responsibilities,
        };
    }

    // 2. Product Management / UI/UX Design / Creative
    if (matchesKeywords(combined, ['product', 'design', 'ui', 'ux', 'creative', 'wireframe', 'figma'])) {
        return {
            categoryName: 'Product Management & Design',
            primaryDeliverables: isIntern
                ? 'Support user research, wireframe drafts, design asset creation, and sprint task tracking under design and product leadership.'
                : 'Define user-centric product roadmaps, conduct customer research, craft high-fidelity interface designs, and translate strategic goals into impactful digital experiences.',
            standardsLabel: 'Product & Design Standards',
            professionalStandards: 'Uphold exceptional design craftsmanship, evidence-based user validation, agile sprint discipline, and measurable product metric outcomes.',
            professionalIntegrity: 'Champion user empathy, foster cross-functional synergy with engineering and business stakeholders, and deliver high-utility, intuitive solutions.',
            keyResponsibilities: [
                'Define product specifications, feature user stories, and design wireframes/prototypes.',
                'Conduct user research, usability testing, and analyze behavioral metrics to guide iterations.',
                'Collaborate closely with engineering to ensure faithful design implementation and quality.',
                'Track product release cycles, KPIs, and customer feedback to optimize feature adoption.',
            ],
        };
    }

    // 3. Sales / Business Development / Accounts / Commercial
    if (matchesKeywords(combined, ['sale', 'sales', 'business development', 'commercial', 'revenue', 'bde', 'bdr', 'account executive', 'account manager'])) {
        return {
            categoryName: 'Sales & Business Development',
            primaryDeliverables: isIntern
                ? 'Support market outreach, prospect research, sales pipeline tracking, and client pitch preparation under the guidance of senior business development leads.'
                : 'Drive commercial growth, new client acquisition, strategic deal execution, and revenue pipeline expansion while representing company capabilities to enterprise clients.',
            standardsLabel: 'Commercial & Sales Standards',
            professionalStandards: 'Uphold consultative client engagement, rigorous CRM data discipline, transparent deal forecasting, and strict adherence to commercial compliance and pricing guidelines.',
            professionalIntegrity: 'Maintain high ethical sales practices, foster lasting customer trust, demonstrate proactive deal ownership, and collaborate closely with delivery teams for seamless onboarding.',
            keyResponsibilities: [
                'Identify, qualify, and convert enterprise prospective clients across target business segments.',
                'Manage end-to-end sales cycles from introductory pitches to commercial proposal closure.',
                'Maintain accurate pipeline forecasts and client records in internal CRM systems.',
                'Collaborate with product and delivery teams to ensure customer requirements are delivered.',
            ],
        };
    }

    // 4. Marketing / Growth / Brand / Content / PR / Communications
    if (matchesKeywords(combined, ['marketing', 'brand', 'content', 'copywriter', 'seo', 'social media', 'public relations', 'pr', 'communication', 'communications'])) {
        return {
            categoryName: 'Marketing & Brand Strategy',
            primaryDeliverables: isIntern
                ? 'Assist in content drafting, campaign research, social media engagement, and marketing collateral creation under the direction of marketing leads.'
                : 'Architect and execute multi-channel marketing campaigns, brand identity initiatives, digital acquisition strategies, and high-impact content to accelerate audience growth.',
            standardsLabel: 'Marketing & Brand Standards',
            professionalStandards: 'Ensure brand voice consistency, data-driven performance analytics, ROI-focused campaign execution, creative excellence, and adherence to company communication guidelines.',
            professionalIntegrity: 'Demonstrate creative agility, honest market representation, adherence to consumer privacy standards, and collaborative alignment with sales and product objectives.',
            keyResponsibilities: [
                'Plan and manage multi-channel marketing campaigns across digital and brand touchpoints.',
                'Produce engaging marketing collateral, copy, thought-leadership content, and promotional materials.',
                'Monitor campaign performance, traffic analytics, and conversion metrics to optimize ROI.',
                'Coordinate with internal design and product teams to maintain a cohesive brand voice.',
            ],
        };
    }

    // 5. Human Resources / Talent Acquisition / People Operations / Culture
    if (matchesKeywords(combined, ['human resource', 'human resources', 'hr', 'people', 'talent', 'recruitment', 'recruiter', 'culture'])) {
        return {
            categoryName: 'Human Resources & People Operations',
            primaryDeliverables: isIntern
                ? 'Assist with candidate sourcing, interview scheduling, employee onboarding documentation, and workplace culture activities under HR supervision.'
                : 'Orchestrate end-to-end talent acquisition, seamless employee onboarding, performance management frameworks, employee relations, and progressive workplace culture initiatives.',
            standardsLabel: 'People Operations Standards',
            professionalStandards: 'Maintain strict confidentiality of employee records, empathetic interpersonal communication, statutory labor compliance, and transparent and equitable HR governance.',
            professionalIntegrity: 'Champion organizational values, lead talent development, foster a safe and inclusive working environment, and ensure full adherence to HR governance.',
            keyResponsibilities: [
                'Manage talent acquisition workflows, candidate pipelines, and structured interview loops.',
                'Facilitate welcoming and compliant employee onboarding, orientation, and lifecycle transitions.',
                'Maintain confidential HR records, personnel files, and statutory compliance documentation.',
                'Drive employee engagement programs, workplace wellness initiatives, and culture activities.',
            ],
        };
    }

    // 6. Finance / Accounting / Payroll / Accounts / Audit / Tax
    if (matchesKeywords(combined, ['finance', 'financial', 'account', 'accounting', 'accountant', 'payroll', 'tax', 'taxation', 'audit', 'treasury', 'billing'])) {
        return {
            categoryName: 'Finance & Accounting',
            primaryDeliverables: isIntern
                ? 'Assist in voucher verification, invoice documentation, basic ledger entries, and financial report reconciliations under the finance team’s guidance.'
                : 'Oversee financial planning, ledger accuracy, statutory compliance, budget forecasting, payroll administration, and fiscal risk management for the organization.',
            standardsLabel: 'Financial & Fiscal Standards',
            professionalStandards: 'Adhere strictly to GAAP/IFRS accounting standards, internal audit rigor, statutory tax filing deadlines, and prudent fiscal risk management.',
            professionalIntegrity: 'Maintain absolute confidentiality of financial data, transparent fiscal reporting, zero tolerance for ethical non-compliance, and thorough audit readiness.',
            keyResponsibilities: [
                'Oversee financial ledger accounts, reconciliation of balances, and timely monthly closings.',
                'Manage accounts payable, receivable, expense verifications, and vendor disbursements.',
                'Ensure compliance with statutory tax filings, GST/TDS obligations, and audit standards.',
                'Prepare accurate financial statements, budget reports, and management forecasts.',
            ],
        };
    }

    // 7. Operations / Administration / Facilities / Procurement / Supply Chain / Logistics
    if (matchesKeywords(combined, ['operation', 'operations', 'admin', 'administration', 'facility', 'facilities', 'procurement', 'logistics', 'supply chain'])) {
        return {
            categoryName: 'Operations & Administration',
            primaryDeliverables: isIntern
                ? 'Assist in administrative tasks, facility maintenance coordination, vendor communications, and operational documentation under supervisor direction.'
                : 'Optimize business operations, vendor partnerships, facilities infrastructure, procurement lifecycles, and cross-functional processes for maximum efficiency.',
            standardsLabel: 'Operational Standards',
            professionalStandards: 'Uphold clear standard operating procedures (SOPs), process efficiency benchmarks, cost discipline, and high service level agreement (SLA) adherence.',
            professionalIntegrity: 'Ensure operational resilience, transparent stakeholder reporting, collaborative team support, and strict compliance with health, safety, and workplace standards.',
            keyResponsibilities: [
                'Oversee daily operational workflows, facilities, and general administrative functions.',
                'Manage vendor relationships, procurement contracts, and office resource management.',
                'Implement and optimize standard operating procedures to improve organizational efficiency.',
                'Coordinate cross-departmental administrative requests and ensure SLA fulfillment.',
            ],
        };
    }

    // 8. Customer Success / Support / Client Services
    if (matchesKeywords(combined, ['support', 'customer', 'customer success', 'client success', 'client servicing', 'helpdesk'])) {
        return {
            categoryName: 'Customer Success & Support',
            primaryDeliverables: isIntern
                ? 'Assist with ticket triaging, client query documentation, knowledge base updates, and customer support workflows under team supervision.'
                : 'Ensure exceptional client satisfaction, onboarding guidance, proactive issue resolution, and ongoing customer relationship management to maximize retention.',
            standardsLabel: 'Customer Service Standards',
            professionalStandards: 'Maintain rapid response times, high resolution quality, empathetic communication, comprehensive documentation, and elevated CSAT/NPS ratings.',
            professionalIntegrity: 'Act as the dedicated customer champion, preserve client confidentiality, resolve disputes fairly, and communicate feedback to internal teams.',
            keyResponsibilities: [
                'Serve as the primary support liaison for customer inquiries and issue resolution.',
                'Troubleshoot and resolve support tickets promptly with high accuracy and empathy.',
                'Maintain comprehensive help desk documentation, FAQs, and product knowledge bases.',
                'Monitor customer satisfaction metrics, identify improvements, and advocate for user needs.',
            ],
        };
    }

    // 9. Legal / Compliance / Risk
    if (matchesKeywords(combined, ['legal', 'counsel', 'compliance', 'regulatory', 'attorney', 'risk'])) {
        return {
            categoryName: 'Legal & Corporate Compliance',
            primaryDeliverables: isIntern
                ? 'Assist in contract archiving, statutory filing research, compliance checklist reviews, and legal documentation under legal counsel.'
                : 'Provide strategic legal counsel, draft and review commercial agreements, oversee regulatory compliance, and safeguard organizational legal interests.',
            standardsLabel: 'Legal & Governance Standards',
            professionalStandards: 'Apply meticulous legal diligence, regulatory compliance monitoring, ethical independence, and strict protection of corporate covenants.',
            professionalIntegrity: 'Maintain absolute legal confidentiality, proactive risk mitigation, objective guidance to leadership, and unwavering statutory adherence.',
            keyResponsibilities: [
                'Draft, negotiate, and review commercial contracts, vendor agreements, and NDAs.',
                'Ensure compliance with statutory laws, corporate regulations, and data privacy policies.',
                'Identify legal and regulatory risks and formulate proactive mitigation strategies.',
                'Provide structured counsel on labor, operational, and intellectual property matters.',
            ],
        };
    }

    // 10. Engineering / Technology / Software / Cloud / QA / DevOps / Data / IT (Default Technical)
    if (matchesKeywords(combined, ['engineer', 'engineering', 'developer', 'software', 'backend', 'frontend', 'fullstack', 'full stack', 'devops', 'cloud', 'qa', 'architect', 'data', 'ai', 'ml', 'technology', 'tech', 'it'])) {
        return {
            categoryName: 'Engineering & Technology',
            primaryDeliverables: isIntern
                ? 'Contribute to software development modules, assist in building reliable features, write automated unit tests, and learn engineering best practices under mentor guidance.'
                : 'Design, develop, and deliver robust software systems, modern technical solutions, and scalable digital architectures aligning with company milestones and technical roadmaps.',
            standardsLabel: 'Engineering Standards',
            professionalStandards: 'Uphold the highest benchmarks of technical rigor, software craftsmanship, clean code architecture, comprehensive test coverage, code reviews, and robust system documentation.',
            professionalIntegrity: 'Maintain proactive ownership of technical deliverables, prompt incident resolution, constructive mentorship of peers, and absolute compliance with security protocols and governance.',
            keyResponsibilities: [
                'Design, build, and maintain efficient, reusable, and reliable codebases and technical assets.',
                'Collaborate with cross-functional teams to define, design, and ship new product features.',
                'Participate in code reviews, testing, debugging, and continuous integration workflows.',
                'Ensure optimal performance, quality, and responsiveness of applications and infrastructure.',
            ],
        };
    }

    // 11. General / Executive / Default Fallback (Role-Neutral & Professional)
    return {
        categoryName: dept || 'Professional Operations',
        primaryDeliverables: isIntern
            ? 'Support department initiatives, operational tasks, documentation, and designated projects under assigned supervisor guidance.'
            : 'Execute core operational deliverables, drive strategic departmental initiatives, and achieve designated milestones aligned with organizational goals.',
        standardsLabel: 'Professional Standards',
        professionalStandards: 'Uphold benchmarks of professional excellence, disciplined task ownership, proactive problem-solving, quality documentation, and cross-functional collaboration.',
        professionalIntegrity: 'Maintain active ownership, timely execution of commitments, constructive peer collaboration, and absolute compliance with organizational governance.',
        keyResponsibilities: [
            'Deliver high-quality work aligned with departmental goals and company roadmaps.',
            'Collaborate effectively across cross-functional teams to achieve organizational milestones.',
            'Maintain accurate records, documentation, and reporting of assigned initiatives.',
            'Adhere to all company policies, professional conduct codes, and governance guidelines.',
        ],
    };
}
