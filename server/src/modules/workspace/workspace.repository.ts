import { pool } from '../../config/db';

const UNDEFINED_TABLE = '42P01';

export class WorkspaceRepository {
    /**
     * Organisation profile values from Settings → General (app_config, category
     * 'general'). Tenant-specific rows win over global (tenant_id IS NULL) rows.
     */
    async getGeneralSettings(tenantId: string, keys: string[]): Promise<Record<string, string>> {
        try {
            const result = await pool.query(
                `SELECT DISTINCT ON (key) key, value
                   FROM app_config
                  WHERE category = 'general' AND key = ANY($2) AND (tenant_id = $1 OR tenant_id IS NULL)
                  ORDER BY key, (tenant_id IS NULL) ASC`,
                [tenantId, keys]
            );
            return Object.fromEntries(result.rows.map((r) => [r.key, r.value ?? '']));
        } catch (err: any) {
            // app_config is created on first save in Settings; before that there is nothing to read.
            if (err?.code === UNDEFINED_TABLE) return {};
            throw err;
        }
    }
}
