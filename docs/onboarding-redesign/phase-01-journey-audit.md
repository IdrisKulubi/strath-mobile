# Phase 01: Journey inventory and behavior map

Status: Done
Dependencies: None
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Map every active onboarding path and existing data contract before changing UI.

Deliverable: A verified journey map, baseline evidence, and a bounded component/route migration list.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

app/index.tsx; app/_layout.tsx; app/(auth)/; app/onboarding/index.tsx; app/dating-setup.tsx; app/questions.tsx; app/verification.tsx; components/onboarding/; lib/questionnaire-flow.ts; route/session helpers discovered from these entry points.

## Checklist

- [x] Trace new users, returning users, incomplete profiles, verified/unverified users, and legacy/new cohorts through route guards and deep links.
- [x] Create [journey-map.md](journey-map.md): route, component, cohort, entry/exit guard, required data, save endpoint, draft storage, next route, and owning phase for every active screen.
- [x] Inventory welcome, terms, account/recovery/code entry if present, name/DOB/gender/location, desired genders/age/intention/radius, optional campus fields, photos/bio/prompts, verification, questions, milestones, and final handoff. Current auth screen uses provider login; no email/password or OTP UI is present in that route.
- [x] Confirm five importance weights and public/private comparison semantics against backend contracts. Document existing required/optional fields and feature gates.
- [x] Identify reusable primitives, duplicate flows, baseline lint/typecheck/test results, and existing cohort rollout controls. Record gaps without guessing.
- [x] Create a route-by-route acceptance matrix. No native runtime or emulator was available for baseline screenshots; this limitation is recorded in the map and carried into Phase 02/08 visual acceptance.

## Acceptance

- [x] Every active onboarding surface has an owner phase and a traced route; legacy and cohort-only screens are labeled with evidence.
- [x] The twenty-answer eligibility rule, explicit Save boundary, draft strategy, and privacy behavior are documented.
- [x] No route, validation, or production UI behavior was changed in this phase.

## Scope boundary

No UI implementation, route removal, schema changes, or new product requirements.

## Evidence and handoff

- Changed files/commit: `docs/onboarding-redesign/journey-map.md`, this phase file, and `master.md`; no commit created. Existing staged user changes preserved.
- Checks run and results: questionnaire TypeScript check passed via `node node_modules/typescript/bin/tsc --project tsconfig.questionnaire.json --pretty false`; questionnaire flow tests passed 3/3 via `node --experimental-strip-types --test lib/questionnaire-flow.test.mjs`. Repository lint via `node node_modules/expo/bin/cli lint` failed at the existing baseline with 175 errors and 52 warnings across the repository. `npm run` itself could not start because the local npm shim points to a missing `npm-cli.js`; direct Node commands were used for valid baselines. Documentation links and `git diff --check` checked after edits.
- Screenshots/recording and device/theme: None. `adb` and `xcrun` were unavailable, with no app session supplied. Native visual evidence is required during implementation phases.
- Remaining blockers or unavailable checks: No deploy-time cohort IDs/flags, live accounts, or native runtime for validating the possible shell/onboarding redirect conflict. This is a Phase 07/08 rollout check, not a blocker to building the isolated Phase 02 preview.
- Deviations from the approved contract: None.
- Next action: Phase 02 can build the reusable Rising sheet preview, preserving current production routes. Before switching traffic, test the gate conflict described in `journey-map.md`.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
