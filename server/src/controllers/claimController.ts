import { Request, Response } from 'express';
import { pool } from '../config/db';

export const submitClaim = async (req: Request, res: Response) => {
    const { employee_id, amount, category, description } = req.body;
    try {
        const id = `CLM-${Date.now()}`;
        await pool.query(
            'INSERT INTO claims (id, employee_id, amount, category, description, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, employee_id, amount, category, description, 'pending']
        );
        res.status(201).json({ success: true, claimId: id });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const getEmployeeClaims = async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM claims WHERE employee_id = $1 ORDER BY created_at DESC', [employeeId]);
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const getAllClaims = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT c.*, e.name as employee_name FROM claims c JOIN employees e ON c.employee_id = e.id ORDER BY c.created_at DESC'
        );
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const updateClaimStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    try {
        await pool.query('UPDATE claims SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};
