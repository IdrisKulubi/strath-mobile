# Phase 06: Compatibility answers as guided beats

Status: In review
Dependencies: 01, 02, 05
Updated: 2026-09-25

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Replace the current questionnaire layout with the approved sequential Rising sheet interaction.

Deliverable: The core compatibility onboarding fully uses Rising sheet and preserves matching behavior.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

app/questions.tsx; components/questionnaire/importance-slider.tsx; more-sheet.tsx; option-row.tsx; beat-reveal.tsx; sticky-footer.tsx; lib/questionnaire-flow.ts; lib/questionnaire-flow.test.mjs.

## Checklist

- [x] Implement explicit states: own answer → acceptable partner answers → importance → optional context/commit. Keep a single active prompt and compact previous-answer summary.
- [x] Advance single choices with feedback; use Continue for partner multi-select. Partner choices are independent of the person's own answer. Show every substantive option with an enabled checkbox, require at least one selection, and use the same checkbox styling for Select all on lists longer than two.
- [x] Replace the importance bar with the five named choices and exact stored weights in the design contract. Preserve existing answer weights on edit.
- [x] Put optional context in the normal sequence without More or a privacy-choice beat. Preserve editing/deletion access in review.
- [x] Maintain draft versus saved separation, explicit Save & continue, failed draft retention, revision/conflict handling, recovery of previously skipped questions, and Back within the answer flow.
- [x] Add meaningful transition/payload tests for rapid taps, Back, edit, interrupted save, select-all, and restored drafts; retain all existing questionnaire API semantics.

## Acceptance

- [x] The user's exact communication-frequency example works through every beat without a slider or hidden follow-up.
- [x] Five weights, note limits, and catalogue validation remain correct; new and edited answers save as public while earlier private answers remain private.
- [x] Only successful saves increase completion; the UI offers no question skip. Repeated taps do not submit twice or skip beats.
- [x] Questionnaire UI tests and changed-file typecheck pass; existing unrelated scoped TypeScript diagnostics and user-owned native captures are recorded below.

## Scope boundary

The original Phase 06 scope excluded catalogue and completion changes. The user's later explicit 32-question request supersedes that boundary for the expansion recorded below; existing published question versions remain immutable.

## Evidence and handoff

