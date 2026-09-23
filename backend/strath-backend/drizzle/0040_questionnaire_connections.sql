CREATE TABLE q_profile_decisions (
    actor_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    target_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    decision text NOT NULL CHECK (decision IN ('like', 'pass')),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (actor_id, target_id),
    CHECK (actor_id <> target_id)
);

CREATE INDEX q_profile_decisions_received_idx
    ON q_profile_decisions(target_id, decision, updated_at DESC);

-- A row is created on the first decision and locked for every later transition.
-- This prevents simultaneous reciprocal likes from both missing each other.
CREATE TABLE q_connections (
    user_a text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    user_b text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    match_id text REFERENCES matches(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'unmatched', 'blocked')),
    origin text NOT NULL DEFAULT 'questionnaire'
        CHECK (origin IN ('questionnaire', 'legacy')),
    created_at timestamptz NOT NULL DEFAULT now(),
    connected_at timestamptz,
    ended_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_a, user_b),
    UNIQUE (match_id),
    CHECK (user_a < user_b),
    CHECK ((status = 'active' AND match_id IS NOT NULL AND connected_at IS NOT NULL) OR status <> 'active')
);

CREATE INDEX q_connections_user_b_idx ON q_connections(user_b, status);
CREATE INDEX q_connections_status_idx ON q_connections(status, updated_at DESC);

CREATE TABLE q_connection_events (
    id bigserial PRIMARY KEY,
    user_id text REFERENCES "user"(id) ON DELETE SET NULL,
    match_id text REFERENCES matches(id) ON DELETE SET NULL,
    event text NOT NULL CHECK (event IN ('like_sent', 'pass_saved', 'mutual_like', 'conversation_started', 'message_sent', 'unmatched', 'blocked')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX q_connection_events_funnel_idx ON q_connection_events(event, created_at);
CREATE INDEX q_connection_events_match_idx ON q_connection_events(match_id, event, created_at);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS messages_sender_request_unique_idx
    ON messages(match_id, sender_id, client_request_id)
    WHERE client_request_id IS NOT NULL;
