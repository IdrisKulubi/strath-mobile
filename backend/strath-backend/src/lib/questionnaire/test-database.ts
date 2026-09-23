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
        push_token text,
        profile_photo text,
        image text,
        last_active timestamptz,
        deleted_at timestamptz,
        deleted_reason text
    );
    CREATE TABLE profiles (
        id text PRIMARY KEY,
        user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        first_name text NOT NULL DEFAULT '',
        gender text,
        bio text,
        about_me text,
        photos jsonb,
        profile_photo text,
        university text,
        course text,
        year_of_study integer,
        profile_completed boolean NOT NULL DEFAULT false,
        is_complete boolean NOT NULL DEFAULT false,
        age integer,
        is_visible boolean NOT NULL DEFAULT true,
        discovery_paused boolean NOT NULL DEFAULT false,
        anonymous boolean NOT NULL DEFAULT false,
        visibility_mode text NOT NULL DEFAULT 'standard',
        incognito_mode boolean NOT NULL DEFAULT false,
        face_verification_status text NOT NULL DEFAULT 'not_started',
        face_verified_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE matches (
        id text PRIMARY KEY,
        user1_id text NOT NULL REFERENCES "user"(id),
        user2_id text NOT NULL REFERENCES "user"(id),
        user1_typing boolean DEFAULT false,
        user2_typing boolean DEFAULT false,
        user1_opened boolean DEFAULT false,
        user2_opened boolean DEFAULT false,
        last_message_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX matches_canonical_pair_unique_idx
        ON matches(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));
    CREATE TABLE messages (
        id text PRIMARY KEY,
        sender_id text NOT NULL REFERENCES "user"(id),
        content text NOT NULL,
        match_id text REFERENCES matches(id),
        status text NOT NULL DEFAULT 'sent',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE mutual_matches (
        id text PRIMARY KEY,
        user_a_id text NOT NULL REFERENCES "user"(id),
        user_b_id text NOT NULL REFERENCES "user"(id),
        status text NOT NULL,
        legacy_match_id text REFERENCES matches(id),
        created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE blocks (
        id text PRIMARY KEY,
        blocker_id text NOT NULL REFERENCES "user"(id),
        blocked_id text NOT NULL REFERENCES "user"(id)
    );
    CREATE TABLE reports (
        id text PRIMARY KEY,
        reporter_id text NOT NULL REFERENCES "user"(id),
        reported_user_id text NOT NULL REFERENCES "user"(id),
        reason text NOT NULL,
        status text NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT now()
    );
`;
