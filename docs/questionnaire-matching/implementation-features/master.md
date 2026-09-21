# Master implementation checklist

Last audited: 2026-09-21. Branch: `revamped`.

**Current state: Phases 1 and 2 are accepted. Phase 3 engineering is complete and awaits the user's phone UI review.**

This is the source of truth for progress. The phase documents define the work and acceptance criteria; this document records what actually exists and what has passed. The architecture and experience documents remain design references, not proof of completion.

## How we work

1. Work on one phase at a time, starting with the earliest incomplete phase.
2. Existing code from a later phase stays in place as an unverified draft. Do not delete it, enable it for users, or treat its presence as acceptance.
3. Finish and test the current phase before starting the next phase. Earlier accepted phases may be used as dependencies; no test may require an unfinished later phase.
4. Every phase must leave a usable, demonstrable result. For UI phases, start the app, make the feature reachable on a phone, run the listed phone checks, and record evidence before advancing. A screenshot of code, typecheck, or browser-only preview is not phone acceptance.
5. Fix failures within the current phase, rerun affected checks, and record the result here. Do not expand scope to unrelated legacy repairs without recording why they block the phase.
6. Check the phase completion box only when **all** its acceptance gates pass. Record the tested revision, environment, commands, results, device evidence where applicable, and remaining limitations. A user interruption is not a passed gate.
7. Preserve user changes, legacy files, booking/payment records, account IDs and conversation history. Keep production flags off until Phase 5 release acceptance.

Checkbox meanings: an implemented item means a file/behavior has been written; a verified item means its stated check passed. An implemented checkbox never implies tested, deployed, or production-ready.

## Phase completion

| Completion | Phase | Current state | Independently testable result |
|---|---|---|---|
| [x] | [1. Foundation and scoring engine](phase-01-foundation-and-engine.md) | Accepted 2026-09-21 | A local Python API calculates documented scores from synthetic inputs. |
| [x] | [2. Questionnaire data and APIs](phase-02-questionnaire-data-and-api.md) | Accepted 2026-09-21 | An authenticated test user saves, resumes, edits and deletes answers in an isolated database without the app or Railway. |
| [ ] | [3. Profile and questionnaire on the phone](phase-03-mobile-onboarding.md) | Implementation complete; phone acceptance pending | A phone user completes a profile and twenty answers, then resumes and edits them. No discovery or new matching needed. |
| [ ] | [4. Compatible discovery on the phone](phase-04-discovery-and-compatibility.md) | Draft backend and screens exist | Verified test users browse ranked profiles and compare permitted answers on a phone, without needing mutual likes or chat. |
| [ ] | [5. Mutual likes, messages and controlled release](phase-05-connections-messaging-and-release.md) | Draft implementation exists | Two test accounts match and exchange messages; preserved history and safe rollback are demonstrated before rollout. |

## Phase 1 checklist

### Implemented
- [x] Write backend architecture, frontend experience and initial roadmap.
- [x] Create this master checklist and five phase documents.
- [x] Add pure Python weighted scoring and deterministic ranking.
- [x] Add FastAPI request/response models, bearer authentication, body-size bound and health endpoint.
- [x] Add Dockerfile, Railway configuration and requirements file.
- [x] Add a shared JSON scoring fixture and Python tests.
- [x] Publish generated OpenAPI, reproducible local run instructions and final contract examples.
- [x] Complete contract/security/performance tests identified in Phase 1.
- [x] Review and freeze the `questionnaire-v1` contract before further integration work.

### Verified
- [x] Thirty-five Python tests pass in both the development and clean virtual environments.
- [x] Test the complete Phase 1 acceptance matrix and manually exercise the local HTTP service.
- [x] Record a repeatable bounded-batch [performance baseline](phase-01-performance-baseline.md).
- [x] Disconnect later-phase route/chat integration drafts from the running legacy app.
- [x] **Phase 1 accepted; Phase 2 may begin.**

## Phase 2 checklist

### Implemented
- [x] Draft additive SQL migration and Drizzle table declarations.
- [x] Draft 100-question catalogue and explicit migration/seed runner.
- [x] Draft state, answer save/delete/skip, preferences and profile APIs.
- [x] Draft private DOB, answer revisions, private-by-default visibility and collection flag.
- [x] Finish schema/API review, readable formatting and validation fixes.
- [x] Separate connection tables and backfill from the Phase 2 migration so this phase does not require Phase 5 behavior.
- [x] Implement the isolated database test harness and reconciliation report.

