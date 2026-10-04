import { EmployeesRepository } from './employees.repository';
import { 
    extractEmployeeProfileUpdates, 
    extractEmployeeUserUpdates, 
    extractEmployeePayrollUpdates 
} from './employees.submodels';
import { PasswordService } from '../../core/security/password.service';
import { 
    sendEmail, 
    buildWelcomeEmail, 
    sendCandidateWelcomeAndOffer,
    sendEmployeeActionNotification,
    EmployeeActionChange
} from '../../services/emailService';
import { NotificationService } from '../../services/notificationService';
import { withTransaction } from '../../database/transaction';
import { AppError } from '../../core/errors/AppError';
import { pool } from '../../config/db';
import { AnalyticsService } from '../../services/analyticsService';

// ─── BULK UPLOAD CONSTANTS ───────────────────────────────────────────────────
//
// Cap reduced from 500 → 50 (Phase 2).
// Rationale: each row spawns a DB transaction + optional email send.
// 500 rows could hold a DB connection pool for ~minutes and OOM the process.
// 50 is safe for a single request; for larger imports, use a background job.
//
const BULK_UPLOAD_MAX_ROWS = 50;

export class EmployeesService {
    private repo: EmployeesRepository;

    constructor() {
        this.repo = new EmployeesRepository();
    }

    async getEmployees(tenantId: string, options: any) {
        return this.repo.findMany(tenantId, options);
    }

