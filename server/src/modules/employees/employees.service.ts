import { EmployeesRepository } from './employees.repository';
import { PasswordService } from '../../core/security/password.service';
import { sendEmail, buildWelcomeEmail } from '../../services/emailService';
import { NotificationService } from '../../services/notificationService';
import { withTransaction } from '../../database/transaction';
import { AppError } from '../../core/errors/AppError';

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
            const count = await this.repo.countTotalEmployees(client);
            const newId = `EMP${(count + 1).toString().padStart(3, '0')}`;
            
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
                
                await this.repo.createUserAccount(client, data.name, data.email, hashedPassword, 'employee', tenantId);

                const loginUrl = process.env.APP_URL || 'http://localhost:5173';
                await sendEmail({
                    to: data.email,
                    subject: '🎉 Welcome to the Team — Your Account is Ready',
                    html: buildWelcomeEmail({ name: data.name, email: data.email, tempPassword, role: 'employee', loginUrl }),
                    tenantId
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

            const FIELD_MAP: Record<string,string> = {
                personalEmail:      'personal_email',
                dateOfBirth:        'date_of_birth',
                addressLine1:       'address_line1',
                joinDate:           'join_date',
                employmentType:     'employment_type',
                bloodGroup:         'blood_group',
                maritalStatus:      'marital_status',
                educationHistory:   'education_history',
                experienceHistory:  'experience_history',
                reportingManagerId: 'reporting_manager_id',
                annualCTC:          'annual_ctc',
                taxRegime:          'tax_regime',
                bankAccountNumber:  'bank_account_number',
                highestDegree:      'highest_degree',
                fieldOfStudy:       'field_of_study',
                institution:        'institution',
                graduationYear:     'graduation_year',
                internshipStartDate: 'internship_start_date',
                internshipEndDate:   'internship_end_date',
                internshipStipend:   'internship_stipend',
                internshipSupervisor: 'internship_supervisor',
                internshipCollege:    'internship_college',
                department_id:        'department_id',
                team_id:              'team_id',
            };
            const BLOCKED = new Set(['id','created_at','updated_at','tenant_id', 'reportingManagerName']);
            const mapped: Record<string,any> = {};
            for (const [k,v] of Object.entries(updates)) {
                if (BLOCKED.has(k)) continue;
                mapped[FIELD_MAP[k] || k] = (v === "" ? null : v);
            }
            const fields = Object.keys(mapped);
            if (fields.length > 0) {
                const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
                const params = fields.map(f => mapped[f]);
                await this.repo.update(client, id, tenantId, setClause, [...params, id, tenantId]);
            }

            if (updates.name || updates.department || updates.position || updates.annualCTC || updates.annual_ctc || updates.department_id || updates.team_id) {
                await this.repo.updatePayrollProfile(client, id, tenantId, [
                    updates.name, 
                    updates.department, 
                    updates.position, 
                    updates.annualCTC || updates.annual_ctc, 
                    updates.department_id,
                    updates.team_id,
                    id,
                    tenantId
                ]);
            }

            if (updates.email && updates.email !== current.email) {
                await this.repo.updateUserEmail(client, updates.email, current.email, tenantId);
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
}