### Verified
- [x] Current backend typecheck passes.
- [x] Isolated migration, seed rerun and rollback rehearsal pass.
- [x] Answer validation, resume, skip, stale-revision conflict, delete and privacy tests pass.
- [x] Legacy account/profile/message counts and IDs reconcile unchanged.
- [x] **Phase 2 accepted; Phase 3 may begin.**

## Phase 3 checklist

### Implemented
- [x] Finish four-tab mobile shell and mount the enrolment-safe root route guard.
- [x] Finish profile/preferences/photo setup, question editor and answer-management screens.
- [x] Finish private answer controls, account/revision-scoped secure drafts and existing verification navigation.
- [x] Finish four-batch progression, back/skip/revisit handling and network recovery.
- [x] Finish independently reachable development phone flow with separate collection, shell and matching flags.
- [x] Review upload ownership, photo-change verification behavior and draft/session isolation.
- [x] Preserve existing conversation access in the new shell without date or checkout prompts.

### Verified
- [x] Changed mobile files pass focused type/lint checks; unrelated repository errors are documented separately.
- [ ] Development app opens on the target phone and the new onboarding route is reachable.
- [ ] Complete twenty answers, terminate/reopen, edit/delete, skip/revisit and retry failed saves on a phone.
- [ ] Check light/dark themes, keyboard, large text, screen reader labels, back navigation and touch targets.
- [ ] Record device/build and visual evidence; complete a user-visible phone walkthrough.
- [ ] **Phase 3 accepted; Phase 4 may begin.**

## Phase 4 checklist

### Implemented
- [x] Draft candidate eligibility, service client, revision-keyed cache and discovery APIs.
- [x] Draft discovery list, filters and profile/answer comparison screens.
- [ ] Finish eligibility/privacy review, large-pool behavior, cache races and stable pagination.
- [ ] Deploy and validate a staging Railway engine with backend-only credentials.
- [ ] Finish discovery-specific monitoring and safe unavailable/empty states.

### Verified
- [ ] Backend-to-engine contract and cached/outage/revision-change tests pass.
- [ ] Reciprocal preferences, blocks, age, visibility, verification and privacy checks pass.
- [ ] Phone displays seeded rankings, honest evidence states, editable filters and public-only comparisons.
- [ ] No private answers, DOB, precise coordinates or per-answer score contributions reach another user.
- [ ] Record phone/network/error-state evidence and staging latency results.
- [ ] **Phase 4 accepted; Phase 5 may begin.**

## Phase 5 checklist

### Implemented
- [x] Draft likes, canonical connections, conversation creation and unmatching.
- [x] Draft independent chat authorization and legacy conversation backfill.
- [x] Draft received/sent likes, messages, new chat screen and block/report actions.
- [x] Draft separate collection/matching/shell flags and a small set of operational events.
- [ ] Finish concurrency/idempotency and legacy coexistence review.
- [ ] Finish match notifications, delivery/read behavior, chat safety and complete event coverage.
- [ ] Finish reconciliation tooling, account-data lifecycle, deployment runbook and rollback handling.

### Verified
- [ ] Simultaneous/repeated likes create one connection and preserve existing conversation IDs.
- [ ] Unauthorized, blocked and unmatched users cannot read/send through any chat endpoint.
- [ ] Two phone sessions complete like → match → message → read → unmatch/block without dates or payment.
- [ ] Migration rehearsal preserves history and never revives inactive relationships.
- [ ] Engine outage and feature rollback preserve new and existing conversations safely.
- [ ] Internal staging pilot and complete phone acceptance pass.
- [ ] Production deployment/configuration and controlled cohort rollout are verified.
- [ ] **Phase 5 accepted; release complete.**

## Evidence register

