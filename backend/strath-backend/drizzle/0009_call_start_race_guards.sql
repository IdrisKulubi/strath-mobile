-- Guard against duplicate legacy chat matches and duplicate open vibe-check sessions
-- that can be created when both participants start the 3-minute call at nearly
-- the same time.

-- 1) Collapse duplicate matches for the same unordered user pair into one
-- canonical row before adding a uniqueness constraint.
WITH ranked_matches AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS row_num
    FROM "matches"
),
duplicate_matches AS (
    SELECT "id" AS duplicate_id, canonical_id
    FROM ranked_matches
    WHERE row_num > 1
)
UPDATE "mutual_matches" AS mm
SET "legacy_match_id" = dm.canonical_id
FROM duplicate_matches AS dm
WHERE mm."legacy_match_id" = dm.duplicate_id;

WITH ranked_matches AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS row_num
    FROM "matches"
),
duplicate_matches AS (
    SELECT "id" AS duplicate_id, canonical_id
    FROM ranked_matches
    WHERE row_num > 1
)
UPDATE "messages" AS msg
SET "match_id" = dm.canonical_id
FROM duplicate_matches AS dm
WHERE msg."match_id" = dm.duplicate_id;

WITH ranked_matches AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS row_num
    FROM "matches"
),
duplicate_matches AS (
    SELECT "id" AS duplicate_id, canonical_id
    FROM ranked_matches
    WHERE row_num > 1
)
UPDATE "match_missions" AS mission
SET "match_id" = dm.canonical_id
FROM duplicate_matches AS dm
WHERE mission."match_id" = dm.duplicate_id;

WITH ranked_matches AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS row_num
    FROM "matches"
),
duplicate_matches AS (
    SELECT "id" AS duplicate_id, canonical_id
    FROM ranked_matches
    WHERE row_num > 1
)
UPDATE "vibe_checks" AS vc
SET "match_id" = dm.canonical_id
FROM duplicate_matches AS dm
WHERE vc."match_id" = dm.duplicate_id;

WITH ranked_matches AS (
    SELECT
        "id",
        FIRST_VALUE("id") OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS canonical_id,
        ROW_NUMBER() OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS row_num
    FROM "matches"
),
duplicate_matches AS (
    SELECT "id" AS duplicate_id, canonical_id
    FROM ranked_matches
    WHERE row_num > 1
)
UPDATE "blind_dates" AS bd
SET "match_id" = dm.canonical_id
FROM duplicate_matches AS dm
WHERE bd."match_id" = dm.duplicate_id;

WITH ranked_matches AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY LEAST("user1_id", "user2_id"), GREATEST("user1_id", "user2_id")
            ORDER BY "created_at" ASC, "id" ASC
        ) AS row_num
    FROM "matches"
)
DELETE FROM "matches" AS m
USING ranked_matches AS rm
WHERE m."id" = rm."id"
  AND rm.row_num > 1;

-- 2) If prior races already created multiple open vibe checks for one canonical
-- match, keep the most recent one and cancel the older open rows.
WITH ranked_open_vibe_checks AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "match_id"
            ORDER BY "created_at" DESC, "id" DESC
        ) AS row_num
    FROM "vibe_checks"
    WHERE "status" IN ('pending', 'scheduled', 'active')
)
UPDATE "vibe_checks" AS vc
SET "status" = 'cancelled',
    "ended_at" = COALESCE(vc."ended_at", now())
FROM ranked_open_vibe_checks AS ranked
WHERE vc."id" = ranked."id"
  AND ranked.row_num > 1;

-- 3) Enforce the new invariants going forward.
CREATE UNIQUE INDEX IF NOT EXISTS "matches_canonical_pair_unique_idx"
    ON "matches" USING btree (
        LEAST("user1_id", "user2_id"),
        GREATEST("user1_id", "user2_id")
    );

CREATE UNIQUE INDEX IF NOT EXISTS "vibe_checks_open_match_unique_idx"
    ON "vibe_checks" USING btree ("match_id")
    WHERE "status" IN ('pending', 'scheduled', 'active');
