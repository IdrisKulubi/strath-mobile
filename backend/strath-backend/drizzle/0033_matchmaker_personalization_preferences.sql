CREATE TABLE IF NOT EXISTS "matchmaker_user_briefs" (
    "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE cascade,
    "version" integer DEFAULT 0 NOT NULL,
    "latest_change_id" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matchmaker_user_briefs_updated_at_idx"
    ON "matchmaker_user_briefs" ("updated_at");

CREATE TABLE IF NOT EXISTS "matchmaker_user_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "category" text NOT NULL,
    "value" text NOT NULL,
    "normalized_value" text NOT NULL,
    "sentiment" text DEFAULT 'prefer' NOT NULL CHECK ("sentiment" IN ('prefer', 'avoid')),
    "importance" text DEFAULT 'flexible' NOT NULL CHECK ("importance" IN ('must_have', 'prefer', 'flexible')),
    "certainty" text DEFAULT 'inferred' NOT NULL CHECK ("certainty" IN ('confirmed', 'inferred')),
    "source" text DEFAULT 'system' NOT NULL CHECK ("source" IN ('direct', 'feedback', 'migrated_memory', 'system')),
    "status" text DEFAULT 'active' NOT NULL CHECK ("status" IN ('active', 'removed')),
    "version" integer DEFAULT 1 NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matchmaker_user_preferences_user_idx"
    ON "matchmaker_user_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "matchmaker_user_preferences_active_idx"
    ON "matchmaker_user_preferences" ("user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "matchmaker_user_preferences_user_value_unique_idx"
    ON "matchmaker_user_preferences" ("user_id", "category", "normalized_value", "sentiment");

CREATE TABLE IF NOT EXISTS "matchmaker_preference_changes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "operation" text NOT NULL CHECK ("operation" IN ('add', 'update', 'confirm', 'reclassify', 'remove', 'undo', 'migration')),
    "brief_version_before" integer NOT NULL,
    "brief_version_after" integer NOT NULL,
    "before_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "after_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "reversible" boolean DEFAULT true NOT NULL,
    "reverted_by_change_id" uuid,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matchmaker_preference_changes_user_created_idx"
    ON "matchmaker_preference_changes" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "matchmaker_preference_changes_reverted_idx"
    ON "matchmaker_preference_changes" ("reverted_by_change_id");

INSERT INTO "matchmaker_user_briefs" ("user_id", "version", "created_at", "updated_at")
SELECT memory."user_id", 1, now(), now()
FROM "matchmaker_user_memory" memory
WHERE COALESCE(memory."positive_signals", '{}'::jsonb) <> '{}'::jsonb
   OR COALESCE(memory."negative_signals", '{}'::jsonb) <> '{}'::jsonb
ON CONFLICT ("user_id") DO NOTHING;

WITH legacy_signals AS (
    SELECT
        memory."user_id",
        'prefer'::text AS sentiment,
        signal.key AS raw_key,
        signal.value AS weight
    FROM "matchmaker_user_memory" memory,
         LATERAL jsonb_each_text(memory."positive_signals") signal
    UNION ALL
    SELECT
        memory."user_id",
        'avoid'::text AS sentiment,
        signal.key AS raw_key,
        signal.value AS weight
    FROM "matchmaker_user_memory" memory,
         LATERAL jsonb_each_text(memory."negative_signals") signal
), normalized AS (
    SELECT
        "user_id",
        sentiment,
        regexp_replace(raw_key, '^(prefer_|avoid_|interest_|quality_)', '') AS normalized_value,
        weight,
        CASE
            WHEN raw_key ~ '(serious|casual|intentional|relationship)' THEN 'relationship_intent'
            WHEN raw_key ~ '(calm|quiet|social|expressive|outgoing)' THEN 'social_energy'
            WHEN raw_key ~ '(active|activity)' THEN 'activity'
            WHEN raw_key ~ '(communication|consistent|low_drama)' THEN 'communication'
            WHEN raw_key ~ '(lifestyle|fitness|workout|drinking|smoking)' THEN 'lifestyle'
            WHEN raw_key ~ '(infj|enfj|intj|entj|isfj|esfj|istj|estj|isfp|esfp|istp|estp|infp|enfp|intp|entp)' THEN 'personality'
            WHEN raw_key ~ '(music|gaming|fashion|photography|movies|church|study)' THEN 'interests'
            ELSE 'other'
        END AS category
    FROM legacy_signals
)
INSERT INTO "matchmaker_user_preferences" (
    "user_id",
    "category",
    "value",
    "normalized_value",
    "sentiment",
    "importance",
    "certainty",
    "source",
    "status",
    "version",
    "metadata"
)
SELECT
    "user_id",
    category,
    replace(normalized_value, '_', ' '),
    normalized_value,
    sentiment,
    'flexible',
    'inferred',
    'migrated_memory',
    'active',
    1,
    jsonb_build_object('legacyWeight', weight)
FROM normalized
WHERE normalized_value <> ''
ON CONFLICT ("user_id", "category", "normalized_value", "sentiment") DO NOTHING;

INSERT INTO "app_feature_flags" ("key", "enabled", "description", "config")
VALUES (
    'matchmaker_personalization_v2',
    false,
    'Enable structured matchmaker preferences and the phased V2 experience.',
    '{}'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
