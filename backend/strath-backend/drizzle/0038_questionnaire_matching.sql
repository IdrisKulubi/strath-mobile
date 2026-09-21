BEGIN;
CREATE TABLE q_categories (id text PRIMARY KEY, title text NOT NULL);
CREATE TABLE q_questions (
 id text PRIMARY KEY, category_id text NOT NULL REFERENCES q_categories(id),
 prompt text NOT NULL, options jsonb NOT NULL, position integer NOT NULL,
 sensitive boolean NOT NULL DEFAULT false, published boolean NOT NULL DEFAULT true
);
CREATE FUNCTION q_immutable_question() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.published AND (NEW.prompt IS DISTINCT FROM OLD.prompt OR NEW.options IS DISTINCT FROM OLD.options OR NEW.id IS DISTINCT FROM OLD.id) THEN
  RAISE EXCEPTION 'Published questions are immutable; create a new version';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER q_question_immutable BEFORE UPDATE ON q_questions FOR EACH ROW EXECUTE FUNCTION q_immutable_question();
CREATE TABLE q_state (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 revision integer NOT NULL DEFAULT 0, birth_date date, enrolled boolean NOT NULL DEFAULT false,
 preferences jsonb, skipped jsonb NOT NULL DEFAULT '[]',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE q_answers (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 question_id text NOT NULL REFERENCES q_questions(id), answer_id text NOT NULL,
 acceptable jsonb NOT NULL, weight integer NOT NULL CHECK(weight IN (0,1,10,50,250)),
 public boolean NOT NULL DEFAULT false, explanation text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,question_id)
);
CREATE TABLE q_decisions (
 actor_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 target_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 decision text NOT NULL CHECK(decision IN ('like','pass')),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,target_id), CHECK(actor_id<>target_id)
);
CREATE INDEX q_decisions_target ON q_decisions(target_id,decision);
CREATE TABLE q_connections (
 user_a text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 user_b text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 match_id text NOT NULL UNIQUE REFERENCES matches(id),
 origin text NOT NULL DEFAULT 'questionnaire',
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','unmatched')),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_a,user_b), CHECK(user_a<user_b)
);
CREATE INDEX q_connections_b ON q_connections(user_b,status);
CREATE TABLE q_cache (
 user_a text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 user_b text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 revision_a integer NOT NULL, revision_b integer NOT NULL, algorithm text NOT NULL,
 result jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_a,user_b), CHECK(user_a<user_b)
);
CREATE TABLE q_events (
 id bigserial PRIMARY KEY, user_id text REFERENCES "user"(id) ON DELETE CASCADE,
 event text NOT NULL, count integer, duration_ms integer, created_at timestamptz NOT NULL DEFAULT now()
);
-- Retain conversation IDs. Never revive inactive duplicates or blocked pairs.
INSERT INTO q_connections(user_a,user_b,match_id,origin)
SELECT DISTINCT LEAST(m.user_a_id,m.user_b_id), GREATEST(m.user_a_id,m.user_b_id), m.legacy_match_id, 'legacy'
FROM mutual_matches m JOIN matches c ON c.id=m.legacy_match_id
WHERE m.status IN ('mutual','being_arranged','upcoming','completed')
AND LEAST(c.user1_id,c.user2_id)=LEAST(m.user_a_id,m.user_b_id)
AND GREATEST(c.user1_id,c.user2_id)=GREATEST(m.user_a_id,m.user_b_id)
AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id=m.user_a_id AND b.blocked_id=m.user_b_id) OR (b.blocker_id=m.user_b_id AND b.blocked_id=m.user_a_id))
AND NOT EXISTS (SELECT 1 FROM mutual_matches x WHERE LEAST(x.user_a_id,x.user_b_id)=LEAST(m.user_a_id,m.user_b_id) AND GREATEST(x.user_a_id,x.user_b_id)=GREATEST(m.user_a_id,m.user_b_id) AND x.status IN ('cancelled','expired'))
ON CONFLICT DO NOTHING;
COMMIT;
