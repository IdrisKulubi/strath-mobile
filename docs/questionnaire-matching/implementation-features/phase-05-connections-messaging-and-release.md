# Phase 5 — Mutual likes, messaging and controlled release

Depends on accepted Phases 1–4. Status: local engineering and automated verification complete; device, staging pilot and production release acceptance remain open.

## Outcome and boundary

Two test accounts can mutually like, open one conversation and exchange messages immediately without date confirmation or payment. Existing accounts/history survive migration. The fully tested experience is released to a controlled cohort with an exercised rollback.

## Work

- [x] Finish received/sent likes and atomic canonical connection/conversation creation.
- [x] Enforce duplicate/retry/concurrent request idempotency, eligibility rechecks and consistent block/unmatch behavior.
- [x] Complete independent chat authorization across history, send, read receipts, conversation details, notifications and alternate routes; no unauthorized legacy fallback.
- [x] Reuse existing message storage/delivery/push services; complete match notifications, read indicators, retry and pagination behavior.
- [x] Finish safety controls reachable from chat as well as profile; test report submission and block enforcement.
- [x] Rehearse eligible legacy-connection backfill in the isolated test database, preserving IDs/messages and excluding inactive or blocked relationships. A staging-copy rehearsal remains a release gate.
- [x] Ensure migrated and non-migrated cohorts coexist in code: legacy booking/payment records are untouched, questionnaire chats bypass their gates and existing chat IDs are reused.
- [x] Complete consent/privacy copy and account deletion cleanup for answers, cache and new records while retaining message history for safety.
- [x] Finish privacy-safe metrics: completion/drop-off, pool/evidence coverage, latency/errors, mutual likes and reciprocal conversations.
- [x] Write the [deployment and rollback runbook](phase-05-release-runbook.md). No credentials appear in documents or mobile configuration.

## Independent test procedure

1. With two eligible synthetic accounts, run simultaneous/repeated likes. Assert exactly one connection and one reused/created conversation.
2. Rehearse backfill on isolated data: active, expired, cancelled, blocked, duplicate and missing-conversation cases. Compare original/new account and message IDs/counts; do not infer mutual consent from a one-sided like.
3. Attempt unauthorized reads/sends/read receipts and block/unmatch during active sessions. Check every API path that can access the conversation.
4. On two phone sessions, demonstrate received like → mutual like → immediate message → reply/read state → history reload. There must be no date, checkout or scheduling step.
5. Demonstrate offline send failure/retry, history pagination, app restart, incoming push/deep link, reporting, blocking and unmatching. Confirm a failed send preserves the draft and does not duplicate delivery.
6. Disable matching and stop Railway: existing conversations and answer storage still work. Roll back shell/matching independently; connections must not acquire legacy date-payment requirements or vanish behind an unusable client route.
7. Run regression checks for all previous accepted phases and the legacy account/payment operations affected by coexistence.
8. Deploy an internal staging pilot, collect functional/operational evidence, then apply the documented production migration and enable only the intended cohort. Verify runtime health before expanding.

## Acceptance gate

- [x] Local transaction, access-control, migration and legacy-coexistence checks pass.
- [ ] Complete two-account phone journey and relevant iOS/Android checks pass.
- [ ] Existing history reconciles and outstanding financial/booking records remain intact.
- [ ] Runtime outage, flag rollback and service rollback drills pass.
- [ ] No raw private answers or message content appears in telemetry.
- [ ] Internal pilot, deployment and controlled production cohort verification are recorded in master.
- [ ] Phase 5 is checked complete only after the release is verified, not after code/config files are written.
