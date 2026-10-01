import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { sendEmployeeActionNotification } from '../src/services/emailService';

async function main() {
    const targetEmail = process.env.GMAIL_USER || 'sridhar1261@gmail.com';
    console.log(`[TEST] Dispatching promotion test email to ${targetEmail}...`);

    const result = await sendEmployeeActionNotification({
        employeeId: 'EMP012',
        name: 'Sridhar',
        email: targetEmail,
        newPosition: 'Senior Engineering Manager',
        newDepartment: 'AI & Innovation Labs',
        changes: [
            {
                field: 'position',
                label: 'Position / Designation',
                from: 'Team Lead',
                to: 'Senior Engineering Manager',
                isPromotion: true,
            },
            {
                field: 'role',
                label: 'System Access & Role',
                from: 'employee',
                to: 'manager',
                isPromotion: true,
            },
            {
                field: 'department',
                label: 'Department',
                from: 'Engineering',
                to: 'AI & Innovation Labs',
            },
        ],
    });

    if (result) {
        console.log(`[TEST] ✅ Promotion test email successfully sent to ${targetEmail}!`);
    } else {
        console.error(`[TEST] ❌ Failed to dispatch test email.`);
    }
    process.exit(result ? 0 : 1);
}

main().catch(err => {
    console.error('[TEST] ❌ Unexpected error:', err);
    process.exit(1);
});
