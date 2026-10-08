/**
 * Offer Letter & Onboarding Email Domain Submodels
 * 
 * Defines typed submodels and payload interfaces for executive welcome letters,
 * official offers of employment, and onboarding credentials notification emails.
 */

import { OfferLetterData } from '../types';

/**
 * Submodel representing the candidate offer letter email payload.
 */
export type WelcomeOfferEmailSubmodel = OfferLetterData;

/**
 * Submodel representing verified corporate employee portal credentials
 * dispatched post-onboarding approval.
 */
export interface OnboardingCredentialsSubmodel {
    name: string;
    email: string;
    personalEmail?: string | null;
    tempPassword?: string;
    position?: string;
    department?: string;
    loginUrl?: string;
    employeeId?: string;
    logoUrl?: string;
}

/**
 * Submodel for email header letterhead banner styling and metadata.
 */
export interface EmailLetterheadSubmodel {
    companyName: string;
    tagline: string;
    logoUrl?: string;
    refNumber: string;
    dateOrNotice: string;
    categoryBadge: string;
}

/**
 * Submodel for appointment key terms and compensation summary rows.
 */
export interface EmailSummaryRowSubmodel {
    label: string;
    value: string;
    highlight?: boolean;
}

/**
 * Submodel for onboarding checklist or acceptance step rows.
 */
export interface EmailNextStepSubmodel {
    stepNumber: number;
    title: string;
    description: string;
}
