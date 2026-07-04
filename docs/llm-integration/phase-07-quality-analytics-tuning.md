# Phase 7: Quality, Analytics, And Tuning

## Goal

Measure whether the matchmaker is actually helping users find partners faster and keep improving ranking quality.

## Backend Scope

- Add analytics events:
  - session started
  - user intent submitted
  - clarification asked
  - search plan confirmed
  - candidate shown
  - profile opened
  - interested
  - pass
  - feedback reason selected
  - quota reached
- Add admin overview:
  - sessions per day
  - searches per day
  - repeated candidate rate
  - Interested rate
  - Pass rate
  - mutual match creation rate
  - average clarifying turns
  - LLM error/fallback rate

## Tuning Loop

Review:

- prompts that return repeated people
- prompts that produce many passes
- candidates with high exposure but low interest
- candidates with high matchmaker conversion
- LLM failures and invalid JSON

Use these findings to adjust:

- scoring weights
- hard filters
- diversity penalties
- clarifying question rules
- profile intelligence tags

## Rollout

- Start with internal/admin users.
- Enable for a small percentage of users.
- Compare against old daily recommendation performance.
- Increase rollout only when repeat rate and decision quality are acceptable.

## Verification

- Events are emitted for every major step.
- Admin dashboard can show daily health.
- LLM fallback rate is visible.
- Repeated candidate rate can be measured.

## Implementation Notes

- Added matchmaker event constants to the shared analytics logger.
- Added `matchmaker-analytics-service.ts` for consistent event metadata.
- Events are emitted for:
  - session started,
  - intent submitted,
  - clarification asked,
  - search plan confirmed,
  - candidate shown,
  - profile opened,
  - interested,
  - pass,
  - feedback reason selected,
  - quota reached.
- Extended the profile-intelligence admin overview with `matchmakerQuality`.
- Added admin UI cards for:
  - sessions,
  - searches,
  - repeated candidate rate,
  - Interested rate,
  - Pass rate,
  - mutual creation rate,
  - average clarifying turns,
  - LLM fallback rate,
  - feedback reasons,
  - quota reached.

## Admin Route

The existing endpoint now includes matchmaker quality:

```txt
GET /api/admin/profile-intelligence/overview
```

The existing admin page now renders the metrics:

```txt
/admin/profile-intelligence
```
