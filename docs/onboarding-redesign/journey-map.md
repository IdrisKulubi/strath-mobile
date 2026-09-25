# Phase 01 journey map and acceptance matrix

Audited: 2026-09-24. Source: current workspace code, including pre-existing staged changes. This maps code paths, not live production traffic. An active route is one referenced by current navigation or registered in the Expo app tree; deployment flags determine which users actually see questionnaire screens.

## Route and cohort decisions

1. Before root navigation, `app/_layout.tsx` shows `LaunchExperience`: first-launch brand intro and intro slides if the intro-complete flag is absent, or a returning-user splash otherwise. On completion, root `/` loads a SecureStore auth token. No token routes to `/(auth)/login`. A matching cached profile routes immediately using `getProfileRoute`; its server refresh runs in the background. Without a cache, `GET /api/user/me` determines route. Network failure falls through to `/(tabs)`, while explicit profile-not-found goes to `/onboarding`. Auth expiry is handled centrally. Sources: `app/_layout.tsx`, `components/intro/launch-experience.tsx`, `app/index.tsx`, `lib/profile-access.ts`, `lib/session-cache.ts`.
2. `getProfileRoute` sends absent/incomplete profile to `/onboarding`, complete but unverified profile to `/verification`, verified waitlisted profile to `/waitlist`, otherwise to `/(tabs)`. Face verification may be explicitly waived by `faceVerificationRequired === false`. The tab layout repeats this server-profile guard. Sources: `lib/profile-access.ts`, `app/(tabs)/_layout.tsx`.
3. The root `QuestionnaireRouteGate` asks `GET /api/v2/questionnaire/experience`. If `shell` is enabled for the signed-in account, it allows its listed questionnaire routes and redirects other paths to `/dating` (with mappings for legacy chat paths). If identity fetch fails it leaves children visible; if experience fetch fails it shows Retry. This gate wraps the root navigator, so `/onboarding`, `/(auth)`, and `/waitlist` are outside its explicit allowlist. Their interaction with a shell-enabled incomplete profile needs a routed device test before any rollout; the code alone suggests a possible redirect conflict. Sources: `app/_layout.tsx`, `components/questionnaire/route-gate.tsx`.
4. Questionnaire flags require `QUESTIONNAIRE_SCHEMA_READY=true`, the user ID in `QUESTIONNAIRE_USER_IDS` (or `*`), and the respective `QUESTIONNAIRE_COLLECTION_ENABLED`, `QUESTIONNAIRE_MATCHING_ENABLED`, or `QUESTIONNAIRE_SHELL_ENABLED` switch. Collection gates status, profile, question and answer endpoints; matching additionally gates discovery. This is the existing cohort control, not a visual-redesign flag. Sources: `backend/strath-backend/src/lib/questionnaire/flags.ts`, `phase2-api.ts`, `phase4-api.ts`.
5. `/(auth)/register` renders the same login component. The visible methods are Google, Apple when available, and demo when the public feature flag permits. The app has no email/password or OTP form in these routes. After sign-in it fetches `/api/user/me` and applies `getProfileRoute`. A network error lands in tabs. Sources: `app/(auth)/login.tsx`, `register.tsx`.
6. The legacy profile journey is an eight-state in-memory flow at `/onboarding`: welcome → terms/privacy/community agreements → name/phone → DOB-derived age/gender/desired genders/relationship goal → campus/location → photos → profile prompt → celebration/submission. A successful `PATCH /api/user/me` goes to waitlist or verification. Current `step` and `formData` are component state, with no durable beat resume found in this route. Returning to the route after process death starts at state 0, although name may rehydrate from account data. Sources: `app/onboarding/index.tsx`, `components/onboarding/*`.
7. The questionnaire path is entered from `/dating`: profile setup opens `/dating-setup`; answers open `/questions`. Setup is one long local-state form that sends preferences, then profile, as two separate saves. It offers verification with `returnTo=/questions` and a direct Continue to questions. Questions are individually saved through `PUT answers`, grouped into milestones of five, and can be reviewed or edited. Sources: `app/dating/index.tsx`, `app/dating-setup.tsx`, `app/questions.tsx`.
8. Verification at `/verification` checks latest verification session and profile status. It accepts only a small `returnTo` allowlist; otherwise it returns to tabs. It needs camera permission and at least two supported profile photos for submission. Pending, failed, retry, assistance and verified states use the existing hooks/route. Sources: `app/verification.tsx`, `hooks/use-face-verification.ts`, `components/verification/*`.

## Screen and data inventory

