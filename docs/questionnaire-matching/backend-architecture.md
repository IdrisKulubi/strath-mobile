# Questionnaire matching backend

Delivery and verification status: [master implementation checklist](implementation-features/master.md). This document describes the design; it does not certify implementation or testing.

## Ownership
Expo â†’ authenticated Next.js API â†’ existing PostgreSQL; Next.js â†’ stateless Python/FastAPI on Railway. Authentication, account IDs, profiles, photos, face verification, database writes, messaging and notifications stay with existing services. The engine never receives personal profile fields or database credentials.

## Model
Additive q_ tables contain immutable published question versions/options/categories, answers (private by default), per-user answer revision and progress, private DOB and explicit discovery preferences, directed decisions, canonical connections referencing existing matches, and revision-keyed score cache. Do not infer partner preferences from legacy profile fields. No legacy tables are deleted.

## Math
For shared question versions, S(Aâ†’B) is A's accepted weighted answers divided by all A's weights on shared questions. Compatibility = 100 Ã— sqrt(S(Aâ†’B) Ã— S(Bâ†’A)). Weights: 0, 1, 10, 50, 250. Require ten shared questions with both weights positive and two nonzero denominators. Otherwise score is null, never invented. 90% and 80% satisfaction yields 84.8528137423857%. Preserve precision; round only in the client. No photo, payment, AI or engagement factors. Highest weight is not a hard filter.

## Privacy and eligibility
Private answers affect aggregate compatibility but never appear in another user's response or logs. Comparisons expose only questions both users answered publicly. Server filters both users' adult DOB, explicit genders/ages/location, completion, verification, blocks, visibility, account state and connections before scoring and again before delivery/likes. Never silently widen filters. Service logs exclude bodies. Public DTOs are allowlists.

## Contracts
Public routes are /api/v2/questionnaire/[...path]. Responses are JSON data; failures contain error and retryable when appropriate. Auth comes exclusively from the session, never caller-supplied viewer IDs. Resources: status, questions, answers, preferences, profile, discovery, comparison/:userId, likes, connections, decisions, unmatch, block, report. Internal POST /v1/rank uses opaque IDs, revisions and structured answers; GET /health reports deployment readiness. See generated OpenAPI and shared fixture under contracts/questionnaire-matching.

## Resilience
Engine calls use HTTPS, server-only shared bearer secret, bounded batches, timeout and one retry. Cache is valid only for both answer revisions plus algorithm version. Recheck current eligibility; return retryable 503 when neither engine nor valid cache can serve. Saving answers and messaging do not depend on Railway. Flags separately control collection, matching and shell. Existing q_ connections continue using independent chat access even after flags roll back.

## Migration and rollout
Apply explicit 0038_questionnaire_matching.sql through the checked-in migration runner, then seed the catalogue. Rehearse on an isolated database first. Backfill only listable legacy mutual matches with a valid existing conversation and no blocked pair or inactive duplicate; retain IDs/messages. Do not reactivate cancelled/expired/unmatched connections. q_ tables own new lifecycle. Keep all legacy booking/payment operations intact. Run reconciliation before enabling flags. No production migration is part of local validation.

## Railway
Deploy services/questionnaire-matching as repository root (repository is strath-mobile). Set MATCHING_SERVICE_SECRET; configure the same secret plus MATCHING_SERVICE_URL in Next.js. Never EXPO_PUBLIC_. Container listens on PORT. Healthcheck /health; separate staging/production secrets. Enable ongoing uptime/error monitoring; deployment health checks alone are not continuous monitoring.

## Verification
Pure engine examples, symmetry, sparse evidence, versions, zeros, ties and privacy. Contract fixtures across Python/TypeScript. PostgreSQL transaction tests for simultaneous likes and idempotency, blocked/unmatched access, answer revisions, history reconciliation. Mobile tests cover interruption, retry and private/public comparison. Release requires isolated migration rehearsal and device QA.
