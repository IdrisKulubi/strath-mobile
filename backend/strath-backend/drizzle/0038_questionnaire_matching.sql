CREATE TABLE q_categories (
    id text PRIMARY KEY,
    title text NOT NULL
);

CREATE TABLE q_questions (
    id text PRIMARY KEY,
    question_key text NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    category_id text NOT NULL REFERENCES q_categories(id),
    prompt text NOT NULL CHECK (length(trim(prompt)) > 0),
    options jsonb NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) >= 2),
    pool text NOT NULL CHECK (pool IN ('starter', 'replacement', 'sensitive')),
    position integer NOT NULL CHECK (position >= 0),
    sensitive boolean NOT NULL DEFAULT false,
    published boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (question_key, version),
    UNIQUE (position)
);

CREATE FUNCTION q_reject_published_question_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.published AND ROW(
        NEW.question_key, NEW.version, NEW.category_id, NEW.prompt, NEW.options,
        NEW.pool, NEW.position, NEW.sensitive
    ) IS DISTINCT FROM ROW(
        OLD.question_key, OLD.version, OLD.category_id, OLD.prompt, OLD.options,
        OLD.pool, OLD.position, OLD.sensitive
    ) THEN
        RAISE EXCEPTION 'Published questions are immutable; create a new version';
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER q_question_immutable
BEFORE UPDATE ON q_questions
FOR EACH ROW EXECUTE FUNCTION q_reject_published_question_changes();

CREATE INDEX q_questions_catalogue_idx ON q_questions(published, pool, position);

CREATE TABLE q_state (
    user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
    revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
    birth_date date,
    preferences jsonb,
    skipped jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(skipped) = 'array'),
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE q_answers (
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    question_id text NOT NULL REFERENCES q_questions(id),
    answer_id text NOT NULL,
    acceptable jsonb NOT NULL CHECK (jsonb_typeof(acceptable) = 'array' AND jsonb_array_length(acceptable) > 0),
    weight integer NOT NULL CHECK (weight IN (0, 1, 10, 50, 250)),
    public boolean NOT NULL DEFAULT false,
    explanation text NOT NULL DEFAULT '' CHECK (length(explanation) <= 500),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, question_id)
);

CREATE INDEX q_answers_question_idx ON q_answers(question_id);

CREATE TABLE q_questionnaire_events (
    id bigserial PRIMARY KEY,
    user_id text REFERENCES "user"(id) ON DELETE SET NULL,
    event text NOT NULL CHECK (event IN ('questionnaire_started', 'questionnaire_progress', 'questionnaire_completed')),
    answer_count integer NOT NULL CHECK (answer_count >= 0),
    revision integer NOT NULL CHECK (revision >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX q_questionnaire_events_funnel_idx
    ON q_questionnaire_events(event, created_at);

-- Discovery caches, likes, connections and legacy conversation backfill are
-- intentionally deferred to Phase 4/5.
