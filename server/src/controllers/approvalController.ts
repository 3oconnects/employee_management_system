import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getPendingApprovals = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT a.*, e.name as employee_name FROM approvals a JOIN employees e ON a.employee_id = e.id WHERE a.status = $1', ['pending']);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const createApprovalRequest = async (req: Request, res: Response) => {
    const { employeeId, type, status = 'pending' } = req.body;
    try {
        const id = `APP-${Date.now()}`;
        await pool.query('INSERT INTO approvals (id, employee_id, type, status) VALUES ($1, $2, $3, $4)', [id, employeeId, type, status]);
        res.status(201).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const updateApprovalAction = async (req: Request, res: Response) => {
    const { id, action } = req.params;
    const status = action === 'approve' ? 'approved' : 'rejected';
    try {
        await pool.query('UPDATE approvals SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};
