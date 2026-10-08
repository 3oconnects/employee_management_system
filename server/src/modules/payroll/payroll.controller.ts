import { Request, Response } from 'express';
import { PayrollService } from './payroll.service';
import { AuthenticatedRequest } from '../../types';
import { AppError } from '../../core/errors/AppError';
import { resolveEmployeeIdForUser } from '../../core/security/identity';

const service = new PayrollService();

export const getPayrollEmployees = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPayrollEmployees(tenantId);
    res.json(result);
};

export const updatePayrollProfile = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    // Nobody sets their own pay: a salary change must be made by someone else.
    const own = await resolveEmployeeIdForUser(tenantId, req.user!.userId, req.user!.email);
    if (own && own === req.params.id) throw AppError.forbidden('You cannot change your own salary structure.');
    await service.updatePayrollProfile(req.params.id, tenantId, req.body);
    res.json({ success: true, message: 'Salary structure updated.' });
};

export const getPayrollRuns = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPayrollRuns(tenantId);
    res.json(result);
};

export const getPayrollActivity = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPayrollActivity(tenantId);
    res.json(result);
};

export const getPendingApprovals = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getPendingApprovals(tenantId);
    res.json(result);
};

export const getLiveSummary = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getLiveSummary(tenantId);
    res.json(result);
};

export const getPayrollDeadlines = async (_req: Request, res: Response) => {
    const result = await service.getPayrollDeadlines();
    res.json(result);
};

export const getTaxSummary = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.getTaxSummary(tenantId);
    res.json(result);
};

export const processPayroll = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { month, year } = req.body;
    const result = await service.processPayroll(tenantId, String(month), String(year));
    res.json({ success: true, ...result });
};

export const createPayrollProfile = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await service.createPayrollProfile(tenantId, req.body);
    res.json({ success: true, ...result });
};

export const getMonthlyPayslip = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { employeeId } = req.params;
    const month = String(req.query.month || new Date().getMonth() + 1);
    const year = String(req.query.year || new Date().getFullYear());

    // Authorization: own payslip or payroll:view / admin / hr
    const own = await resolveEmployeeIdForUser(tenantId, req.user!.userId, req.user!.email);
    const isOwn = own && own === employeeId;
    const hasElevatedAccess = ['admin', 'super_admin', 'hr'].includes(req.user!.role) || req.user!.permissions.includes('payroll:view');
    if (!isOwn && !hasElevatedAccess) {
        throw AppError.forbidden('You can only view your own payslips.');
    }

    const { employee, payroll } = await service.getPayslipData(employeeId, tenantId, month, year);
    const { generatePayslipPDF } = await import('../../utils/pdfGenerator.js');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${employeeId}-${month}-${year}.pdf`);
    generatePayslipPDF(employee, payroll, res);
};

export const getYearlyPayslip = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { employeeId } = req.params;
    const year = String(req.query.year || new Date().getFullYear());

    const own = await resolveEmployeeIdForUser(tenantId, req.user!.userId, req.user!.email);
    const isOwn = own && own === employeeId;
    const hasElevatedAccess = ['admin', 'super_admin', 'hr'].includes(req.user!.role) || req.user!.permissions.includes('payroll:view');
    if (!isOwn && !hasElevatedAccess) {
        throw AppError.forbidden('You can only view your own payslips.');
    }

    const { employee, payroll } = await service.getPayslipData(employeeId, tenantId, 'Yearly', year);
    const { generatePayslipPDF } = await import('../../utils/pdfGenerator.js');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=yearly-statement-${employeeId}-${year}.pdf`);
    generatePayslipPDF(employee, payroll, res);
};

export const getBulkPayslips = async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.user!.tenantId;
    const month = String(req.query.month || new Date().getMonth() + 1);
    const year = String(req.query.year || new Date().getFullYear());

    const buffer = await service.getBulkPayslipsPDF(tenantId, month, year);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bulk-payslips-${month}-${year}.pdf`);
    res.send(buffer);
};
