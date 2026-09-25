/** Seed the catalogue into an existing questionnaire schema. No DDL or backfill. */
import { resolve } from "node:path";
import { config } from "dotenv";

import { getPool, transaction, type QuestionnaireDatabase } from "../lib/questionnaire/db";

config({ path: resolve(process.cwd(), ".env.local") });
import { catalogue } from "../lib/questionnaire/catalogue";
import { seedQuestionnaireCatalogue } from "../lib/questionnaire/migration";

async function main() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    const pool = getPool();
    const database: QuestionnaireDatabase = {
        query: (sql, values) => pool.query(sql, values),
        transaction,
    };

    try {
        const schema = await pool.query<{ categories: string | null; questions: string | null }>(
            "SELECT to_regclass('q_categories')::text AS categories, to_regclass('q_questions')::text AS questions",
        );
        if (!schema.rows[0].categories || !schema.rows[0].questions) {
            throw new Error("Questionnaire tables are missing; use the migration runbook first");
        }
        const before = await pool.query<{ total: number; published: number }>(
            "SELECT count(*)::int AS total, count(*) FILTER (WHERE published)::int AS published FROM q_questions",
        );
        if (!process.argv.includes("--apply")) {
            console.info("Dry run: existing questionnaire schema", {
                existingQuestions: before.rows[0].total,
                publishedQuestions: before.rows[0].published,
                catalogueQuestions: catalogue.length,
            });
            return;
        }

        const result = await seedQuestionnaireCatalogue(database);
        console.info("Questionnaire catalogue seeded", {
            before: before.rows[0],
            after: result,
        });
    } finally {
        await pool.end();
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Questionnaire catalogue seed failed");
    process.exitCode = 1;
});
