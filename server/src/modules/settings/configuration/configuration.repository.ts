import { pool } from '../../../config/db';

export class ConfigurationRepository {
    async ensureAppConfigTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_config (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                category TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(tenant_id, category, key)
            )
        `).catch(() => {});
    }

    async getConfig(tenantId: string) {
        const result = await pool.query(
            `SELECT category, key, value FROM app_config WHERE tenant_id=$1 OR tenant_id IS NULL ORDER BY category, key`,
            [tenantId]
        );
        return result.rows;
    }

    async updateConfig(tenantId: string, category: string, key: string, value: string) {
        await pool.query(
            `INSERT INTO app_config (tenant_id, category, key, value, updated_at)
             VALUES ($1,$2,$3,$4,NOW())
             ON CONFLICT (tenant_id, category, key) DO UPDATE SET value=$4, updated_at=NOW()`,
            [tenantId, category, key, String(value)]
        );
    }
}
