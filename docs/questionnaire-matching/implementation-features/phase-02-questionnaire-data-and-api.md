# Phase 2 — Questionnaire data and APIs

Depends on accepted Phase 1. Status: **accepted 2026-09-21** on the uncommitted `revamped` working-tree snapshot.

## Outcome and boundary

Using an isolated PostgreSQL database and existing authentication, a test user can save a profile/preferences, answer questions, resume, edit and delete. Demonstrate it through API calls; Expo and the Railway engine are not required.

This phase owns question storage and validation, not discovery ranking or mutual-match creation. The drafted migration currently includes connection tables/backfill: split or safely defer backfill to Phase 5, while allowing empty additive tables to exist. Do not let questionnaire acceptance depend on unfinished connection semantics.

## Work

- [x] Review SQL/Drizzle parity, foreign keys, indexes, private DOB storage and immutable published question versions.
- [x] Finish idempotent migration/seed runner and an isolated test database harness. Never point tests at the production database.
- [x] Review all 100 original questions/options; distinguish common starter, replacement and sensitive questions. Count only saved, published answers toward twenty.
- [x] Finish authenticated status, question catalogue, answer save/edit/delete/skip, preferences and profile endpoints.
- [x] Validate own-answer and acceptable-option membership, explicit gender interests, adult DOB/calendar dates, age range and location restrictions.
- [x] Keep university/course/year optional; use existing storage and face verification, including photo ownership and verification behavior after photo changes.
- [x] Enforce private-by-default answers, revision conflicts and cache invalidation contracts without needing the engine to run.
- [x] Ensure data access is scoped to the authenticated user and collection can be enabled independently.
- [x] Record questionnaire start/completion/progress without raw answers, DOB or message content in analytics.

## Accepted API surface

All routes are under `/api/v2/questionnaire`, require the existing authenticated session or bearer fallback, and require the questionnaire collection flag for the authenticated user.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/status` | Own revision, private DOB, preferences, skipped IDs and saved-answer progress. |
| `GET` | `/questions` | Published catalogue plus only the authenticated user's saved answers. |
| `GET` | `/profile` | The authenticated user's existing profile and verification state. |
| `PUT` | `/answers` | Create or edit one answer using optimistic revision control. |
| `DELETE` | `/answers` | Delete one answer using optimistic revision control. |
| `POST` | `/skip` | Record a skipped published question without increasing the answer count. |
| `PUT` | `/preferences` | Save private DOB and explicit discovery preferences. |
| `PUT` | `/profile` | Save the existing profile, validate photo ownership, and enqueue existing photo services. |

Answer revisions are the Phase 2 cache-invalidation contract. Phase 4 caches must key results by both users' current revisions and the algorithm version; Phase 2 does not create or call a matching cache.

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

- [x] Isolated migration and seed rehearsal passes with unchanged legacy records.
- [x] Questionnaire endpoints pass success, invalid-input, conflict, privacy and authorization tests.
- [x] Backend typecheck for the accepted implementation passes.
- [x] Test users can resume and reach twenty answers through APIs with no engine or UI dependency.
- [x] Photo and verification integration is verified, not merely linked in the UI.
- [x] Evidence is recorded and Phase 2 is checked complete in master.

Only then begin Phase 3. Production database changes remain deferred to Phase 5.

## Acceptance evidence

- Environment: Windows local workspace; PGlite `0.3.14` disposable PostgreSQL-compatible databases; no Railway engine, Expo app, or production database.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`: passed.
- Focused ESLint over the Phase 2 files: passed with no findings.
- `tsx --test src/lib/questionnaire/phase2.test.ts`: 8/8 passed. This covers seed rerun, immutable published versions, failed-migration rollback, unchanged legacy account/profile/message rows, authentication, feature availability, user scoping, adult calendar dates, private DOB storage, twenty-answer resume, skips, option validation, stale conflicts, edit/delete revisions, private defaults, analytics minimization, owned photo URLs, photo hooks, and verification reset.
- Full backend suite: 221/222 passed. The sole failure is the pre-existing `face-verification-decision.test.ts` expectation for `multiple_target_faces`; it reproduces alone and does not execute Phase 2 code. The focused photo integration check passed.
- Phase 1 regression: 35/35 Python matching-engine tests passed.
- `git diff --check`: passed; Git reported only expected Windows line-ending notices.
- Production migration and feature flags were not changed.
