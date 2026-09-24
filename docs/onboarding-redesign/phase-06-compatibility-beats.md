# Phase 06: Compatibility answers as guided beats

Status: In review
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

- [x] Implement explicit states: own answer → acceptable partner answers → importance → visibility → optional context/commit. Keep a single active prompt and compact previous-answer summary.
- [x] Advance single choices with feedback; use Continue for partner multi-select. Select-all uses the existing option IDs and can be reversed.
- [x] Replace the importance bar with the five named choices and exact stored weights in the design contract. Preserve existing answer weights on edit.
- [x] Bring visibility and optional context into the normal sequence and remove reliance on More for these fields. Preserve editing/deletion access in an appropriate explicit review action.
- [x] Maintain draft versus saved separation, explicit Save & continue, failed draft retention, revision/conflict handling, skip behavior, and Back.
- [x] Add meaningful transition/payload tests for rapid taps, Back, edit, interrupted save, select-all, and restored drafts; retain all existing questionnaire API semantics.

## Acceptance

- [x] The user's exact communication-frequency example works through every beat without a slider or hidden follow-up.
- [x] Five weights and public/private values round-trip unchanged; note limits and catalogue validation remain correct.
- [x] Only successful saves increase completion; skips do not. Repeated taps do not submit twice or skip beats.
- [x] Questionnaire UI tests and changed-file typecheck pass; existing unrelated scoped TypeScript diagnostics and user-owned native captures are recorded below.

## Scope boundary

No scoring reweighting, question catalogue rewrite, or changing the twenty-answer gate.

## Evidence and handoff

- Changed files/commit: `app/questions.tsx`, `lib/questionnaire-flow.ts`, `lib/questionnaire-flow.test.mjs`; no commit created.
- Checks run and results: 8/8 questionnaire flow tests passed; targeted ESLint passed; scoped TypeScript emitted no diagnostics in Phase 06 files but still fails on three pre-existing diagnostics (`VibeCheckGame.tsx` and `components/ui/text.tsx`); `git diff --check` passed. Static review covered the communication-frequency sequence, back/restore, skip, save/retry, conflict, and edit/delete routes.
- Screenshots/recording and device/theme: None. The user owns mobile app testing and asked Codex not to attempt live review. Native transitions, dark/light layout, keyboard, screen-reader focus, and actual interruption/retry await that testing.
- Remaining blockers or unavailable checks: Native capture and transition recording are unavailable by user direction. The scoped TypeScript command remains red from the three unrelated baseline errors; Phase 06 files are clean. Reopen for any user-reported device defect.
- Deviations from the approved contract: None.
- User screenshot follow-up: Optional context was hidden when the iOS keyboard opened. The shared Rising sheet now measures the focused input and scrolls it above the keyboard and pinned action; the field requests another reveal as multiline content grows. Targeted lint passed and TypeScript reports no diagnostics in the changed Rising files. User mobile retest remains pending.
- User screenshot follow-up: Partner answer rows appeared as loose labels, the bottom action lost its track and centered label, and the previous-answer card was clipped at the top. The shared Rising controls now pass direct styles to their native pressables, keep the selected required answer at full opacity, and give the bottom pill an explicit horizontal layout. Remounting the scroll view on each beat resets its offset before the new summary appears. Static checks passed on changed files; the user-owned mobile retest remains pending.
- Next action: Confirm the corrected Phase 06 appearance on mobile before Phase 07; do not start it automatically.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
