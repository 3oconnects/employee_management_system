import fs from 'fs';
import path from 'path';

async function performAggressiveCleanup() {
    console.log('🧹 Starting Aggressive Legacy Cleanup...');
    const srcDir = path.join(process.cwd(), 'src');
    
    const targetsToRemove = [
        path.join(srcDir, 'routes'),
        path.join(srcDir, 'migrations'), // Contains old backfillGraph.ts
        path.join(srcDir, 'controllers'), // Legacy monolith controllers
        path.join(srcDir, '_legacy_routes')
    ];

    try {
        for (const target of targetsToRemove) {
            if (fs.existsSync(target)) {
                console.log(`🗑️ Removing obsolete path: ${target}...`);
                fs.rmSync(target, { recursive: true, force: true });
                console.log('✅ Removed successfully.');
            } else {
                console.log(`ℹ️ Path already removed or doesn't exist: ${target}`);
            }
        }

        console.log('\n🎉 Aggressive Cleanup complete! Unwanted old files and routes have been removed.');
    } catch (err: any) {
        console.error('❌ Cleanup failed:', err.message);
    }
}

performAggressiveCleanup();
