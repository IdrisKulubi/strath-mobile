# Phase 04: About you and partner preferences

Status: Not started
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

- [ ] Separate name fallback, private DOB, gender, location, explicit desired genders, age range, and dating intentions into clear beats based on the verified journey.
- [ ] Use tap-to-advance for simple single choices and Continue for text, dates, numeric ranges, and multi-select.
- [ ] Keep city/manual location usable when permission is denied; request location only at a relevant moment.
- [ ] Keep university/course/year optional for the questionnaire flow; reconcile any legacy cohort requirements using the Phase 1 map.
- [ ] Preserve existing validation and save boundaries. Retain drafts on Back/failure and prefill known data without silently overwriting it.
- [ ] Explain required fields locally and preserve 18+ eligibility and explicit preference selection.

## Acceptance

- [ ] Name already known/missing, valid/invalid DOB, underage rejection, empty preferences, invalid age/radius, and denied location cases are verified.
- [ ] Back and restart restore appropriate values; failed saves never report completion.
- [ ] Existing profile and preference payloads remain compatible.

## Scope boundary

No matching-filter semantics or demographic schema redesign.

## Evidence and handoff

- Changed files/commit: None.
- Checks run and results: Not run; planning only.
- Screenshots/recording and device/theme: None.
- Remaining blockers or unavailable checks: Not assessed.
- Deviations from the approved contract: None.
- Next action: Start this phase after its dependencies are Done and the user requests it.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
