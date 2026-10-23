-- Reset any in-flight call stage back to mutual (chat-first flow).
UPDATE mutual_matches SET status = 'mutual', updated_at = NOW() WHERE status = 'call_pending';

-- Unblock arranging queue rows that never completed the removed call step.
UPDATE date_matches
SET
    call_completed = true,
    user_a_confirmed = true,
    user_b_confirmed = true
WHERE status = 'pending_setup'
  AND (call_completed = false OR user_a_confirmed = false OR user_b_confirmed = false);

DROP TABLE IF EXISTS vibe_checks CASCADE;
