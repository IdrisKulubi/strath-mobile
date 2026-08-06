# Phase 6: Resilience, Accessibility, Analytics, and Rollout

## Goal

Harden the complete V2 experience and replace V1 gradually without compromising quota integrity, accessibility, privacy, safety, or recovery.

## Dependencies

- Phases 1 through 5 acceptance gates passed.
- V1 fallback still works.
- Admin analytics can receive new V2 event dimensions.

## UX Contract

- No loading, no-result, stale-candidate, quota, offline, retry, provider-fallback, or version-conflict state leaves a blank or unrecoverable Home screen.
- Conversation, shortlist position, feedback draft, and pending brief edits survive interruption.
- Search credit status is clear and never pressures users to avoid honest feedback.
- Assistive technology receives meaningful announcements for thinking, searching, shortlist readiness, saved learning, undo, and errors.
- Motion communicates state, lasts 150 to 250 ms where appropriate, and respects reduced motion.

## Backend Work

- Make search and brief mutations idempotent across client retries and concurrent requests.
- Add explicit handling for stale candidates while preserving other shortlist members.
- Ensure provider fallback cannot change quota accounting or duplicate messages.
- Return recoverable version-conflict responses with latest brief and pending-operation context.
- Confirm AI consent, profile access, block, report, verification, and recommendation decision behavior on every new route.
- Add the complete V2 analytics event map and admin aggregations.
- Expose operational metrics for shortlist errors, size distribution, repeated candidates, credit mismatches, LLM fallback, explanation validation failure, feedback scope, and undo.
- Add a verified production rollback switch for `matchmaker_personalization_v2`.

## Mobile Work

- Add stable skeletons and inline retry for brief, conversation, shortlist, and feedback surfaces.
- Persist drafts and active shortlist navigation state using existing query cache and appropriate local storage.
- Recover pending operations after network return without duplicate writes.
- Complete contrast testing for light and dark themes.
- Verify dynamic type, screen-reader order, focus restoration, keyboard avoidance, safe areas, reduced motion, and touch target sizes.
- Use live regions for state changes without repeatedly announcing the entire transcript.
- Keep V1 fallback rendering available until V2 is stable at full rollout.

## Analytics and Rollout

- Track the complete funnel:
  - session opened;
  - brief viewed or edited;
  - clarification resolved;
  - shortlist requested and generated;
  - candidate navigation;
  - explanation and comparison use;
  - profile opened;
  - Interested or Pass;
  - candidate-only feedback;
  - confirmed future learning;
  - undo;
  - mutual outcome.
- Distinguish shortlist-level events from candidate-level events.
- Establish V1 baselines before external rollout.
- Roll out to internal users, then 5, 25, 50, and 100 percent of eligible users.
- Hold each external stage for at least one complete Africa/Nairobi quota-reset cycle.
- Pause or roll back when:
  - API error rate exceeds V1 baseline by more than two percentage points;
  - repeated-candidate rate exceeds one percent;
  - any persisted shortlist consumes other than one credit;
  - state becomes unrecoverable;
  - privacy, safety, verification, block, or report behavior regresses.

## Tests

- End-to-end flows for new and returning users, empty and migrated briefs, unresolved and contradictory preferences, and one to three candidates.
- Candidate-only feedback, confirmed global learning, cancelled preview, undo, and version conflict.
- No result, partial result, stale candidate, quota reached, request timeout, offline mode, provider fallback, app termination, and resume.
- Concurrent search and rapid-tap tests proving one shortlist equals one credit.
- Profile Interested, Pass, mutual creation, block, report, and unavailable candidate continuity.
- Accessibility QA with VoiceOver and TalkBack, large text, contrast, focus order, reduced motion, and switch or keyboard navigation where supported.
- Admin validation that shortlist and candidate metrics reconcile with persisted records.
- Production verification script covering flag state, API health, migrations, analytics, and rollback readiness.

## Acceptance Criteria

- No blank or unrecoverable matchmaker state exists in the supported test matrix.
- Credits remain correct under retries, concurrency, provider fallback, and resume.
- Accessibility and small-screen QA pass on supported iOS and Android targets.
- Admin analytics reconcile shortlist-level and candidate-level events.
- Rollout guardrails and rollback have been exercised before external release.
- V2 is stable at 100 percent before planning V1 cleanup.

## Exclusions

- No V1 schema or code deletion in this phase.
- No automatic rollout based only on Interested rate.
- No expansion beyond existing StrathSpace eligibility and campus scope.

## Rollback

Disable `matchmaker_personalization_v2` and restore V1 rendering and search routing. Preserve V2 preferences, history, shortlists, feedback, and analytics for diagnosis. Do not drop additive schema until a separate cleanup plan is approved after full stability.
