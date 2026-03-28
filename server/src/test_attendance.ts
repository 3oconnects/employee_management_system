import { query } from './db/connection';
import bcrypt from 'bcryptjs';

const test = async () => {
    try {
        // Ensure user 1 exists
        const userRes = await query('SELECT * FROM users WHERE id = 1');
        if (userRes.rows.length === 0) {
            console.log('User 1 not found, seeding...');
            const hp = await bcrypt.hash('password', 10);
            await query('INSERT INTO users (id, name, email, password, role) VALUES (1, "Admin", "admin@example.com", $1, "admin")', [hp]);
        }

        console.log('Attempting check-in for user 1...');
        const res = await query(
            'INSERT INTO attendance (user_id, check_in, status) VALUES ($1, NOW(), $2) RETURNING *',
            [1, 'present']
        );
        console.log('Successfully checked in:', res.rows[0]);

        const open = await query(
            'SELECT * FROM attendance WHERE user_id = 1 AND check_out IS NULL'
        );
        console.log('Open session found:', open.rows.length);

        // Cleanup
        await query('DELETE FROM attendance WHERE id = $1', [res.rows[0].id]);
        console.log('Test record cleaned up.');

    } catch (err) {
        console.error('Test failed:', err);
    }
};

test();
