import { Request, Response } from 'express';
import { EmployeesService } from './employees.service';
import { ApiResponse } from '../../core/response/ApiResponse';

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
    const tenantId = (req as any).user?.tenantId;
    const result = await service.createEmployee(tenantId, req.body);
    res.status(201).json({ success: true, employeeId: result.employeeId });
};

export const getMyProfile = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const profile = await service.getEmployeeProfileByUserIdOrEmail(user?.userId, user?.email, user?.tenantId);
    res.json(profile);
};

export const updateEmployee = async (req: Request, res: Response) => {
    const user = (req as any).user;
    const tenantId = user?.tenantId;
    const targetId = req.params.id;

    // Check authorization: admin, hr, super_admin OR own profile
    const isHrOrAdmin = ['admin', 'super_admin', 'hr'].includes(user?.role);
    if (!isHrOrAdmin) {
        const isOwn = await service.isEmployeeOwner(targetId, user?.email, user?.userId);
        if (!isOwn) {
            return res.status(403).json({ success: false, message: 'You are only authorized to update your own profile.' });
        }
        // Filter out restricted corporate fields
        const restricted = ['annual_ctc', 'annualCTC', 'department', 'department_id', 'departmentId', 'position', 'status', 'role', 'join_date', 'joinDate', 'employment_type', 'employmentType'];
        for (const f of restricted) {
            delete req.body[f];
        }
    }

    await service.updateEmployee(targetId, tenantId, req.body);
    res.json({ success: true, message: 'Employee updated successfully.' });
};

export const getEducation = async (req: Request, res: Response) => {
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
    const tenantId = (req as any).user?.tenantId;
    const result = await service.bulkUpload(tenantId, req.body.employees);
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
    const tenantId = (req as any).user.tenantId;
    const { id } = req.params;
    const success = await service.deleteEmployee(id, tenantId);
    if (!success) {
        return res.status(404).json({ success: false, message: 'Employee not found or could not be deleted.' });
    }
    res.json({ success: true, message: 'Employee deleted successfully.' });
};


