# Matching Funnel Rollout - 2026-05-03

## Why

Fresh aggregate data showed the matching engine was creating candidate pairs correctly, but the funnel was losing people before mutual matches formed.

Baseline snapshot before this rollout:

- Total candidate pairs: 773
- Pairs with any response: 169
- Pairs with both responses: 13
- Any-interest pairs: 47
- Mutual pairs: 1
- Expired with no response: 340
- Expired with one interest and one pending: 32
- Pass decisions: 134
- Interest decisions: 48

The integrity check was clean: every double-interest pair had a linked `mutual_matches` row. The issue was response volume and reciprocal interest, not failed mutual creation.

## Changes

- Candidate pair expiry now defaults to 48 hours via `CANDIDATE_PAIR_EXPIRY_MINUTES` fallback of `2880`.
- Home now shows 1 active candidate card at a time.
- `Interested` now creates a hold: the user cannot receive another active intro while waiting for the other person's response.
- Active-card rotation only tops up an empty slot, so `Pass` and `Maybe` can reveal another profile within the 48-hour window without letting users hold interest in multiple people at once.
- The hourly cron also tops up users who have no active intro and no pending-interest hold.
- Queued backup intros still work, but a user who already has queued rows receives only enough immediate top-up rows to fill open active slots.
- Users are capped at 32 candidate decisions per rolling 24 hours via `DAILY_CANDIDATE_DECISION_LIMIT`.
- `Interested` keeps the intro alive while waiting for the other person's response. `Pass` hard-closes the dyad. `Maybe` removes the card without permanently closing the dyad.
- The positive action copy changed from "Open to Meet" to "Interested".
- Added a `maybe` decision. It expires/recycles the pair instead of permanently closing the dyad.
- Added reminder tracking columns on `candidate_pairs`:
  - `reminder_sent_at`
  - `one_sided_reminder_sent_at`
- Existing hourly candidate-pairs cron now sends:
  - One-sided-interest reminders after 30 minutes when the other side is still pending.
  - Expiring-intro reminders during the final 24 hours.
- Mobile match cards now show `Interested`, `Maybe`, and `Pass`.
- Match cards now add a stronger "Why this could work" pitch above the reason chips.
- Admin Match Activity now separates `Interested`, `Maybe later`, and `Passed`.

## Tomorrow's Read

Pull the same funnel after at least 24 hours and compare:

- Any-response rate: `pairs_with_any_response / exposed_pairs`
- Both-response rate: `pairs_with_both_responses / exposed_pairs`
- Interest rate: `yes_decisions / total_decisions`
- Maybe rate: `maybe_decisions / total_decisions`
- Users hitting the 32-decision cap
- Mutual conversion: `double_yes_pairs / exposed_pairs`
- Silent expiry rate: `expired_no_response / exposed_pairs`
- One-sided expiry rate: `expired_one_yes_pending / exposed_pairs`

The most important early win is not just more mutuals. It is fewer silent expiries and more second-side responses on one-sided-interest pairs.
