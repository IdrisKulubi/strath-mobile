-- Apply before deploying the push sender and cron worker.
CREATE TABLE IF NOT EXISTS push_deliveries (
    id text PRIMARY KEY,
    push_token text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','receipt','delivered','failed')),
    attempts integer NOT NULL DEFAULT 0,
    ticket_id text,
    last_error text,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_deliveries_due ON push_deliveries(next_attempt_at)
    WHERE status IN ('pending','sending','receipt');
