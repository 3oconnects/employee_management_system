const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('server/database.sqlite');

db.serialize(() => {
    console.log('--- Database Cleanup Started ---');
    
    // Find records with insane CTC values (e.g., above 100 Crore)
    db.all('SELECT employee_id, annual_ctc FROM payroll_profiles WHERE annual_ctc > 1000000000', (err, rows) => {
        if (err) return console.error(err);
        
        console.log(`Found ${rows.length} absurdly high salary records.`);
        
        if (rows.length > 0) {
            // Cap these to a reasonable test value (e.g., 25 Lacs)
            db.run('UPDATE payroll_profiles SET annual_ctc = 2500000 WHERE annual_ctc > 1000000000', function(err) {
                if (err) return console.error(err);
                console.log(`Successfully sanitized ${this.changes} records.`);
            });
        }
    });
    
    db.close();
});
