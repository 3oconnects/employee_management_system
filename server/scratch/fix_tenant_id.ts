import { pool } from '../src/config/db';

async function updateTenants() {
    console.log('Normalizing tenant_id in org_nodes and org_governance...');
    const r1 = await pool.query(
        "UPDATE org_nodes SET tenant_id = 'tenant_default' WHERE tenant_id = 'default' OR tenant_id IS NULL"
    );
    console.log('Updated org_nodes:', r1.rowCount);

    const r2 = await pool.query(
        "UPDATE org_governance SET tenant_id = 'tenant_default' WHERE tenant_id = 'default' OR tenant_id IS NULL"
    );
    console.log('Updated org_governance:', r2.rowCount);

    process.exit(0);
}

updateTenants().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
