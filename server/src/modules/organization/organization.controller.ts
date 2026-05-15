import { Request, Response } from 'express';
import { OrganizationService } from './organization.service';
import { AuthenticatedRequest } from '../../types';

const service = new OrganizationService();

export const getDepartments = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.getDepartments(tenantId);
    res.json({ success: true, data });
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    await service.createDepartmentRequest(userId, tenantId, req.body);
    res.status(202).json({ success: true, message: 'Department creation request submitted for approval' });
};

export const updateDepartment = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.updateDepartment(req.params.id, req.body, tenantId);
    res.json({ success: true, data });
};

export const deleteDepartment = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.deleteDepartment(req.params.id, tenantId);
    res.json({ success: true, message: 'Department deleted successfully' });
};

export const getTeams = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.getTeams(tenantId, req.query.department_id as string);
    res.json({ success: true, data });
};

export const createTeam = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    await service.createTeamRequest(userId, tenantId, req.body);
    res.status(202).json({ success: true, message: 'Squad creation request submitted for approval' });
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const data = await service.updateTeam(req.params.id, req.body, tenantId);
    res.json({ success: true, data });
};

export const deleteTeam = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    await service.deleteTeam(req.params.id, tenantId);
    res.json({ success: true, message: 'Team deleted successfully' });
};

export const getTeamStatus = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = await service.getTeamStatus(userId, tenantId);
    res.json({ success: true, data });
};
