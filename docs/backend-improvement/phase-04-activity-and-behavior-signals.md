# Phase 04: Activity And Behavior Signals

## Objective

Make ranking strongly aware of who is active, responsive, and likely to create a match.

## Status

Implemented in this workspace.

## Implemented

- Added pure scoring helpers for activity, response, inbound interest, mutual conversion, and candidate strength.
- Added behavior signal refresh functions that read existing recommendation, directed-interest, candidate-pair, presence, and match-signal data.
- Stored refreshed behavior scores in `profile_intelligence`.
- Wired presence updates, profile interactions, and recommendation decisions to refresh affected users.
- Updated match ranking to read stored profile intelligence signals when available, with live fallbacks.

## Scope

- Normalize last-seen and recent activity into `activity_score`.
- Calculate `response_score`.
- Calculate `inbound_interest_score`.
- Calculate `mutual_conversion_score`.
- Calculate `candidate_strength_score`.
- Update these scores from interaction events and scheduled refreshes.

## Signal Sources

- `user_match_signals`
- `recommendation_events`
- `user_match_interests`
- `candidate_pairs`
- `mutual_matches`
- message activity, if available
- app session or active signal updates

## Suggested Score Logic

```txt
activity_score:
  active in last 10 min = 100
  active in last 1 hour = 92
  active today = 82
  active in last 3 days = 66
  active in last 7 days = 45
  older = 20

response_score:
  open_to_meet decisions, replies, accepted matches, non-ghosting behavior

inbound_interest_score:
  recent likes received, capped and decay-weighted

mutual_conversion_score:
  how often shown/liked interest becomes mutual, capped for small sample sizes
```

## Files To Touch

- `backend/strath-backend/src/lib/services/profile-intelligence-scoring.ts`
- `backend/strath-backend/src/lib/services/profile-intelligence-service.ts`
- `backend/strath-backend/src/lib/services/profile-interaction-service.ts`
- `backend/strath-backend/src/lib/services/match-intelligence-service.ts`

## Acceptance Criteria

- Dormant users receive strong ranking penalties.
- Active users with good response behavior rank higher.
- Scores are capped between 0 and 100.
- Small sample sizes are smoothed so new users are not unfairly buried.
- Candidate strength is stored and refreshable.

## Tests

- Unit test activity score boundaries.
- Unit test response score smoothing.
- Unit test candidate strength calculation.
- Regression test that a recently active decent candidate beats a dormant high-compatibility candidate.

## Manual Verification

Compare two test profiles with similar compatibility but different last-seen values. The active profile should rank higher.

## Rollback

Set candidate strength weight to zero in recommendation integration.
