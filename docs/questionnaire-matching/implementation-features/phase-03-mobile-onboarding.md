# Phase 3 — Profile and questionnaire on the phone

Depends on accepted Phases 1–2. Status: draft screens exist; no phone acceptance.

## Outcome and boundary

A person can open the new mobile experience on a real phone, save profile/preferences/photos, complete face verification and answer twenty questions in four batches. They can leave, return, edit, delete and retry safely. This phase must not require discovery scoring, likes or new conversations.

Expose the new development shell to an internal test account. Discover/Likes may show an explicit development-unavailable state until later phases; never show fabricated matches or pretend they are complete. Existing conversation access must remain available.

## Work

- [ ] Finish a clean internal-account entry point into the new shell, independent collection/shell flags and safe route guards.
- [ ] Finish profile setup: adult DOB, gender, city/location, explicit partner preferences, photos and introduction; university is optional.
- [ ] Connect upload and verification to existing services and return users correctly to the new flow.
- [ ] Finish four batches of five saved answers, progress, back navigation, skip/replacement and sensitive-question avoidance in the starter flow.
- [ ] Finish own answer, accepted partner answers, importance, privacy toggle and optional explanation controls.
- [ ] Make save/failure state explicit; preserve drafts appropriately across interruption, discard stale drafts safely and scope them to the correct account.
- [ ] Add answer review/edit/delete; dropping below twenty pauses discovery eligibility without touching messages.
- [ ] Make the feature visible on the phone before calling this phase complete. Document the startup command, test account setup and entry route.

## Independent test procedure

1. Start the accepted Phase 2 backend against staging/isolated data. Keep matching disabled; the Python service can be stopped.
2. Start Expo using the repository's CLI wrapper and open the development build on the target physical phone. Use a compatible development build if native dependencies prevent Expo Go usage. Record the device, OS, build and connection method.
3. With an internal account, open `/dating-setup`, upload a photo, save preferences and run verification. Open `/questions` and complete four batches.
4. Save several answers, terminate the app, reopen and confirm progress. Interrupt a save while offline, reconnect and retry without losing the selected values or double counting.
5. Skip multiple questions, revisit skips, change privacy, edit a saved answer and delete one. Confirm server counts/revisions agree.
6. Test an existing account with preserved conversations and missing DOB/questionnaire; it can reach messages without completing new discovery onboarding.
7. Check iOS and Android behavior for keyboard avoidance, native back, large text, light/dark themes, screen readers and 48-point targets. At least one real phone walkthrough is required; record unavailable platform coverage as a release blocker until completed.
8. Capture screenshots or a short recording of the actual phone flow. Show the user the reachable feature before advancing.

## Acceptance gate

- [ ] New flow is reachable and usable on a phone with matching disabled.
- [ ] Profile/verification and twenty-answer happy path passes end to end.
- [ ] Resume, offline retry, conflict, skip/revisit and edit/delete checks pass.
- [ ] No date/payment screens or old campus requirements leak into the new onboarding.
- [ ] Focused type/lint checks and device accessibility checks pass; unresolved relevant errors block acceptance.
- [ ] Phone evidence and walkthrough result are recorded in master; Phase 3 is checked complete.

Only then begin Phase 4. A browser preview alone does not satisfy this gate.
