import { Request, Response } from 'express';
import { EmployeesService } from './employees.service';
import { ApiResponse } from '../../core/response/ApiResponse';
import { AppError } from '../../core/errors/AppError';
import { applyProfileAccess, profileAccess } from './profile.visibility';

const service = new EmployeesService();

export const getEmployees = async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const { search, page = 1, limit = 10, status, departmentId, department_id, teamId, team_id } = req.query;
    
    const options = {
        search,
        page: Number(page),
        limit: Number(limit),
        offset: (Number(page) - 1) * Number(limit),
        status,
        departmentId: departmentId || department_id,
        teamId: teamId || team_id
    };

    const data = await service.getEmployees(tenantId, options);
    res.json({
        items: data.items,
        totalItems: data.total,
        totalPages: Math.ceil(data.total / options.limit)
    });
};

export const createEmployee = async (req: Request, res: Response) => {
    const result = await service.createEmployee((req as any).user, req.body);
    res.status(201).json({ success: true, employeeId: result.employeeId });
};

export const getMyProfile = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const profile = await service.getEmployeeProfileByUserIdOrEmail(user?.userId, user?.email, user?.tenantId);
    res.json(applyProfileAccess(profile as any, profileAccess(user, true)));
};

export const updateEmployee = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const tenantId = user?.tenantId;
    const targetId = req.params.id;

    // Check authorization: admin, hr, super_admin OR own profile
    const isHrOrAdmin = ['admin', 'super_admin', 'hr'].includes(user?.role);
    if (!isHrOrAdmin) {
        // Bonus fix (ARC-02 analysis): isEmployeeOwner was called with email in the tenantId position.
        // Correct signature: isEmployeeOwner(employeeId, tenantId, email?, userId?)
        const isOwn = await service.isEmployeeOwner(targetId, tenantId, user?.email, user?.userId);
        if (!isOwn) {
            return res.status(403).json({ success: false, message: 'You are only authorized to update your own profile.' });
        }
        // Filter out restricted corporate fields
        const restricted = ['annual_ctc', 'annualCTC', 'department', 'department_id', 'departmentId', 'position', 'status', 'role', 'join_date', 'joinDate', 'employment_type', 'employmentType'];
        for (const f of restricted) {
            delete req.body[f];
        }
    }

    await service.updateEmployee(targetId, user, req.body);
    res.json({ success: true, message: 'Employee updated successfully.' });
};

/** Education, experience and emergency contacts are personal records: the owner, or someone allowed to update employees. */
const assertMayReadPersonalRecords = async (req: Request): Promise<void> => {
    const user = (req as any).user;
    if (profileAccess(user, false).personal) return;
    if (await service.isEmployeeOwner(req.params.id, user.tenantId, user?.email, user?.userId)) return;
    throw AppError.forbidden('Access denied: these records are private to the employee and HR.');
};

export const getEducation = async (req: Request, res: Response) => {
    await assertMayReadPersonalRecords(req);
    const data = await service.getEducation(req.params.id, (req as any).user.tenantId);
    res.json(data);
};

export const saveEducation = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const isHrOrAdmin = ['admin', 'super_admin', 'hr'].includes(user?.role);
    if (!isHrOrAdmin) {
        const isOwn = await service.isEmployeeOwner(req.params.id, user.tenantId, user?.email, user?.userId);
        if (!isOwn) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const entries = Array.isArray(req.body.entries) ? req.body.entries : (Array.isArray(req.body) ? req.body : []);
    const data = await service.saveEducation(req.params.id, user.tenantId, entries);
    res.json({ success: true, items: data });
};

export const getExperience = async (req: Request, res: Response) => {
    await assertMayReadPersonalRecords(req);
    const data = await service.getExperience(req.params.id, (req as any).user.tenantId);
    res.json(data);
};

export const saveExperience = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const isHrOrAdmin = ['admin', 'super_admin', 'hr'].includes(user?.role);
    if (!isHrOrAdmin) {
        const isOwn = await service.isEmployeeOwner(req.params.id, user.tenantId, user?.email, user?.userId);
        if (!isOwn) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const entries = Array.isArray(req.body.entries) ? req.body.entries : (Array.isArray(req.body) ? req.body : []);
    const data = await service.saveExperience(req.params.id, user.tenantId, entries);
    res.json({ success: true, items: data });
};

export const getEmergencyContacts = async (req: Request, res: Response) => {
    await assertMayReadPersonalRecords(req);
    const data = await service.getEmergencyContacts(req.params.id, (req as any).user.tenantId);
    res.json(data);
};

export const saveEmergencyContacts = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const isHrOrAdmin = ['admin', 'super_admin', 'hr'].includes(user?.role);
    if (!isHrOrAdmin) {
        const isOwn = await service.isEmployeeOwner(req.params.id, user.tenantId, user?.email, user?.userId);
        if (!isOwn) return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    const contacts = Array.isArray(req.body.contacts) ? req.body.contacts : (Array.isArray(req.body) ? req.body : []);
    const data = await service.saveEmergencyContacts(req.params.id, user?.tenantId, contacts);
    res.json({ success: true, items: data });
};

export const bulkUpload = async (req: Request, res: Response) => {
    const result = await service.bulkUpload((req as any).user, req.body.employees);
    res.json({ success: true, ...result });
};

export const checkEmail = async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const { email, name } = req.query;
    const result = await service.checkEmailAvailability(
        tenantId,
        typeof email === 'string' ? email : undefined,
        typeof name === 'string' ? name : undefined
    );
    res.json({ success: true, ...result });
};

export const deleteEmployee = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const tenantId = user.tenantId;
    const { id } = req.params;
    // ARC-02: Pass actor for audit trail. Tenant isolation is enforced in the repository.
    const success = await service.deleteEmployee(id, tenantId, { userId: user.userId, email: user.email });
    if (!success) {
        return res.status(404).json({ success: false, message: 'Employee not found or could not be deleted.' });
    }
    res.json({ success: true, message: 'Employee deleted successfully.' });
};
