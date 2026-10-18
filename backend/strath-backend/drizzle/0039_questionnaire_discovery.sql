CREATE TABLE q_compatibility_cache (
    user_a text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    user_b text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    revision_a integer NOT NULL CHECK (revision_a >= 0),
    revision_b integer NOT NULL CHECK (revision_b >= 0),
    algorithm_version text NOT NULL,
    status text NOT NULL CHECK (status IN ('ready', 'insufficient_evidence')),
    score double precision,
    shared_count integer NOT NULL CHECK (shared_count >= 0),
    evidence_count integer NOT NULL CHECK (evidence_count >= 0 AND evidence_count <= shared_count),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_a, user_b),
    CHECK (user_a < user_b),
    CHECK (
        (status = 'ready' AND score BETWEEN 0 AND 100)
        OR (status = 'insufficient_evidence' AND score IS NULL)
    )
);

CREATE INDEX q_compatibility_cache_version_idx
    ON q_compatibility_cache(algorithm_version, updated_at);

CREATE TABLE q_discovery_events (
    id bigserial PRIMARY KEY,
    user_id text REFERENCES "user"(id) ON DELETE SET NULL,
    event text NOT NULL CHECK (event IN ('discovery_served', 'discovery_empty', 'engine_unavailable')),
    candidate_count integer NOT NULL CHECK (candidate_count >= 0),
    duration_ms integer NOT NULL CHECK (duration_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX q_discovery_events_operation_idx
    ON q_discovery_events(event, created_at);
