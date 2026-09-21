import { PGlite } from "@electric-sql/pglite";

import type { QuestionnaireDatabase, SqlExecutor } from "./db";

type PGliteExecutor = Pick<PGlite, "query" | "exec">;

function executor(client: PGliteExecutor): SqlExecutor {
    return {
        async query<T extends import("pg").QueryResultRow = import("pg").QueryResultRow>(sql: string, values: unknown[] = []) {
            if (values.length === 0 && sql.split(";").filter((statement) => statement.trim()).length > 1) {
                const results = await client.exec(sql);
                return { rows: (results.at(-1)?.rows ?? []) as T[] };
            }
            const result = await client.query(sql, values);
            return { rows: result.rows as T[] };
        },
    };
}

export async function createTestDatabase() {
    const pglite = new PGlite();
    await pglite.waitReady;
    const database: QuestionnaireDatabase = {
        ...executor(pglite),
        transaction: (work) => pglite.transaction((tx) => work(executor(tx as unknown as PGliteExecutor))),
        close: () => pglite.close(),
    };
    return { pglite, database };
}

export const legacyTestSchema = `
    CREATE TABLE "user" (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        deleted_at timestamptz
    );
    CREATE TABLE profiles (
        id text PRIMARY KEY,
        user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        first_name text NOT NULL DEFAULT '',
        gender text,
        about_me text,
        photos jsonb,
        profile_photo text,
        university text,
        course text,
        year_of_study integer,
        profile_completed boolean NOT NULL DEFAULT false,
        is_complete boolean NOT NULL DEFAULT false,
        age integer,
        face_verification_status text NOT NULL DEFAULT 'not_started',
        face_verified_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE messages (
        id text PRIMARY KEY,
        sender_id text NOT NULL REFERENCES "user"(id),
        content text NOT NULL
    );
`;
