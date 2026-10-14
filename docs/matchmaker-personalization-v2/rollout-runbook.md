# Matchmaker Personalization V2 Rollout Runbook

## Preconditions

- Apply all additive Matchmaker migrations, including curated shortlists.
- Record the V1 API error baseline in `MATCHMAKER_V1_API_ERROR_BASELINE_PCT`.
- Run backend TypeScript, lint, focused Matchmaker tests, and the production verification script.
- Complete iOS and Android accessibility and small-screen QA.
- Confirm V1 search and rendering still work with the master flag disabled.

## Admin Controls

Configure `matchmaker_personalization_v2` on the Admin Feature Flags page:

1. Keep the master switch disabled.
2. Select stage 0 and add internal tester user IDs.
3. Exercise disabling the master switch and confirm affected users return to V1 without losing V2 data.
4. Mark rollback readiness only after that rehearsal passes.
5. Enable the master switch.

The accepted stages are 0, 5, 25, 50, and 100 percent. Assignment is deterministic, so users do not move between cohorts while a stage is held.

## Stage Checklist

For internal, 5, 25, 50, and 100 percent:

- record the stage start time in Africa/Nairobi;
- hold external stages for at least one complete quota-reset cycle;
- run `npm run verify:production` from the backend with production environment access;
- reconcile persisted shortlist count, credit-consumed count, candidate rows, and analytics events;
- review shortlist error rate, size distribution, repeat rate, explanation coverage, provider fallback, feedback scope, Undo, profile decisions, and mutual outcomes;
- complete a manual stale-candidate, offline/resume, version-conflict, block, report, verification, Interested, and Pass smoke test;
- record the decision to advance, hold, or roll back.

## Automatic Hold Conditions

Do not advance when any condition is true:

- API error rate is more than two percentage points above the V1 baseline;
- repeated-candidate rate exceeds one percent;
- any presented shortlist has `credit_consumed = false`;
- an unrecoverable state is recorded;
- privacy, safety, verification, block, or report behavior regresses.

Interested rate alone never advances or rolls back a stage.

## Rollback

1. Disable the `matchmaker_personalization_v2` master switch.
2. Confirm the public authenticated flag returns false for a test user.
3. Confirm the next search uses V1 and existing V1 candidate rendering works.
4. Preserve all V2 preferences, changes, shortlists, feedback, and analytics.
5. Capture the failed guardrail, timestamps, affected sessions, and verification output before remediation.

Do not delete V2 schemas or data during rollback.
