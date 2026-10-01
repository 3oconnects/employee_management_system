const { pool } = require('../dist/config/db');

async function main() {
    const logoUrl = 'https://iili.io/ncJqnZG.png';

    // 1. Update tenants table
    await pool.query(
        "UPDATE tenants SET logo_url = $1 WHERE id = 'tenant_default'",
        [logoUrl]
    );

    // 2. Update app_config table
    const check = await pool.query(
        "SELECT id FROM app_config WHERE tenant_id = 'tenant_default' AND category = 'general' AND key = 'logo_url'"
    );

    if (check.rows.length > 0) {
        await pool.query(
            "UPDATE app_config SET value = $1, updated_at = NOW() WHERE id = $2",
            [logoUrl, check.rows[0].id]
        );
    } else {
        await pool.query(
            "INSERT INTO app_config (tenant_id, category, key, value, updated_at) VALUES ('tenant_default', 'general', 'logo_url', $1, NOW())",
            [logoUrl]
        );
    }

    console.log('✅ Successfully updated logo_url in tenants and app_config tables!');
    await pool.end();
}

main().catch(err => {
    console.error('Error saving logo URL:', err);
    process.exit(1);
});
