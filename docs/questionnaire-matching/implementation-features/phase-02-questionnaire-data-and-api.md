# Phase 2 — Questionnaire data and APIs

Depends on accepted Phase 1. Status: draft implementation exists, unverified.

## Outcome and boundary

Using an isolated PostgreSQL database and existing authentication, a test user can save a profile/preferences, answer questions, resume, edit and delete. Demonstrate it through API calls; Expo and the Railway engine are not required.

This phase owns question storage and validation, not discovery ranking or mutual-match creation. The drafted migration currently includes connection tables/backfill: split or safely defer backfill to Phase 5, while allowing empty additive tables to exist. Do not let questionnaire acceptance depend on unfinished connection semantics.

## Work

- [ ] Review SQL/Drizzle parity, foreign keys, indexes, private DOB storage and immutable published question versions.
- [ ] Finish idempotent migration/seed runner and an isolated test database harness. Never point tests at the production database.
- [ ] Review all 100 original questions/options; distinguish common starter, replacement and sensitive questions. Count only saved, published answers toward twenty.
- [ ] Finish authenticated status, question catalogue, answer save/edit/delete/skip, preferences and profile endpoints.
- [ ] Validate own-answer and acceptable-option membership, explicit gender interests, adult DOB/calendar dates, age range and location restrictions.
- [ ] Keep university/course/year optional; use existing storage and face verification, including photo ownership and verification behavior after photo changes.
- [ ] Enforce private-by-default answers, revision conflicts and cache invalidation contracts without needing the engine to run.
- [ ] Ensure data access is scoped to the authenticated user and collection can be enabled independently.
- [ ] Record questionnaire start/completion/progress without raw answers, DOB or message content in analytics.

## Independent test procedure

1. Create a disposable PostgreSQL database containing the required existing identity/profile tables and synthetic accounts.
2. Capture before counts/IDs for accounts, profiles and messages. Apply the new questionnaire migration and seed; rerun the supported runner to verify idempotency.
3. Use two authenticated accounts to fetch questions and submit twenty answers in batches. Reconnect and confirm exact saved progress.
4. Test skipped questions do not count; answer edit/delete increases revision; concurrent stale saves return a conflict rather than overwriting.
5. Attempt invalid options, underage/invalid dates, empty preferences, malformed payloads and cross-user writes. Verify appropriate errors and no data leakage.
6. Disable the Python engine entirely: all questionnaire/profile operations must still work.
7. Compare after counts/IDs and exercise legacy account/profile reads. Verify no fabricated answers or lost history.
8. Run backend typecheck and focused database/API tests. Record failures separately from unrelated baseline issues.

## Acceptance gate

- [ ] Isolated migration and seed rehearsal passes with unchanged legacy records.
- [ ] Questionnaire endpoints pass success, invalid-input, conflict, privacy and authorization tests.
- [ ] Backend typecheck for the accepted implementation passes.
- [ ] Test users can resume and reach twenty answers through APIs with no engine or UI dependency.
- [ ] Photo and verification integration is verified, not merely linked in the UI.
- [ ] Evidence is recorded and Phase 2 is checked complete in master.

Only then begin Phase 3. Production database changes remain deferred to Phase 5.
