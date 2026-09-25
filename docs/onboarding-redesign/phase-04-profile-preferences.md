# Phase 04: About you and partner preferences

Status: Done (implementation; user mobile review pending)
Dependencies: 01, 02, 03
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Replace dense setup forms with guided personal-detail and preference beats.

Deliverable: A guided About you and Your preferences journey with reliable data handling.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

app/dating-setup.tsx; app/onboarding/index.tsx; components/onboarding/TheEssentials.tsx; core-profile-step.tsx; campus-basics-step.tsx; constants/onboarding.ts; profile/preference helpers.

## Checklist

- [x] Separate name fallback, private DOB, gender, location, explicit desired genders, age range, and dating intentions into clear beats in the questionnaire route; migrate legacy name/phone/core/campus steps to the Rising sheet without merging their distinct payloads.
- [x] Use tap-to-advance for simple single choices and Continue for text, date, numeric range, and multi-select input.
- [x] Keep city-only matching available when location permission is denied; request coordinates only in the optional distance beat.
- [x] Keep university/course/year optional in the questionnaire route; retain the legacy year/interests rules in its separate flow.
- [x] Keep the existing questionnaire preferences-then-profile save boundary and legacy final PATCH. Prefill server values, retain edits on Back/failure, and restore per-user local drafts on restart for Phase 04 fields.
- [x] Explain requirements at the relevant beat; validate adult DOB and 18–100 age/1–500 km limits before enabling Continue, and require explicit desired genders.

## Acceptance

- [x] Code paths handle known/missing name, valid/invalid and underage DOB, empty preferences, invalid age/radius, and denied location with city fallback. Boundary validation has focused tests; device behavior awaits the user's review.
- [x] Back retains form state; questionnaire and legacy Phase 04 details restore from user-scoped SecureStore drafts. A failed questionnaire save leaves draft data and does not show completion.
- [x] Existing profile and preference API payload shapes remain unchanged. The questionnaire route still commits preferences, then profile; the legacy route still commits its existing PATCH.

## Scope boundary

No matching-filter semantics or demographic schema redesign.

## Evidence and handoff

- Changed files/commit: `app/dating-setup.tsx`, `app/onboarding/index.tsx`, legacy `TheEssentials.tsx`, `phone-number-step.tsx`, `core-profile-step.tsx`, `campus-basics-step.tsx`, shared `rising-text-field.tsx`, `rising-sheet-screen.tsx`, beat controller, and `lib/onboarding-input-validation.ts` with focused tests. No commit created.
- Checks run and results: Targeted ESLint passed; full TypeScript run had 71 unrelated diagnostics and zero in Phase 04 files; five focused validation/questionnaire tests passed; `git diff --check` passed.
- Screenshots/recording and device/theme: Not performed by Codex. The user owns mobile testing; no native visual result is claimed for Phase 04.
- Remaining validation: User device review of DOB picker, keyboard, Back/restart, permission denial, light/dark appearance, and both entry cohorts. Phase 05 will replace the temporary bio/photos/education group at the end of questionnaire setup with guided profile-expression beats. Phase 07 will verify full-journey resume beyond the Phase 04 fields.
- Deviations from the approved contract: None in Phase 04. Legacy preferences remain single desired-gender choice because that route's API model differs from questionnaire multi-select; both are explicit user choices.
- Next action: Phase 05 may start when requested.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
