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
- Home now supports 2 active candidate cards by default via `DAILY_CANDIDATE_PAIR_LIMIT`.
- Active-card rotation now tops up users with fewer than 2 live intros, so pass/maybe decisions open a slot instead of forcing the user to wait for expiry.
- The hourly cron also tops up users with 0 or 1 active intros, not only users with no active intros.
- Queued backup intros still work, but a user who already has queued rows receives only enough immediate top-up rows to fill open active slots.
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
- Mutual conversion: `double_yes_pairs / exposed_pairs`
- Silent expiry rate: `expired_no_response / exposed_pairs`
- One-sided expiry rate: `expired_one_yes_pending / exposed_pairs`

The most important early win is not just more mutuals. It is fewer silent expiries and more second-side responses on one-sided-interest pairs.
