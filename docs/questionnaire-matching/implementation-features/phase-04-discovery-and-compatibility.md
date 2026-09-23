# Phase 4 — Compatible discovery on the phone

Depends on accepted Phases 1–3. Status: local engineering and automated verification complete; Railway staging and the user's phone review remain open.

## Outcome and boundary

An eligible test user sees real computed compatibility for synthetic staging profiles on a phone, adjusts filters and compares mutually public answers. This phase can be accepted without mutual likes or messaging creation; those actions remain disabled until Phase 5.

## Work

- [ ] Deploy the Phase 1 engine to a separate staging Railway service; configure HTTPS/service secret in the existing backend only.
- [ ] Validate response schema, revisions, bounded batches, timeout/retry behavior and service authentication against the deployed engine. The same checks pass locally against a live FastAPI process.
- [x] Finish reciprocal eligibility: explicit genders, age, manual city/radius, visibility/incognito, account state, questionnaire completion, verification and both-direction blocks.
- [x] Finish deterministic ranking, sufficiently evidenced results first and honest null-score presentation.
- [x] Review large-pool behavior and pagination. Rank the complete bounded pool before paging, use batches of at most 25, and return an explicit retryable error when the 2,000-candidate safety bound would truncate results.
- [x] Finish canonical pair cache, revision/version validity, current eligibility recheck and answer/privacy-change races.
- [x] Finish the browsable Discover list, filter editing, full profile and public-answer comparison screens.
- [x] Add loading, no candidates, limited evidence, engine unavailable and retry states.
- [x] Expose only approved profile fields, approximate location, score and evidence. Never expose DOB, precise coordinates, private answers or score contributions.

## Staging deployment handoff

1. Create a Railway service with root directory `services/questionnaire-matching`; its existing `railway.toml` builds the Dockerfile and checks `/health`.
2. Set a new `MATCHING_SERVICE_SECRET` on that service. Set the same value and the service's HTTPS URL as `MATCHING_SERVICE_SECRET` and `MATCHING_SERVICE_URL` on the Next.js backend. Never expose either value to Expo.
3. Apply migrations through `npm run migrate:questionnaire` against an isolated staging database. This applies `0038` before the additive `0039_questionnaire_discovery.sql` migration.
4. Enrol synthetic account IDs with `QUESTIONNAIRE_USER_IDS`. Enable schema and collection first, then shell and matching for only those IDs.
5. Run the independent procedure below and record Railway region, deployed revisions, response latency and memory. Do not record secrets, raw answers or message content.

The Railway CLI and linked credentials are not present in this workspace, so deployment is deliberately left unchecked rather than inferred from configuration files.

## Independent test procedure

1. Seed verified synthetic adult profiles with controlled answer patterns and explicit reciprocal preferences. No likes or conversations are needed.
2. Verify expected score order and stable ties using Phase 1 fixtures through the real backend-to-Railway path.
3. Test exclusions independently: underage/invalid DOB, blocked, suspended/deleted, hidden/incognito, incomplete, unverified and incompatible preferences. Never widen a strict filter automatically.
4. Change answers while discovery is in flight. Ensure stale cache entries/revisions are not shown. Make a public answer private and confirm comparison stops returning it immediately.
5. Stop the engine: valid revision-matched cache may work; uncached requests show a retryable failure. Questionnaire save and existing messages remain independent.
6. On a real phone, browse, open a profile, adjust filters, see insufficient-evidence states and compare public answers. Capture the actual display and network-error recovery.
7. Inspect API responses/logs for unintended data; record bounded-pool latency and memory without real user content.

## Acceptance gate

- [ ] Staging service authentication/contract/failure tests pass.
- [x] All local eligibility, ranking, pagination, revision and privacy checks pass.
- [ ] Phone discovery and comparison walkthrough passes without depending on Phase 5.
- [ ] Error/empty/evidence states are visible and understandable on a phone. The states are implemented and pass focused type/lint checks; device review remains the user's gate.
- [ ] Performance evidence and phone screenshots/recording are recorded in master.
- [ ] Phase 4 is checked complete before enabling like-to-chat behavior.
