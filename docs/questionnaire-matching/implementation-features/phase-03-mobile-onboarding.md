# Phase 3 — Profile and questionnaire on the phone

Depends on accepted Phases 1–2. Status: implementation complete; user phone UI review and acceptance remain open.

## Outcome and boundary

A person can open the new mobile experience on a real phone, save profile/preferences/photos, complete face verification and answer twenty questions in four batches. They can leave, return, edit, delete and retry safely. This phase must not require discovery scoring, likes or new conversations.

Expose the new development shell to an internal test account. Discover/Likes may show an explicit development-unavailable state until later phases; never show fabricated matches or pretend they are complete. Existing conversation access must remain available.

## Work

- [x] Finish a clean internal-account entry point into the new shell, independent collection/shell flags and safe route guards.
- [x] Finish profile setup: adult DOB, gender, city/location, explicit partner preferences, photos and introduction; university is optional.
- [x] Connect upload and verification to existing services and return users correctly to the new flow.
- [x] Finish four batches of five saved answers, progress, back navigation, skip/replacement and sensitive-question avoidance in the starter flow.
- [x] Finish own answer, accepted partner answers, importance, privacy toggle and optional explanation controls.
- [x] Make save/failure state explicit; preserve drafts appropriately across interruption, discard stale drafts safely and scope them to the correct account.
- [x] Add answer review/edit/delete; dropping below twenty pauses discovery eligibility without touching messages.
- [x] Provide a phone-ready internal flow and document startup, enrolment and entry. Phone acceptance remains a manual gate.

## Phone review handoff

Use an isolated backend database with the Phase 2 migration applied. Enrol only the test account by setting `QUESTIONNAIRE_USER_IDS` to its account ID. Set `QUESTIONNAIRE_SCHEMA_READY=true`, `QUESTIONNAIRE_COLLECTION_ENABLED=true`, `QUESTIONNAIRE_SHELL_ENABLED=true` and `QUESTIONNAIRE_MATCHING_ENABLED=false`. Do not use `*` outside an isolated environment.

Start the backend with `npm run dev` from `backend/strath-backend`. Point the mobile environment at that reachable API, then run `node scripts/expo-cli.mjs start` from the mobile root. Open the QR code in Expo Go or the compatible development build. The app scheme is `strathspace`; the direct entry is `strathspace://dating`, and an enrolled account also receives **Question matching preview** on its existing Profile screen.

The root route guard keeps enrolled accounts in the new shell, maps legacy chat deep links into the preserved-conversation screen and prevents retired date/payment entry points from reopening. Discover and Likes clearly remain unavailable while matching is disabled. Existing conversations use the existing conversation and message services and do not show date or checkout prompts in this shell.

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

Implementation evidence recorded 2026-09-21: focused questionnaire TypeScript passed; focused ESLint passed with no findings; three mobile flow unit tests passed; Phase 2 backend TypeScript and all eight PGlite API tests passed; `git diff --check` passed. An initial Expo web bundle compiled 7,379 modules successfully; a later hot rebuild exhausted the Windows Metro process file-handle limit (`EMFILE`) before source compilation and the server was stopped. The user chose to perform the visual review, so device model, OS, screenshots and manual scenario results are intentionally not claimed here.