| Route / active surface | Cohort and entry | Required / optional input | Commit and draft location | Exit / owner phase |
| --- | --- | --- | --- | --- |
| Root `LaunchExperience` overlay | All launches before navigator; first-launch slides or returning splash based on intro storage | Intro continuation | Intro-complete state in `lib/intro-storage.ts`; no profile save | Root navigator; 03 |
| `/` bootstrap | All launches; token/profile cache/HTTP | No form | Token and minimal routing snapshot in SecureStore; no form save | Login, onboarding, verification, waitlist, tabs; 07 |
| `/(auth)/login` and `/(auth)/register` alias | No auth or explicit return to auth; Google/Apple/demo availability | Provider credentials handled by provider | Auth session in SecureStore; profile cache | `getProfileRoute`; 03 |
| `/onboarding` welcome | Incomplete/absent legacy profile | Start choice | In-memory step 0 | Terms; 03 |
| `/onboarding` terms | Legacy profile flow | Three explicit checks: terms, privacy, community | Local checkbox state; no separate acceptance API seen here | Essentials; 03 |
| `/onboarding` essentials | Legacy profile flow; may prefill name | First and last name, phone step | In-memory parent state; no intermediate server commit | Core profile; 04 |
| `/onboarding` core profile | Legacy profile flow | DOB/age at least 18, gender, looking-for, relationship goal; zodiac computed | In-memory parent state | Campus; 04 |
| `/onboarding` campus basics | Legacy profile flow | Year of study choice, 3–10 interests, location permission choice; precise location can be declined | In-memory parent state | Photos; 04 |
| `/onboarding` photos | Legacy profile flow | At least two photos in UI; up to six; camera/library | Local picker URIs until final upload in parent submit | Prompt; 05 |
| `/onboarding` profile prompt/celebration | Legacy profile flow | Selected prompt with at least 10 response characters; parent trims to 150 chars | Final upload and `PATCH /api/user/me`; parent sets profile completed | Waitlist or verification; 05, 07 |
| `/dating` questionnaire home | Cohort with shell/collection; explicit nav or route replacement | No form | `GET status`, then `GET discovery` if eligible | Setup, questions, discovery; 07 |
| `/dating-setup` | Questionnaire home or 428 recovery | Name, private DOB 18+, gender, desired genders, 18–100 age range, city, intention, bio at least 10 chars, 1–6 photos; coordinates/radius optional; university/course/year optional | Local state; `PUT preferences` then `PUT profile`; no durable setup draft found | Verification or questions; 04, 05 |
| `/verification` | Incomplete verification or setup; returnTo allowlist | Camera/selfie and two supported photos for submission | Session API via `useFaceVerification`; server status authoritative | Tabs or allowed return path; 05 |
| `/questions` answer editor | Collection-enabled cohort; questionnaire home/setup | One answer ID, nonempty acceptable IDs, five-value importance, explicit visibility, optional explanation max 500 chars | Per-question SecureStore draft scoped by user/question/revision; explicit `PUT answers` | Next question, milestone, review, dating home; 06 |
| `/questions` milestone/review/complete | After five successful answers, manual review, or 20 saved | No new fields; edits/deletes optional | Server answer count/revision | Questions or dating home; 07 |
| `/waitlist` / `/(tabs)` / `/dating` discovery | Depends on profile/admission/shell/matching | Existing eligibility | Server checks; no onboarding draft | Handoff; 07 |

`/dating-setup` has both a verification action and a direct questions action. Entering questions does not itself prove discovery readiness; the backend discovery endpoint returns 428 until all gates pass.

### API contracts that cannot drift during visual migration

- `PUT /api/v2/questionnaire/preferences`: valid DOB with adult age, one or more explicit desired gender values, age bounds, city, optional coordinate pair and radius, one or more intentions. Coordinates are paired; radius requires coordinates. Source: `contracts.ts`, `phase2-service.ts`.
- Legacy `/onboarding` uses different fields: age derived from a date picker, relationship goal, desired-gender choice, year-of-study choice, 3–10 interests, 2–6 photos, phone, and a chosen profile prompt. It commits a `PATCH /api/user/me` with `profileCompleted`/`isComplete`; its component-level requirements should not be mistaken for the questionnaire endpoint contract. Source: `app/onboarding/index.tsx`, `components/onboarding/core-profile-step.tsx`, `campus-basics-step.tsx`, `PhotoMoment.tsx`, `profile-prompt-step.tsx`.
- `PUT /api/v2/questionnaire/profile`: name, gender, bio length 10–1500, 1–6 public-storage photo URLs; education fields optional. It requires saved adult DOB and preferences. Changing photos resets verification status. Source: `contracts.ts`, `phase2-service.ts`.
- `PUT /api/v2/questionnaire/answers`: answer ID and acceptable option IDs from the published question, one of weights **0, 1, 10, 50, 250**, explicit public boolean, explanation up to 500 chars, current revision. Default public is false at validation. Mismatched revision is 409; a successful save increments revision and recounts published answers. Source: `contracts.ts`, `phase2-service.ts`.
- `POST skip` records a skipped question but does not increase answer count; `DELETE answers` can decrease it. Only the first 20 starter answers avoid sensitive questions in the client selection logic. Source: `phase2-service.ts`, `lib/questionnaire-flow.ts`.
- `public=false` removes an answer from the mutually public comparison view, but scoring loads answer/acceptable/weight without a public filter. The Python engine uses weights in satisfaction totals. **Dealbreaker is a 250 weight, not a hard filter.** Source: `phase4-service.ts`, `services/questionnaire-matching/engine.py`.
- Discovery requires an undeleted adult user, **at least 20 published answers**, saved preferences, completed and visible profile, unpaused/nonanonymous discovery, verified face, and reciprocal gender/age/intention/location eligibility. Matching flag is a separate endpoint gate. Failure to meet readiness yields HTTP 428. Source: `eligibility.ts`, `phase4-service.ts`, `phase4-api.ts`.