    async createEmployee(tenantId: string, data: any) {
        return withTransaction(async (client) => {
            if (data.email) {
                const existingEmp = await client.query(
                    'SELECT id, name, email FROM employees WHERE LOWER(email) = LOWER($1)',
                    [data.email.trim()]
                );
                if (existingEmp.rows.length > 0) {
                    throw AppError.conflict(`An employee with email '${data.email}' already exists (${existingEmp.rows[0].id} - ${existingEmp.rows[0].name}).`);
                }

                const existingUser = await client.query(
                    'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
                    [data.email.trim()]
                );
                if (existingUser.rows.length > 0) {
                    throw AppError.conflict(`A login account with email '${data.email}' already exists.`);
                }
            }

            if (data.personalEmail && data.personalEmail.trim()) {
                const cleanPersonal = data.personalEmail.trim().toLowerCase();
                const existingPersonal = await client.query(
                    'SELECT id, name, email FROM employees WHERE LOWER(email) = $1 OR LOWER(COALESCE(personal_email, \'\')) = $1 LIMIT 1',
                    [cleanPersonal]
                );
                if (existingPersonal.rows.length > 0) {
                    throw AppError.conflict(`Personal email '${data.personalEmail}' is already registered to employee ${existingPersonal.rows[0].id} (${existingPersonal.rows[0].name}).`);
                }

                const existingPersonalUser = await client.query(
                    'SELECT id, name, email FROM users WHERE LOWER(email) = $1 LIMIT 1',
                    [cleanPersonal]
                );
                if (existingPersonalUser.rows.length > 0) {
                    throw AppError.conflict(`Personal email '${data.personalEmail}' is already registered to user account (${existingPersonalUser.rows[0].name}).`);
                }
            }

            // Derive next collision-resistant employee ID
            const lastEmp = await client.query(
                "SELECT id FROM employees WHERE id ~ '^EMP[0-9]+$' ORDER BY CAST(SUBSTRING(id FROM 4) AS INTEGER) DESC LIMIT 1"
            );
            let nextNum = 1;
            if (lastEmp.rows.length > 0) {
                const lastNum = parseInt(lastEmp.rows[0].id.replace('EMP', ''), 10);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
            const newId = `EMP${nextNum.toString().padStart(3, '0')}`;
            
            const empStatus = data.status || 'onboarding';
            const finalPosition = data.position || (data.department ? `${data.department} Staff` : 'Member');
            
            const empParams = [
                newId, data.name, data.email, finalPosition, data.department, data.joinDate, empStatus,
                data.phone, data.dateOfBirth, data.gender, data.personalEmail, data.addressLine1, data.city, data.state, data.pincode,
                data.employmentType || 'full_time', data.reportingManagerId || null, 
                data.departmentId || data.department_id || null, 
                data.team_id || null,
                data.probationEndDate || null,
                data.highestDegree || null, data.fieldOfStudy || null, data.institution || null, data.graduationYear || null,
                JSON.stringify(data.educationHistory || []),
                JSON.stringify(data.experienceHistory || []),
                data.internshipStartDate || null, data.internshipEndDate || null,
                data.internshipStipend ? Number(data.internshipStipend) : null,
                data.internshipSupervisor || null, data.internshipCollege || null,
                tenantId
            ];
            
            await this.repo.createEmployee(client, empParams);

            if (data.email) {
                const tempPassword = Math.random().toString(36).slice(-10).toUpperCase();
                const hashedPassword = await PasswordService.hash(tempPassword);
                
                // Submodel: Role & User account creation
                const roleInfo = await this.repo.ensureRoleExists(client, data.role || 'employee', tenantId);
                await this.repo.createUserAccount(client, data.name, data.email, hashedPassword, roleInfo.name, tenantId, true, roleInfo.id);

                const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/login`;
                
                // Instantly dispatch the official Offer Letter (PDF + HTML)
                // along with welcome message and one-time password to the candidate
                await sendCandidateWelcomeAndOffer({
                    employeeId: newId,
                    name: data.name,
                    email: data.email,
                    personalEmail: data.personalEmail,
                    position: finalPosition,
                    department: data.department,
                    joinDate: data.joinDate,
                    phone: data.phone,
                    address: data.addressLine1,
                    city: data.city,
                    state: data.state,
                    employmentType: data.employmentType,
                    annualCTC: data.annualCTC,
                    internshipStipend: data.internshipStipend,
                    reportingManager: data.reportingManagerName || data.reportingManagerId,
                    tempPassword,
                    loginUrl,
                    issueDate: new Date().toISOString(),
                    expiryDays: 7, // 7 days validity window
                }, tenantId).catch(err => {
                    console.error('[EmployeeService] Failed to send welcome & offer letter email:', err);
                });
            }

            const monthlyGross = (Number(data.annualCTC) || 0) / 12;
            const basic = Math.round(monthlyGross * 0.50);
            const hra = Math.round(monthlyGross * 0.20);
            const allowances = Math.round(monthlyGross * 0.25);
            const bonus = Math.round(monthlyGross * 0.05);

            await this.repo.createPayrollProfile(client, [
                newId, data.name, data.department || 'Unassigned', finalPosition, data.annualCTC, 
                'PENDING', 'New', basic, hra, allowances, bonus, 0, tenantId
            ]);

            NotificationService.onEmployeeCreated(tenantId, data.name, newId);

            return { employeeId: newId };
        });
    }

    async updateEmployee(id: string, tenantId: string, updates: any) {
        return withTransaction(async (client) => {
            const current = await this.repo.findById(id, tenantId);
            if (!current) throw AppError.notFound('Employee');

            // 1. Email check if changing email
            if (updates.email && updates.email.trim().toLowerCase() !== current.email?.toLowerCase()) {
                const existing = await client.query(
                    'SELECT id FROM employees WHERE LOWER(email) = LOWER($1) AND id != $2',
                    [updates.email.trim(), id]
                );
                if (existing.rows.length > 0) {
                    throw AppError.conflict(`Email '${updates.email}' is already in use by employee ${existing.rows[0].id}.`);
                }
            }

            // 2. Submodel: Employee Profile (core employees table fields)
            const profileUpdates = extractEmployeeProfileUpdates(updates);
            if (Object.keys(profileUpdates).length > 0) {
                await this.repo.updateEmployeeProfile(client, id, tenantId, profileUpdates);
            }

            // 3. Submodel: User Account & Roles (users and roles tables)
            const userSubmodel = extractEmployeeUserUpdates(updates);
            const targetEmail = (userSubmodel.email || current.email || '').trim();

            if (userSubmodel.avatarUrl !== undefined && targetEmail) {
                await this.repo.updateUserAvatar(client, targetEmail, userSubmodel.avatarUrl, tenantId);
            }

            if (userSubmodel.email && userSubmodel.email.toLowerCase() !== current.email?.toLowerCase()) {
                await this.repo.updateUserEmail(client, userSubmodel.email, current.email, tenantId);
            }

            if (userSubmodel.role && targetEmail) {
                const roleInfo = await this.repo.ensureRoleExists(client, userSubmodel.role, tenantId);
                await this.repo.updateUserRole(client, targetEmail, roleInfo.name, roleInfo.id, tenantId);
            }

            // 4. Submodel: Payroll & Compensation (payroll_profiles table)
            const payrollUpdates = extractEmployeePayrollUpdates(updates);
            if (
                payrollUpdates.name !== undefined ||
                payrollUpdates.department !== undefined ||
                payrollUpdates.position !== undefined ||
                payrollUpdates.annual_ctc !== undefined ||
                payrollUpdates.department_id !== undefined ||
                payrollUpdates.team_id !== undefined
            ) {
                await this.repo.updatePayrollProfile(client, id, tenantId, [
                    payrollUpdates.name || null,
                    payrollUpdates.department || null,
                    payrollUpdates.position || null,
                    payrollUpdates.annual_ctc || null,
                    payrollUpdates.department_id ?? null,
                    payrollUpdates.team_id ?? null,
                    id,
                    tenantId
                ]);
            }

            // 5. Track career actions (promotions, designation updates, role upgrades, department transfers, compensation increments)
            const changes: EmployeeActionChange[] = [];

            // Position change / Promotion
            if (updates.position && updates.position.trim() && updates.position.trim() !== (current.position || '').trim()) {
                changes.push({
                    field: 'position',
                    label: 'Position / Designation',
                    from: current.position || 'Unassigned',
                    to: updates.position.trim(),
                    isPromotion: true,
                });
            }

            // Role change / System access upgrade
            if (updates.role && updates.role.trim() && updates.role.trim().toLowerCase() !== (current.role || '').trim().toLowerCase()) {
                const isPromo = ['manager', 'admin', 'lead', 'super_admin', 'director', 'head'].some(r => updates.role.toLowerCase().includes(r));
                changes.push({
                    field: 'role',
                    label: 'System Access & Role',
                    from: current.role || 'employee',
                    to: updates.role.trim(),
                    isPromotion: isPromo,
                });
            }

            // Department change / Transfer
            if (updates.department && updates.department.trim() && updates.department.trim().toLowerCase() !== (current.department || current.department_name || '').trim().toLowerCase()) {
                changes.push({
                    field: 'department',
                    label: 'Department',
                    from: current.department || current.department_name || 'Unassigned',
                    to: updates.department.trim(),
                });
            }

            // Employment Status change (e.g. Onboarding -> Active)
            if (updates.status && updates.status.trim() && updates.status.trim().toLowerCase() !== (current.status || '').trim().toLowerCase()) {
                changes.push({
                    field: 'status',
                    label: 'Employment Status',
                    from: current.status || 'Active',
                    to: updates.status.trim(),
                    isPromotion: updates.status.toLowerCase() === 'active' && current.status?.toLowerCase() === 'onboarding',
                });
            }

            // Compensation change
            const newCTC = updates.annualCTC !== undefined ? Number(updates.annualCTC) : (updates.annual_ctc !== undefined ? Number(updates.annual_ctc) : undefined);
            if (newCTC !== undefined && !isNaN(newCTC) && Number(current.annual_ctc) !== newCTC) {
                changes.push({
                    field: 'annual_ctc',
                    label: 'Annual CTC (Gross)',
                    from: current.annual_ctc ? `₹${Number(current.annual_ctc).toLocaleString('en-IN')}` : 'Not Specified',
                    to: `₹${newCTC.toLocaleString('en-IN')}`,
                    isPromotion: newCTC > (Number(current.annual_ctc) || 0),
                });
            }

            // Dispatch instant action / promotion email notification
            if (changes.length > 0) {
                const targetWorkEmail = (updates.email || current.email || '').trim();
                const targetPersonalEmail = current.personal_email || (updates.personalEmail || updates.personal_email || null);
                
                sendEmployeeActionNotification({
                    employeeId: current.id,
                    name: updates.name || current.name,
                    email: targetWorkEmail,
                    personalEmail: targetPersonalEmail,
                    changes,
                    newPosition: updates.position || current.position,
                    newRole: updates.role || current.role,
                    newDepartment: updates.department || current.department,
                    newStatus: updates.status || current.status,
                    tenantId,
                }, tenantId).catch(err => {
                    console.error('[EmployeesService] Failed to send instant promotion/action email:', err);
                });
            }

            return { success: true };
        });
    }

    async bulkUpload(tenantId: string, employees: any[]) {
        // ── Hard cap ─────────────────────────────────────────────────────────
        if (employees.length > BULK_UPLOAD_MAX_ROWS) {
            throw AppError.badRequest(
                `Maximum ${BULK_UPLOAD_MAX_ROWS} employees per bulk upload. ` +
                `Received ${employees.length}. Split into smaller batches.`
            );
        }
        if (employees.length === 0) {
            throw AppError.badRequest('No employee rows provided.');
        }

        const normalizeDate = (val: string | null | undefined): string | null => {
            if (!val || typeof val !== 'string') return null;
            const d = val.trim();
            if (!d) return null;
            const parts = d.split(/[-/]/);
            if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return d;
        };

        // ── Phase 1: Pre-validation pass ─────────────────────────────────────
        // Validate ALL rows before inserting ANY. This prevents partial imports.
        const validationErrors: { row: number; name: string; reason: string }[] = [];
        const emailsSeen = new Set<string>();

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const rowNum = i + 2; // 1-indexed + header row
            const name = emp?.name?.trim() || '';

            if (!name) {
                validationErrors.push({ row: rowNum, name: '(unknown)', reason: 'Name is required' });
                continue;
            }
            if (!emp?.department?.trim()) {
                validationErrors.push({ row: rowNum, name, reason: 'Department is required' });
                continue;
            }
            if (!emp?.joinDate) {
                validationErrors.push({ row: rowNum, name, reason: 'Join Date is required' });
                continue;
            }

            const email = emp?.email?.trim();
            if (email) {
                // Check for duplicate emails within the batch itself
                if (emailsSeen.has(email.toLowerCase())) {
                    validationErrors.push({ row: rowNum, name, reason: `Duplicate email in batch: ${email}` });
                    continue;
                }
                emailsSeen.add(email.toLowerCase());

                // Check for duplicates already in the DB
                const dup = await this.repo.findMany(tenantId, { search: email, limit: 1, offset: 0 });
                if (dup.items.some((e: any) => e.email?.toLowerCase() === email.toLowerCase())) {
                    validationErrors.push({ row: rowNum, name, reason: `Email already exists: ${email}` });
                    continue;
                }
            }
        }

        // ── Abort if ANY row fails validation ────────────────────────────────
        // This avoids partial imports entirely for this batch size.
        if (validationErrors.length > 0) {
            return {
                inserted: 0,
                skipped: validationErrors.length,
                total: employees.length,
                aborted: true,
                message: 'Bulk upload aborted: validation errors found. No rows were inserted.',
                results: validationErrors.map(e => ({ ...e, status: 'skipped' })),
            };
        }

        // ── Phase 2: Insert all valid rows ────────────────────────────────────
        // Each row still runs in its own transaction (createEmployee uses withTransaction).
        // A full single-transaction wrap for all rows is a Phase 3 item because
        // createEmployee also sends emails (side effects outside the transaction).
        const results: any[] = [];
        let inserted = 0;
        let skipped = 0;

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const rowNum = i + 2;

            try {
                emp.joinDate = normalizeDate(emp.joinDate);
                emp.dateOfBirth = normalizeDate(emp.dateOfBirth);

                await this.createEmployee(tenantId, emp);
                results.push({ row: rowNum, name: emp.name, status: 'inserted' });
                inserted++;
            } catch (err: any) {
                results.push({ row: rowNum, name: emp?.name || '(unknown)', status: 'skipped', reason: err.message });
                skipped++;
            }
        }

        return { inserted, skipped, total: employees.length, aborted: false, results };
    }

    async checkEmailAvailability(tenantId: string, email?: string, name?: string) {
        let available = true;
        let conflictWith: any = null;
        let message = 'Email is available.';

        if (email && email.trim()) {
            const cleanEmail = email.trim().toLowerCase();
            const emp = await this.repo.findByAnyEmail(cleanEmail, tenantId);
            if (emp) {
                available = false;
                conflictWith = { id: emp.id, name: emp.name };
                message = `Email is already associated with employee ${emp.id} (${emp.name}) as ${emp.matched_type} email.`;
            } else {
                const user = await this.repo.findUserByEmail(cleanEmail, tenantId);
                if (user) {
                    available = false;
                    if (user.same_tenant) {
                        conflictWith = { id: user.id, name: user.name };
                        message = `Email is already registered to user account (${user.name}).`;
                    } else {
                        // Another organisation's account: say it is taken, never who owns it.
                        message = 'Email is already in use.';
                    }
                }
            }
        }

        // Generate 3 unique suggestions with @ozofi.com if name is provided
        const suggestions: string[] = [];
        if (name && name.trim()) {
            const domain = 'ozofi.com';
            const tokens = name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
            const candidates: string[] = [];
            if (tokens.length === 1) {
                candidates.push(`${tokens[0]}@${domain}`);
                candidates.push(`${tokens[0]}.work@${domain}`);
                candidates.push(`${tokens[0]}01@${domain}`);
                candidates.push(`${tokens[0]}02@${domain}`);
            } else if (tokens.length >= 2) {
                const first = tokens[0];
                const last = tokens[tokens.length - 1];
                candidates.push(`${first}.${last}@${domain}`);
                candidates.push(`${first}@${domain}`);
                if (last.length > 1) {
                    candidates.push(`${first[0]}.${last}@${domain}`);
                }
                candidates.push(`${first}${last}@${domain}`);
                candidates.push(`${first}.${last}01@${domain}`);
            }

            for (const cand of candidates) {
                if (suggestions.length >= 3) break;
                const empExists = await this.repo.findByEmail(cand, tenantId);
                const userExists = await this.repo.findUserByEmail(cand, tenantId);
                if (!empExists && !userExists) {
                    suggestions.push(cand);
                }
            }
        }

        return {
            available,
            conflictWith,
            message,
            suggestions
        };
    }

    async getEmployeeProfileByUserIdOrEmail(userId?: number, email?: string, tenantId?: string) {
        const res = await pool.query(
            `SELECT id FROM employees 
             WHERE (LOWER(email) = LOWER($1) OR user_id = $2 OR (personal_email IS NOT NULL AND LOWER(personal_email) = LOWER($1)))
               AND ($3::text IS NULL OR tenant_id = $3)
             ORDER BY created_at DESC LIMIT 1`,
            [email || '', userId || 0, tenantId || null]
        );
        if (res.rows.length === 0) {
            throw AppError.notFound('Employee profile not found.');
        }
        return AnalyticsService.getEmployeeProfile(res.rows[0].id, tenantId ?? '');
    }

    async isEmployeeOwner(employeeId: string, tenantId: string, email?: string, userId?: number): Promise<boolean> {
        const res = await pool.query(
            `SELECT id FROM employees 
             WHERE id = $1 AND tenant_id = $4 AND (LOWER(email) = LOWER($2) OR user_id = $3 OR (personal_email IS NOT NULL AND LOWER(personal_email) = LOWER($2)))`,
            [employeeId, email || '', userId || 0, tenantId]
        );
        return res.rows.length > 0;
    }

    /** An employee id from another tenant is indistinguishable from one that does not exist (HF-6). */
    async assertEmployeeInTenant(employeeId: string, tenantId: string): Promise<void> {
        if (!(await this.repo.existsInTenant(employeeId, tenantId))) throw AppError.notFound('Employee not found.');
    }

    async getEducation(employeeId: string, tenantId: string) {
        await this.assertEmployeeInTenant(employeeId, tenantId);
        return this.repo.findEducation(employeeId, tenantId);
    }

    async saveEducation(employeeId: string, tenantId: string, entries: any[]) {
        await this.assertEmployeeInTenant(employeeId, tenantId);
        return withTransaction(async (client) => {
            return this.repo.replaceEducation(client, employeeId, tenantId, entries);
        });
    }

    async getExperience(employeeId: string, tenantId: string) {
        await this.assertEmployeeInTenant(employeeId, tenantId);
        return this.repo.findExperience(employeeId, tenantId);
    }

    async saveExperience(employeeId: string, tenantId: string, entries: any[]) {
        await this.assertEmployeeInTenant(employeeId, tenantId);
        return withTransaction(async (client) => {
            return this.repo.replaceExperience(client, employeeId, tenantId, entries);
        });
    }

    async getEmergencyContacts(employeeId: string, tenantId: string) {
        await this.assertEmployeeInTenant(employeeId, tenantId);
        return this.repo.findEmergencyContacts(employeeId, tenantId);
    }

    async saveEmergencyContacts(employeeId: string, tenantId: string, contacts: any[]) {
        await this.assertEmployeeInTenant(employeeId, tenantId);
        return withTransaction(async (client) => {
            return this.repo.replaceEmergencyContacts(client, employeeId, tenantId, contacts);
        });
    }

    async deleteEmployee(employeeId: string, tenantId: string) {
        return this.repo.delete(employeeId, tenantId);
    }
}
