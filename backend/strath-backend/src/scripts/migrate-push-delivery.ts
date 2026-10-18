import { readFileSync } from "node:fs";
import { getPool } from "../lib/questionnaire/db";

async function main() {
    if (!process.argv.includes('--apply')) {
        console.log('Review drizzle/0041_push_delivery.sql, then run: npx tsx src/scripts/migrate-push-delivery.ts --apply');
        return;
    }
    const pool = getPool();
    try {
        await pool.query(readFileSync('drizzle/0041_push_delivery.sql', 'utf8'));
        console.log('Push delivery migration applied.');
    } finally { await pool.end(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
