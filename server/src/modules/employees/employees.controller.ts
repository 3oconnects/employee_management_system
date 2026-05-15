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

export const updateEmployee = async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    await service.updateEmployee(req.params.id, tenantId, req.body);
    res.json({ success: true, message: 'Employee updated successfully.' });
};

export const bulkUpload = async (req: Request, res: Response) => {
    const tenantId = (req as any).user?.tenantId;
    const result = await service.bulkUpload(tenantId, req.body.employees);
    res.json({ success: true, ...result });
};
