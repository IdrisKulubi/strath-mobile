# Phase 07: Resume, milestones, review, and discovery handoff

Status: Not started
Dependencies: 03, 04, 05, 06
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Make the redesigned chapters behave as one resumable journey.

Deliverable: A complete connected journey with reliable resumption and handoff.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

app/index.tsx; app/_layout.tsx; app/onboarding/index.tsx; app/questions.tsx; app/dating/index.tsx; questionnaire progress/review components; session/draft helpers identified in Phase 1.

## Checklist

- [ ] Connect chapter completion and resume behavior across auth, setup, profile, verification, and questions using actual persisted status.
- [ ] Make four groups of five questions feel like short chapters with calm milestone feedback and a clear take-a-break path.
- [ ] Provide answer review/edit and deletion with correct eligibility updates; preserve previous conversations when discovery is paused.
- [ ] Verify new/returning users, partial/complete/legacy users, notification links, and app restarts do not loop or revisit completed steps unnecessarily.
- [ ] Deliver a truthful ready state and discovery CTA only when server gates pass. Keep pending/offline recovery actionable.
- [ ] Remove obsolete entry points to the old questionnaire layout only after all active callers are migrated; keep required legacy contracts intact.

## Acceptance

- [ ] Restart at each chapter, failed save, session expiry, edit/delete, skipped answers, and completion thresholds are verified.
- [ ] Discovery cannot be entered from a cosmetic completion state; existing chats remain available as required.
- [ ] An end-to-end recording demonstrates coherent motion and navigation across chapters.

## Scope boundary

No redesign of discovery, messaging, or the rest of the product beyond necessary entry/handoff surfaces.

## Evidence and handoff

- Changed files/commit: None.
- Checks run and results: Not run; planning only.
- Screenshots/recording and device/theme: None.
- Remaining blockers or unavailable checks: Not assessed.
- Deviations from the approved contract: None.
- Next action: Start this phase after its dependencies are Done and the user requests it.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
