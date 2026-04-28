import { Request, Response } from 'express';
import { pool } from '../config/db';

/* ── EDUCATION ─────────────────────────────────────────────── */

export const getEducation = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM employee_education WHERE employee_id = $1 ORDER BY created_at ASC',
            [id]
        );
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const upsertEducation = async (req: Request, res: Response) => {
    const { id } = req.params;           // employee_id
    const { entries } = req.body;        // EduEntry[]

    if (!Array.isArray(entries)) {
        return res.status(400).json({ success: false, message: 'entries must be an array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Delete all existing records and replace (full sync)
        await client.query('DELETE FROM employee_education WHERE employee_id = $1', [id]);
        for (const e of entries) {
            if (!e.degree && !e.institution) continue; // skip blanks
            await client.query(
                `INSERT INTO employee_education (employee_id, degree, field, institution, year, grade)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [id, e.degree || null, e.field || null, e.institution || null, e.year || null, e.grade || null]
            );
        }
        await client.query('COMMIT');
        const updated = await pool.query(
            'SELECT * FROM employee_education WHERE employee_id = $1 ORDER BY created_at ASC', [id]
        );
        res.json({ success: true, data: updated.rows });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};

/* ── EXPERIENCE ─────────────────────────────────────────────── */

export const getExperience = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM employee_experience WHERE employee_id = $1 ORDER BY start_date ASC NULLS LAST',
            [id]
        );
        res.json(result.rows);
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const upsertExperience = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
        return res.status(400).json({ success: false, message: 'entries must be an array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM employee_experience WHERE employee_id = $1', [id]);
        for (const e of entries) {
            if (!e.jobTitle && !e.company) continue;
            await client.query(
                `INSERT INTO employee_experience (employee_id, job_title, company, start_date, end_date, is_current, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    id,
                    e.jobTitle   || null,
                    e.company    || null,
                    e.startDate  || null,
                    e.current ? null : (e.endDate || null),
                    e.current    || false,
                    e.description|| null,
                ]
            );
        }
        await client.query('COMMIT');
        const updated = await pool.query(
            'SELECT * FROM employee_experience WHERE employee_id = $1 ORDER BY start_date ASC NULLS LAST', [id]
        );
        res.json({ success: true, data: updated.rows });
    } catch (err: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};