- Changed files/commit: `app/questions.tsx`, `lib/questionnaire-flow.ts`, `lib/questionnaire-flow.test.mjs`; no commit created.
- Checks run and results: 8/8 questionnaire flow tests passed; targeted ESLint passed; scoped TypeScript emitted no diagnostics in Phase 06 files but still fails on three pre-existing diagnostics (`VibeCheckGame.tsx` and `components/ui/text.tsx`); `git diff --check` passed. Static review covered the communication-frequency sequence, back/restore, skip, save/retry, conflict, and edit/delete routes.
- Screenshots/recording and device/theme: None. The user owns mobile app testing and asked Codex not to attempt live review. Native transitions, dark/light layout, keyboard, screen-reader focus, and actual interruption/retry await that testing.
- Remaining blockers or unavailable checks: Native capture and transition recording are unavailable by user direction. The scoped TypeScript command remains red from the three unrelated baseline errors; Phase 06 files are clean. Reopen for any user-reported device defect.
- Deviations from the approved contract: None.
- User screenshot follow-up: Optional context was hidden when the iOS keyboard opened. The shared Rising sheet now measures the focused input and scrolls it above the keyboard and pinned action; the field requests another reveal as multiline content grows. Targeted lint passed and TypeScript reports no diagnostics in the changed Rising files. User mobile retest remains pending.
- User screenshot follow-up: Partner answer rows appeared as loose labels, the bottom action lost its track and centered label, and the previous-answer card was clipped at the top. The shared Rising controls now pass direct styles to their native pressables, keep the selected required answer at full opacity, and give the bottom pill an explicit horizontal layout. Remounting the scroll view on each beat resets its offset before the new summary appears. Static checks passed on changed files; the user-owned mobile retest remains pending.
- User decision: The questionnaire is mandatory and continuous through all twenty starter answers. The five-answer chapter pause, Take a break, and Skip this question actions were removed. Previously skipped starter questions now reappear when needed; dating tabs redirect accounts with saved but incomplete answers back to the questionnaire. The top-level gesture and Android hardware Back are blocked during incomplete question entry, while Back within the current answer remains available. Seven focused flow tests and targeted ESLint pass, changed files have no TypeScript diagnostics, and the scoped typecheck retains three unrelated baseline errors. User mobile retest remains pending.
- User decision on 2026-09-25: Remove the privacy beat. New and edited compatibility answers, including optional notes, are public; previously private saved answers stay private until edited. Public profile comparison lists the profile owner's public answers even when the viewer has not answered the same question. Old drafts are restored into the four-beat flow and the save screen discloses publication. Seven mobile flow tests, eight answer API tests, and eleven discovery/comparison tests passed. Targeted mobile and backend ESLint passed; scoped TypeScript retains three unrelated errors. User mobile retest remains pending.
- User follow-up on 2026-09-25: The Rising header uses progressive blur (`rising-header-progressive-blur.tsx`) with the sheet scrolling underneath; header chrome is an absolute overlay with measured top inset. Palette adds `risingHeaderScrim*` stops. Targeted lint passed; user mobile retest pending.
- User follow-up on 2026-09-25: The shared Rising Continue control now floats over the sheet with liquid glass (native glass when available, blur fallback otherwise). `rising-sheet-screen.tsx` reserves scroll space and keyboard clearance for the floating footer; `onboarding-primary-button.tsx` owns the glass track. Palette adds `risingGlassTint` and `risingGlassOverlay`. Targeted lint on changed files passed; user mobile retest of glass appearance remains pending.
- User screenshot follow-up on 2026-09-25: The partner-answer beat no longer repeats the person's own answer as a selected row or top summary. Select all is now a checkable Rising option row, and the helper says people may continue without choosing another option. Matching still retains the own answer in the accepted IDs, including when restoring older data that omitted it; selecting all remains reversible. Seven focused flow tests, targeted ESLint, and diff check passed; scoped TypeScript retains three unrelated errors. Device retest is user-owned.
- User-requested 32-question expansion on 2026-09-25: Nine immutable catalogue entries plus three reused entries form twelve detailed follow-ups. The backend requires these exact versions rather than any 32 answers, and the mobile flow resumes a person who completed twenty at the children question. Non-disclosure choices bypass partner/importance beats, save with neutral weight and no note, and are omitted from scoring evidence. Mobile flow 8/8, backend questionnaire 9/9, discovery 13/13, and connections 10/10 tests passed; targeted lint and backend TypeScript passed. Mobile scoped TypeScript retains the three unrelated baseline errors. The 109-question catalogue needs explicit seeding in the intended database before rollout; no deployment or mobile device check was performed here. See [the expansion record](../questionnaire-expansion-research.md).
- User screenshot correction on 2026-09-25: After answering No to the children question, the partner beat only showed Yes and Select all. Binary questions now show both No and Yes, with No visibly checked and fixed because the own answer remains included. Select all is hidden when there is only one additional choice. Multi-option questions retain the previous own-answer-hidden behavior. Nine focused flow tests, targeted lint, and diff check passed; scoped TypeScript still has three unrelated baseline errors. The user confirmed the catalogue seed reached 109 published questions and will retest this screen on the device.

- User clarification on 2026-09-25 supersedes the preceding partner-choice rule: a personal No about children must not decide partner preferences. The partner beat now displays Yes, No, and Unsure as independent, enabled checkboxes with no selection for new answers. At least one partner answer is required; saved selections remain when edited and changing the personal answer clears them. Old unfinished drafts that auto-included the personal answer return to this beat unchecked. Select all is reversible. Nine focused flow tests, targeted lint, and diff check passed; scoped TypeScript retains the same three unrelated baseline errors. Device retest remains user-owned.
- Next action: Confirm the corrected Phase 06 appearance on mobile before Phase 07; do not start it automatically.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
