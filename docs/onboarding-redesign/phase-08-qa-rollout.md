# Phase 08: Accessibility, regression checks, and staged rollout

Status: Not started
Dependencies: 01–07
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Verify the whole implementation, close defects, and prepare controlled release.

Deliverable: A verified redesign and reviewable release procedure; deployment status recorded separately.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

All changed onboarding/auth/verification/questionnaire routes; scripts/config and release mechanism identified in Phase 1.

## Checklist

- [ ] Run the Phase 1 acceptance matrix across small/large devices, iOS/Android, supported web where applicable, dark/light mode, large text, reduced motion, and screen readers.
- [ ] Check keyboard avoidance, native Back, focus/announcements, target size, contrast, transitions, rapid taps, background/resume, and poor network behavior.
- [ ] Run relevant lint/typechecks/tests, meaningful route/data regressions, and inspect remaining baseline failures separately.
- [ ] Capture final route screenshots and motion recordings; compare with Option 1 and log/fix visual drift.
- [ ] Document release switch or staged delivery procedure, rollback path, and smoke checks using the real deployment setup; do not invent a flag or enable rollout during a documentation task.
- [ ] Reconcile every phase checklist with evidence. Record remaining device/acceptance gaps and separate release execution from implementation verification.

## Acceptance

- [ ] No unresolved blocking flow, privacy, data-loss, accessibility, or eligibility defect remains.
- [ ] Required platform evidence exists; unavailable checks keep the phase In review rather than Done.
- [ ] Rollout and rollback procedure is concrete; actual deployment remains a separately authorized action.

## Scope boundary

No unrelated feature expansion or automatic production deployment.

## Evidence and handoff

- Changed files/commit: None.
- Checks run and results: Not run; planning only.
- Screenshots/recording and device/theme: None.
- Remaining blockers or unavailable checks: Not assessed.
- Deviations from the approved contract: None.
- Next action: Start this phase after its dependencies are Done and the user requests it.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
