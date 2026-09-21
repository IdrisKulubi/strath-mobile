# Phase 4 — Compatible discovery on the phone

Depends on accepted Phases 1–3. Status: draft implementation exists, unverified.

## Outcome and boundary

An eligible test user sees real computed compatibility for synthetic staging profiles on a phone, adjusts filters and compares mutually public answers. This phase can be accepted without mutual likes or messaging creation; those actions remain disabled until Phase 5.

## Work

- [ ] Deploy the Phase 1 engine to a separate staging Railway service; configure HTTPS/service secret in the existing backend only.
- [ ] Validate response schema, revisions, bounded batches, timeout/retry behavior and service authentication against the deployed engine.
- [ ] Finish reciprocal eligibility: explicit genders, age, manual city/radius, visibility/incognito, account state, questionnaire completion, verification and both-direction blocks.
- [ ] Finish deterministic ranking, sufficiently evidenced results first and honest null-score presentation.
- [ ] Review large-pool query cost and pagination; do not silently rank an arbitrary truncated pool as though it were complete.
- [ ] Finish canonical pair cache, revision/version validity, current eligibility recheck and answer/privacy-change races.
- [ ] Finish the browsable Discover list, filter editing, full profile and public-answer comparison screens.
- [ ] Add loading, no candidates, limited evidence, engine unavailable and retry states.
- [ ] Expose only approved profile fields, approximate location, score and evidence. Never expose DOB, precise coordinates, private answers or score contributions.

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
- [ ] All eligibility, ranking, pagination, revision and privacy checks pass.
- [ ] Phone discovery and comparison walkthrough passes without depending on Phase 5.
- [ ] Error/empty/evidence states are visible and understandable on a phone.
- [ ] Performance evidence and phone screenshots/recording are recorded in master.
- [ ] Phase 4 is checked complete before enabling like-to-chat behavior.
