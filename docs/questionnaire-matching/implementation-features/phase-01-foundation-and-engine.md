# Phase 1 — Foundation and scoring engine

Status: **accepted on 2026-09-21** from the uncommitted `revamped` working-tree snapshot. See [master checklist](master.md) for evidence.

## Outcome and boundary

A standalone local Python matching API accepts synthetic answers and produces a documented, repeatable result. It must work without a database, account service, Expo app or Railway deployment. This establishes the contract that later phases consume.

Keep the backend/mobile integration code already drafted for later phases parked. Preserve user changes and legacy features. Audit the draft route guard and chat integration for flag-off behavior before any preview/release; do not let unfinished APIs gate the legacy app.

## Work

- [x] Review the architecture and experience references against confirmed decisions; keep only matching/ranking on Railway.
- [x] Review the pure engine: directional weighted satisfaction, geometric mean, weights 0/1/10/50/250, ten mutually weighted shared questions, immutable version IDs, null insufficient score and stable ties.
- [x] Review API validation, reject duplicate questions/candidates and self comparisons, limit IDs/answer arrays and actual body bytes, and fail closed without the service secret.
- [x] Generate and check in OpenAPI; document schemas, request examples, response examples and algorithm version.
- [x] Add shared examples for perfect, asymmetric, zero agreement, sparse evidence, zero weights and version mismatch; validate them from Python and TypeScript without a database.
- [x] Write local installation/start/test instructions and environment example with placeholders only.
- [x] Review Docker startup and Railway root/health configuration; static packaging checks pass. Actual container/staging deployment belongs to Phase 4.
- [x] Make code readable and keep development tools/environments out of Git.

## Independent test procedure

1. In `services/questionnaire-matching`, use a dedicated virtual environment and install requirements.
2. Run engine/API tests from the repository root:
   `services/questionnaire-matching/.venv/Scripts/python.exe -m pytest services/questionnaire-matching/tests -q`.
3. Set a local-only `MATCHING_SERVICE_SECRET`, start Uvicorn on localhost, and exercise `/health` and `/v1/rank` with synthetic requests.
4. Check the documented 90%/80% example yields 84.8528137423857 before display rounding.
5. Test absent/wrong secret, malformed weights, duplicate IDs, unknown fields, oversized/chunked bodies, missing questions, all-zero weights, ten-question boundary, symmetry and deterministic ties. Verify no answer text/contributions appear in outputs/errors/logs.
6. Measure repeated maximum supported batches and record hardware, batch size, duration and peak memory. Pick and document the backend timeout from evidence; do not claim Python alone guarantees speed.
7. Validate the shared fixture from TypeScript and ensure its schema accepts the real Python response.

## Acceptance gate

- [x] All formula, contract and API failure tests pass; declared people, answer, accepted-answer, identifier and streamed-byte bounds are enforced.
- [x] A live local HTTP demonstration works independently of all other services.
- [x] OpenAPI/examples/run instructions reproduce the result in a clean virtual environment.
- [x] [Performance baseline](phase-01-performance-baseline.md) is recorded and the API contract is frozen as `questionnaire-v1`.
- [x] Later-phase route and chat integrations are disconnected from the running legacy experience.
- [x] Evidence is recorded in master and Phase 1 is checked complete.

Phase 1 is complete. Phase 2 may begin in a separate work cycle. No phone testing was required because this phase has no customer UI.
