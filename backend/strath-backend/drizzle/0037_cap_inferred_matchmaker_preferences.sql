DO $$
DECLARE
    archived_count integer := 0;
    affected_user_count integer := 0;
BEGIN
    CREATE TEMP TABLE matchmaker_inferred_preference_overflow
    ON COMMIT DROP
    AS
    SELECT id, user_id
    FROM (
        SELECT
            id,
            user_id,
            row_number() OVER (
                PARTITION BY user_id
                ORDER BY
                    CASE source
                        WHEN 'system' THEN 0
                        WHEN 'migrated_memory' THEN 1
                        ELSE 2
                    END,
                    updated_at DESC,
                    created_at DESC,
                    id ASC
            ) AS preference_rank
        FROM matchmaker_user_preferences
        WHERE status = 'active'
          AND certainty = 'inferred'
    ) ranked
    WHERE preference_rank > 15;

    UPDATE matchmaker_user_preferences preference
    SET
        status = 'removed',
        version = preference.version + 1,
        metadata = COALESCE(preference.metadata, '{}'::jsonb)
            || '{"archivedReason":"inferred_queue_cap"}'::jsonb,
        updated_at = now()
    FROM matchmaker_inferred_preference_overflow overflow
    WHERE preference.id = overflow.id;

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    UPDATE matchmaker_user_briefs brief
    SET
        version = brief.version + 1,
        updated_at = now()
    WHERE brief.user_id IN (
        SELECT DISTINCT user_id
        FROM matchmaker_inferred_preference_overflow
    );

    GET DIAGNOSTICS affected_user_count = ROW_COUNT;

    RAISE NOTICE
        'Archived % inferred Matchmaker preferences for % users (cap: 15)',
        archived_count,
        affected_user_count;
END $$;