| Date | Check | Actual result | Meaning |
|---|---|---|---|
| 2026-09-21 | Initial `services/questionnaire-matching/.venv/Scripts/python.exe -m pytest services/questionnaire-matching/tests -q` run | 7 passed; one third-party deprecation warning | Historical early subset, superseded by the final 35-test runs below. |
| 2026-09-21 | Backend `node node_modules/typescript/bin/tsc --noEmit --pretty false` | Failed on inferred questionnaire state types | A typing change was subsequently drafted, but no successful rerun is recorded. |
| 2026-09-21 | Mobile `node node_modules/typescript/bin/tsc --noEmit --pretty false` | Failed; output includes existing-screen `StyleSheet.absoluteFillObject`, discovery decision types and test configuration errors | No successful app-wide typecheck. Baseline comparison and focused new-file checks still needed. |
| 2026-09-21 | Isolated database migration/backfill | Not run | Migration safety is unverified. Downloading test tooling is not a test pass. |
| 2026-09-21 | Railway deployment/integration | Not run | Config files exist; service is not verified deployed. |
| 2026-09-21 | Phone preview / iOS / Android walkthrough | Not run | All UI work remains draft. |
| 2026-09-21 | Fresh `.cache/phase1-clean-venv` install from `requirements-dev.txt`, then `pytest` and `pip check` | 35 passed; dependencies consistent; one Starlette/httpx deprecation warning | Phase 1 reproduces in a clean local environment. Warning is in pinned third-party test tooling and does not affect runtime behavior. |
| 2026-09-21 | `node --experimental-strip-types contracts/questionnaire-matching/validate-fixtures.ts` | 6 shared examples validated | Independent TypeScript calculation agrees with Python for every frozen contract example. |
| 2026-09-21 | Regenerate and hash OpenAPI/examples/fixture | Hashes unchanged | Contract artifact generation is deterministic and matches executable code. |
| 2026-09-21 | Live Uvicorn `/health` and authenticated `/v1/rank` | HTTP 200; `questionnaire-v1`; asymmetric result `84.8528137423857`, ready, 10 evidence questions | Standalone local service works without database, Next.js, Expo or Railway. |
| 2026-09-21 | 50-run maximum-bound validation/scoring benchmark | 25 candidates × 500 answers; 1,168,381 bytes; median 35.842 ms; p95 47.49 ms; peak 13.701 MiB | Local processing baseline recorded; Railway end-to-end evidence remains Phase 4 work. |
| 2026-09-21 | Packaging/static safety tests and `git diff --check` | Passed; Docker CLI unavailable locally | Runtime dependency separation, non-root image declaration, `PORT`, Railway healthcheck and whitespace checks pass. Actual image/staging deployment remains Phase 4. |
| 2026-09-21 | Search running layout/chat files for `QuestionnaireRouteGate` and `chatAccess` | No matches | Later-phase drafts cannot intercept legacy routing or chat authorization in Phase 1. |
| 2026-09-21 | Phase 2 PGlite migration/API suite | 8/8 passed | Migration/seed idempotency and rollback, legacy reconciliation, authorization, validation, twenty-answer resume, privacy, analytics and photo verification integration passed without Expo or Railway. |
| 2026-09-21 | Backend TypeScript and focused Phase 2 ESLint | Passed | Accepted Phase 2 implementation compiles and the changed modules have no lint findings. |
| 2026-09-21 | Full backend test suite | 221/222 passed | Phase 2 tests passed; one unrelated existing face-verification expectation failed and reproduces alone. |
| 2026-09-21 | Phase 1 Python regression | 35/35 passed | Questionnaire data/API work did not regress the accepted scoring engine. |
| 2026-09-21 | Phase 3 focused mobile TypeScript and ESLint | Passed | New onboarding, shell, questionnaire, verification-return, route-guard and preserved-message code has no focused type or lint findings. |
| 2026-09-21 | Phase 3 questionnaire flow unit tests | 3/3 passed | Four batches, skip replacement/sensitive exclusion and account-question-revision draft isolation behave deterministically. |
| 2026-09-21 | Phase 3 backend regression | TypeScript passed; Phase 2 PGlite suite 8/8 passed | Public experience flags work independently of collection while accepted questionnaire behavior remains intact. |
| 2026-09-21 | Phase 3 Expo web compile | Initial bundle compiled 7,379 modules; later hot rebuild stopped with Windows Metro `EMFILE` | Source compiled once; the later process-level file-handle exhaustion is documented for the phone handoff and is not claimed as device acceptance. |
| 2026-09-21 | Phase 3 phone UI review | Delegated to user; no device evidence recorded | Engineering is complete, but Phase 3 remains unchecked until the user records a real-phone walkthrough. |

## How to record future acceptance

For each completed phase append:

- Phase and tested Git revision (or explicitly identify the uncommitted working-tree snapshot).
- Date, tester and environment; never record credentials.
- Exact commands/test names and pass/fail counts.
- Device model, OS, Expo/development-build version and reachable route for UI work.
- Screenshot/video/artifact paths and manual scenario results.
- Regression checks against previously accepted phases.
- Remaining limitations and whether they block acceptance.
- Only then update both the phase acceptance box and the completion table.

**Next action:** user performs the Phase 3 phone review using the handoff in the phase document. Record device evidence and manual results before checking Phase 3 accepted or beginning Phase 4. Keep Phase 4–5 drafts parked and unverified.
