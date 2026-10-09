import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';
import { pool } from '../../config/db';

export interface OfferCandidateRecord {
    id: string;
    tenant_id: string;
    name: string;
    email: string;
    personal_email?: string | null;
    position: string;
    department?: string | null;
    department_name?: string | null;
    employment_type?: string | null;
    annual_ctc?: number | string | null;
    internship_stipend?: number | string | null;
    join_date?: string | null;
    status: string;
    offer_token?: string | null;
    offer_token_expires_at?: string | null;
    offer_accepted_at?: string | null;
    offer_accepted_date?: string | null;
    offer_acceptance_notes?: string | null;
    offer_accepted_via?: string | null;
    reporting_manager_name?: string | null;
    created_at?: string | null;
}

export class OfferAcceptanceRepository {
    /**
     * Generates or fetches an existing active offer token for an employee.
     */
    async ensureOfferToken(employeeId: string, tenantId: string, expiryDays = 7, client?: PoolClient | Pool): Promise<string> {
        const db = client || pool;
        const check = await db.query<{ offer_token: string; offer_token_expires_at: Date }>(
            `SELECT offer_token, offer_token_expires_at FROM employees WHERE id = $1 AND tenant_id = $2`,
            [employeeId, tenantId]
        );

        const existingToken = check.rows[0]?.offer_token;
        const expiresAt = check.rows[0]?.offer_token_expires_at;

        // If active valid token exists, reuse it
        if (existingToken && expiresAt && new Date(expiresAt) > new Date()) {
            return existingToken;
        }

        // Generate a new secure, URL-safe token
        const newToken = crypto.randomBytes(24).toString('hex');
        await db.query(
            `UPDATE employees 
             SET offer_token = $1, 
                 offer_token_expires_at = NOW() + ($2 || ' days')::INTERVAL,
                 updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4`,
            [newToken, expiryDays, employeeId, tenantId]
        );

        return newToken;
    }

    /**
     * Finds a candidate by offer token.
     */
    async findByToken(token: string): Promise<OfferCandidateRecord | null> {
        const cleanToken = (token || '').trim();
        const res = await pool.query<OfferCandidateRecord>(
            `SELECT 
                e.id,
                e.tenant_id,
                e.name,
                e.email,
                e.personal_email,
                e.position,
                e.department,
                COALESCE(d.name, e.department) as department_name,
                e.employment_type,
                e.annual_ctc,
                e.internship_stipend,
                e.join_date,
                e.status,
                e.offer_token,
                e.offer_token_expires_at,
                e.offer_accepted_at,
                e.offer_accepted_date,
                e.offer_acceptance_notes,
                e.offer_accepted_via,
                e.manager_id,
                e.created_at
             FROM employees e
             LEFT JOIN departments d ON d.id::text = e.department_id::text
             WHERE (e.offer_token = $1 OR e.id = $1) AND e.deleted_at IS NULL`,
            [cleanToken]
        );

        return res.rows[0] || null;
    }

    /**
     * Records candidate offer acceptance.
     */
    async recordAcceptance(
        employeeId: string,
        tenantId: string,
        notes?: string,
        acceptedDate?: string
    ): Promise<OfferCandidateRecord> {
        const res = await pool.query<OfferCandidateRecord>(
            `UPDATE employees 
             SET status = 'offer_accepted',
                 offer_accepted_at = NOW(),
                 offer_accepted_date = COALESCE($1::date, CURRENT_DATE),
                 offer_acceptance_notes = $2,
                 offer_accepted_via = 'email',
                 updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4
             RETURNING *`,
            [acceptedDate || null, notes || 'Accepted by candidate via email link', employeeId, tenantId]
        );

        return res.rows[0];
    }
}