## Existing primitives and migration order

- Reuse `lib/design-tokens.ts`, `lib/onboarding-theme.ts`, `onboarding-screen-shell.tsx`, backdrop, choice row, primary button, header, progress bar, intro presentation, and verification shell. Phase 02 should extend these rather than build a second visual system.
- The current question view already has `BeatReveal`, option rows/chips, segmented progress, draft restore, and review. Its follow-ups still accumulate down the same page, importance still uses a slider, and visibility/explanation live in More. Phase 06 replaces interaction while retaining API and draft behavior.
- Legacy `/onboarding` state and questionnaire `/dating-setup` duplicate profile collection but save to different APIs. Phase 04 must choose route/cohort ownership based on the mapped guards; do not merge the payloads by appearance alone.
- The minimum existing cohort switch is `QUESTIONNAIRE_USER_IDS` plus collection/matching/shell flags. It cannot independently stage the Rising sheet on legacy screens. Phase 02 should keep new presentation behind an isolated preview; Phase 03/04 need a deliberate, reversible visual switch or scoped cohort delivery after route tests. No rollout variable is defined here.

## Route acceptance matrix for later phases

| Scenario | Expected result | Phase |
| --- | --- | --- |
| First launch slides versus returning splash; no token, Google/Apple cancel or success, demo hidden/shown | Intro completion and login remain usable; success resolves actual account route; cancel retains screen | 03 |
| Incomplete legacy profile, app restart, offline with/without cache | Correct route and draft/resume messaging; no auth loop or false completion | 03, 04, 07 |
| Shell-enabled incomplete profile deep link to onboarding or waitlist | One stable route, no redirect loop; resolve gate conflict before rollout | 01 finding, 07 |
| Already completed profile; unverified/waived/verified/waitlisted | Correct verification, waitlist, or tabs destination | 05, 07 |
| Underage, invalid/empty DOB, missing desired genders, bad age/radius | Continue blocked with local explanation; server contract unchanged | 04 |
| Location denied, city provided | Setup remains possible using city | 04 |
| Photo library/camera denied, upload failed, photo changed | Retry without lost fields; verification reset if photos change | 05 |
| Verification pending, failed, retry, success, interrupted | Status and next route reflect server state | 05 |
| Question tap, multi-select/select-all, importance, visibility/note, Back | One active beat, correct five weights and privacy, edits restore values | 06 |
| Offline save, 409 revision, rapid taps, skip, delete, process restart | Draft remains honest, no duplicate save, counts correct | 06, 07 |
| 5/10/15 milestone and 20 saved; delete to 19 | Milestone/resume works; discovery pauses below threshold | 07 |
| Public/private answers with same inputs | Matching score uses both; comparison exposes only mutually public answers | 06, 08 |
| Reduced motion, large text, screen reader, keyboard, small phone, dark/light | Every beat reachable and understandable | 02–08 |

## Baseline verification and unavailable evidence

- Repository had user changes staged before this audit, including questionnaire components, route and design files. The audit did not reset or modify them.
- `npm run ...` failed before scripts ran because this machine's npm shim points at a missing `npm-cli.js`. Direct Node invocations worked: questionnaire TypeScript check **passed**; questionnaire flow tests **3/3 passed**. Lint result is recorded in the phase document after completion.
- No Android `adb` or iOS `xcrun` command was available in this Windows shell, and no running app session was supplied. Native screenshots/recordings could not be collected in this static audit. Concept images are not baseline UI evidence. Device checks remain explicit acceptance work for later phases.
- This map is a static trace; deploy-time environment values, active cohort IDs, and live account/profile state were not available. Verify those in a safe environment during rollout preparation.

## Migration risks to carry forward

1. `QuestionnaireRouteGate` appears able to redirect shell-enabled users away from legacy onboarding or waitlist because those routes are not allowlisted. Validate with real navigation states.
2. Legacy onboarding stores intermediate answers only in component state. Relaunch can restart the experience, so persistence needs deliberate design.
3. Questionnaire setup sends two separate writes; a preferences success followed by profile failure leaves a partial server state. UI must describe and recover from it.
4. Legacy profile requires two photos for its picker step; questionnaire profile API accepts one photo, while verification submission currently asks for two supported photos. Preserve the actual gate and explain the difference.
5. Current question draft is revision-scoped in SecureStore; a stale revision invalidates it. A new beat implementation must keep conflict recovery without silently dropping user input.
