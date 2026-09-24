# Phase 06: Compatibility answers as guided beats

Status: Not started
Dependencies: 01, 02, 05
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Replace the current questionnaire layout with the approved sequential Rising sheet interaction.

Deliverable: The core compatibility onboarding fully uses Rising sheet and preserves matching behavior.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

app/questions.tsx; components/questionnaire/importance-slider.tsx; more-sheet.tsx; option-row.tsx; beat-reveal.tsx; sticky-footer.tsx; lib/questionnaire-flow.ts; lib/questionnaire-flow.test.mjs.

## Checklist

- [ ] Implement explicit states: own answer → acceptable partner answers → importance → visibility → optional context/commit. Keep a single active prompt and compact previous-answer summary.
- [ ] Advance single choices with feedback; use Continue for partner multi-select. Select-all uses the existing option IDs and can be reversed.
- [ ] Replace the importance bar with the five named choices and exact stored weights in the design contract. Preserve existing answer weights on edit.
- [ ] Bring visibility and optional context into the normal sequence and remove reliance on More for these fields. Preserve editing/deletion access in an appropriate explicit review action.
- [ ] Maintain draft versus saved separation, explicit Save & continue, failed draft retention, revision/conflict handling, skip behavior, and Back.
- [ ] Add meaningful transition/payload tests for rapid taps, Back, edit, interrupted save, select-all, and restored drafts; retain all existing questionnaire API semantics.

## Acceptance

- [ ] The user's exact communication-frequency example works through every beat without a slider or hidden follow-up.
- [ ] Five weights and public/private values round-trip unchanged; note limits and catalogue validation remain correct.
- [ ] Only successful saves increase completion; skips do not. Repeated taps do not submit twice or skip beats.
- [ ] Questionnaire UI tests and scoped typecheck pass, with real UI captures and transition recording.

## Scope boundary

No scoring reweighting, question catalogue rewrite, or changing the twenty-answer gate.

## Evidence and handoff

- Changed files/commit: None.
- Checks run and results: Not run; planning only.
- Screenshots/recording and device/theme: None.
- Remaining blockers or unavailable checks: Not assessed.
- Deviations from the approved contract: None.
- Next action: Start this phase after its dependencies are Done and the user requests it.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
