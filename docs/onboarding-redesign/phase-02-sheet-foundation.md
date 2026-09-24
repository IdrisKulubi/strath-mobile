# Phase 02: Rising sheet foundation and motion

Status: Done (implementation; user device review pending)
Dependencies: 01
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Build the shared visual and interaction primitives before migrating whole flows.

Deliverable: Reusable, demonstrated Rising sheet components ready for route integration.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

components/onboarding/onboarding-screen-shell.tsx; onboarding-screen-backdrop.tsx; onboarding-choice-row.tsx; onboarding-primary-button.tsx; onboarding-progress-bar.tsx; lib/design-tokens.ts; lib/onboarding-theme.ts; app/ui-preview/.

## Checklist

- [x] Evolve the existing shell into the persistent Rising sheet with branded header, safe-area footer, scroll body, keyboard handling, Back, and previous-answer summary.
- [x] Add reusable single/multi-select rows, five named importance choices in the preview, beat transition wrapper, inline feedback, and accessible progress using existing primitives.
- [x] Implement 200–220ms transitions, reduced-motion alternatives, selected-state/haptic feedback, and focus behavior. Protect navigation from duplicate/late advance events.
- [x] Create an isolated preview/demo of all answer beats and loading/error/long-copy states without switching production routes.
- [x] Use shared tokens for dark and light themes; compare code against the written contract rather than treating the concept image as literal copy or data.

## Acceptance

- [x] Preview provides the five sequential beats, Back/edit, and loading/error/long-copy entry points for the user's mobile review.
- [x] Sheet code handles safe areas, scrolling, keyboard avoidance, text scaling, reduced motion, and both theme palettes; device behavior remains for the user to assess.
- [x] Existing production screens continue using the standard presentation by default. The Rising presentation is opt-in and linked from the development-only UI preview.

## Scope boundary

No mass screen rewrite or backend changes.

## Evidence and handoff

- Changed files/commit: `components/onboarding/onboarding-screen-shell.tsx`, `rising-sheet-screen.tsx`, `onboarding-choice-row.tsx`, `onboarding-primary-button.tsx`, `onboarding-progress-bar.tsx`, `rising-inline-feedback.tsx`, `use-rising-beat-controller.ts`, `index.ts`; `app/ui-preview/onboarding-rising.tsx`, `app/ui-preview/index.tsx`, and the development-only preview allowlist in `components/questionnaire/route-gate.tsx`. No commit created.
- Checks run and results: Targeted ESLint passed. Full TypeScript check had 77 existing repository diagnostics and zero in Phase 02 files. `git diff --check` passed.
- Device/screenshots/recording: Not performed. The user explicitly took responsibility for testing on the mobile app; no live review or captures are claimed.
- Remaining validation: User device review of dark/light themes, small screens, large text, keyboard, Back, and reduced motion. Any reported issue reopens Phase 02; whole-journey device acceptance is tracked in Phase 08.
- Deviations from the approved contract: None. The preview simulates an answer without saving; no production route or backend behavior changed.
- Next action: Phase 03 may start when requested.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
