export interface OfferLetterData {
    employeeId: string;
    name: string;
    email: string;
    personalEmail?: string;
    position: string;
    department?: string;
    joinDate?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    employmentType?: string;
    annualCTC?: string | number;
    internshipStipend?: string | number;
    reportingManager?: string;
    workLocation?: string;
    workSchedule?: string;
    probationDuration?: string;
    tempPassword?: string;
    loginUrl?: string;
    issueDate?: string;
    expiryDays?: number;
    logoUrl?: string;
}
