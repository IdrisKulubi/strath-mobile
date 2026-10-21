import type { QueryResultRow } from "pg";

import { catalogue, questionIdentity, questionPool, validateCatalogue } from "./catalogue";
import type { QuestionnaireDatabase, SqlExecutor } from "./db";

const categories = [
    ["connection", "Connection"],
    ["relationships", "Relationships"],
    ["communication", "Communication"],
    ["lifestyle", "Lifestyle"],
    ["values", "Values"],
] as const;

async function seedCatalogue(executor: SqlExecutor) {
    validateCatalogue();
    for (const [id, title] of categories) {
        await executor.query("INSERT INTO q_categories(id, title) VALUES($1, $2) ON CONFLICT DO NOTHING", [id, title]);
    }
    for (const question of catalogue) {
        const { questionKey, version } = questionIdentity(question.id);
        const values = [
            question.id,
            questionKey,
            version,
            question.categoryId,
            question.prompt,
            JSON.stringify(question.options),
            questionPool(question),
            question.position,
            question.sensitive,
            question.published,
        ];
        const inserted = await executor.query(`
            INSERT INTO q_questions(
                id, question_key, version, category_id, prompt, options,
                pool, position, sensitive, published
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT(id) DO NOTHING
            RETURNING id
        `, values);
        if (inserted.rows.length > 0) continue;
        const existing = await executor.query<QueryResultRow & { matches: boolean }>(`
            SELECT (
                question_key = $2 AND version = $3 AND category_id = $4 AND prompt = $5
                AND options = $6::jsonb AND pool = $7 AND position = $8
                AND sensitive = $9 AND published = $10
            ) AS matches
            FROM q_questions WHERE id = $1
        `, values);
        if (!existing.rows[0]?.matches) {
            throw new Error(`Seed differs from immutable published question ${question.id}; create a new version`);
        }
    }
}

/** Seed an existing questionnaire schema without running schema migrations. */
export async function seedQuestionnaireCatalogue(database: QuestionnaireDatabase) {
    return database.transaction(async (executor) => {
        await seedCatalogue(executor);
        const result = await executor.query<{ count: number } & QueryResultRow>(
            "SELECT count(*)::int AS count FROM q_questions WHERE published",
        );
        return { publishedQuestions: result.rows[0].count };
    });
}

export async function applyQuestionnaireMigration(database: QuestionnaireDatabase, migrationSql: string) {
    return database.transaction(async (executor) => {
        await executor.query(`
            CREATE TABLE IF NOT EXISTS q_migrations (
                name text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        const applied = await executor.query("SELECT name FROM q_migrations WHERE name = $1", ["0038"]);
        if (applied.rows.length === 0) {
            await executor.query(migrationSql);
            await executor.query("INSERT INTO q_migrations(name) VALUES($1)", ["0038"]);
        }
        await seedCatalogue(executor);
        return { migration: "0038", questions: catalogue.length, alreadyApplied: applied.rows.length > 0 };
    });
}

export async function applyDiscoveryMigration(database: QuestionnaireDatabase, migrationSql: string) {
    return database.transaction(async (executor) => {
        await executor.query(`
            CREATE TABLE IF NOT EXISTS q_migrations (
                name text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        const applied = await executor.query("SELECT name FROM q_migrations WHERE name = $1", ["0039"]);
        if (applied.rows.length === 0) {
            await executor.query(migrationSql);
            await executor.query("INSERT INTO q_migrations(name) VALUES($1)", ["0039"]);
        }
        return { migration: "0039", alreadyApplied: applied.rows.length > 0 };
    });
}

export async function applyConnectionsMigration(database: QuestionnaireDatabase, migrationSql: string) {
    return database.transaction(async (executor) => {
        await executor.query(`
            CREATE TABLE IF NOT EXISTS q_migrations (
                name text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);
        const applied = await executor.query("SELECT name FROM q_migrations WHERE name = $1", ["0040"]);
        if (applied.rows.length === 0) {
            await executor.query(migrationSql);
            await executor.query("INSERT INTO q_migrations(name) VALUES($1)", ["0040"]);
        }
        return { migration: "0040", alreadyApplied: applied.rows.length > 0 };
    });
}
