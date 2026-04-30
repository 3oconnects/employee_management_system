// ── Shared types, constants, and pure helpers (no JSX) ──────────────────
export const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-slate-300";
export const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1";

// export const DEPTS = ['Engineering','Product','Sales','Marketing','HR','Finance','Operations','Design','Support','Legal','Management']; // Deprecated: Now dynamic
export const EMP_TYPES = [
    {value:'full_time', label:'Full-Time'},
    {value:'part_time', label:'Part-Time'},
    {value:'contract',  label:'Contract'},
    {value:'intern',    label:'Intern'},
];
export const DEGREES = ['High School','Diploma',"Bachelor's (B.E / B.Tech / B.Sc)","Bachelor's (B.Com / BBA)","Master's (M.Tech / M.Sc)","Master's (MBA / MCA)",'PhD / Doctorate','Other'];

// ── Form shape types ──
export interface AddEmployeeForm {
    name: string; email: string; phone: string; dateOfBirth: string;
    gender: string; personalEmail: string;
    department: string; // Keep for legacy/string storage
    department_id?: string;
    team_id?: string;
    position: string; joinDate: string;
    employmentType: string; status: string;
    addressLine1: string; city: string; state: string; pincode: string;
    reportingManagerId: string; reportingManagerName: string;
    annualCTC: string; bankAccountNumber: string; taxRegime: string;
    highestDegree: string; fieldOfStudy: string; institution: string; graduationYear: string;
    internshipStartDate: string; internshipEndDate: string;
    internshipStipend: string; internshipSupervisor: string; internshipCollege: string;
}

export interface EditEmployeeForm {
    name: string; email: string; 
    department: string;
    department_id?: string;
    team_id?: string;
    position: string; status: string; joinDate: string;
    reportingManagerId?: string; reportingManagerName?: string;
}

export type EduEntry = { degree: string; field: string; institution: string; year: string; grade: string; };
export type ExpEntry = { jobTitle: string; company: string; startDate: string; endDate: string; current: boolean; description: string; };

export const emptyEdu = (): EduEntry => ({ degree:'', field:'', institution:'', year:'', grade:'' });
export const emptyExp = (): ExpEntry => ({ jobTitle:'', company:'', startDate:'', endDate:'', current:false, description:'' });
