/** Explicit opt-in migration; never run automatically during application startup. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getPool, transaction, type QuestionnaireDatabase } from "../lib/questionnaire/db";
import { applyQuestionnaireMigration } from "../lib/questionnaire/migration";

async function main() {
    if (!process.argv.includes("--apply")) {
        throw new Error("Use --apply only after setting DATABASE_URL to the intended database.");
    }
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

    const pool = getPool();
    const database: QuestionnaireDatabase = {
        query: (sql, values) => pool.query(sql, values),
        transaction,
    };
    const migrationSql = readFileSync(resolve("drizzle/0038_questionnaire_matching.sql"), "utf8");

    const client = await pool.connect();
    try {
        await client.query("SELECT pg_advisory_lock(3838)");
        const result = await applyQuestionnaireMigration(database, migrationSql);
        console.info("Questionnaire schema and catalogue are ready; feature flags remain unchanged.", result);
    } finally {
        await client.query("SELECT pg_advisory_unlock(3838)");
        client.release();
        await pool.end();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Questionnaire migration failed");
    process.exitCode = 1;
});
