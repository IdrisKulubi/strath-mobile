# Phase 5 deployment and rollback runbook

This runbook now describes the global questionnaire switches following the 2026-09-30 user decision to remove account-ID cohorts. Record the operator, Git revision, database, Railway revision and smoke-check evidence in `master.md`; never record credentials, answers or message content.

## Preconditions

- Phases 3 and 4 have completed their real-phone and Railway gates.
- A current database backup and restore procedure have been verified.
- The Next.js backend contains the Phase 5 chat authorization path. Do not enable new connections on an older backend.
- `MATCHING_SERVICE_URL` uses HTTPS and its server-only secret matches Railway.
- Synthetic accounts cover an eligible pair, blocked pair, inactive legacy pair and an existing conversation with messages.

## Database and backfill

1. Point `DATABASE_URL` to an isolated copy and run `npm run migrate:questionnaire`. Confirm migrations `0038`, `0039` and `0040` are recorded once.
2. Run `npm run reconcile:questionnaire-connections` without `--apply`. Review scanned, eligible, exclusion and legacy match/message counts.
3. Run `npm run reconcile:questionnaire-connections -- --apply` only after the dry run is accepted. Run the dry run again; `wouldInsert` must be zero.
4. Confirm active eligible legacy pairs reuse their existing `matches.id`. Confirm cancelled, expired, blocked, deleted and missing-conversation rows were not activated.
5. Compare user, match, message, booking, payment and credit counts with the pre-migration snapshot. The reconciliation command itself must report unchanged match and message counts.

The migrations are additive. Do not drop questionnaire tables during rollback and do not delete outstanding bookings, payments or credits.

## Controlled enablement

1. Deploy Railway and the Next.js backend while all questionnaire flags remain off.
2. Set `QUESTIONNAIRE_SCHEMA_READY=true` after the migrations and health checks pass.
3. The 2026-09-30 user decision removed the account-ID cohort. Confirm that this universal change is intended for the target environment before enabling the global switches.
4. Enable collection, then the shell, then matching. Each switch now applies to every authenticated account; verify each step before enabling the next.
5. On two phones, complete like → mutual match → message → reply/read → restart/history → unmatch. Repeat with block and report. Verify the flow contains no date confirmation, scheduling or checkout step.
6. Verify an offline retry uses one message row, a blocked/unmatched account cannot read, send or mark read, and an existing legacy conversation retains its ID and message count.
7. Watch error rate, latency, eligible-pool size and privacy checks after the global switch.

## Privacy-safe monitoring

Use aggregate counts from `q_questionnaire_events`, `q_discovery_events` and `q_connection_events`. A reciprocal conversation is a connection whose `match_id` has `message_sent` events from both members. Logs and analytics must exclude birth dates, coordinates, raw answers, accepted-answer sets, explanations and message content.

Monitor questionnaire completion/drop-off, eligible-pool size, evidence coverage, discovery latency and errors, likes, mutual likes, reciprocal conversations, blocks and unmatches. Alert on engine failures, repeated migration errors, connection creation conflicts and unauthorized chat attempts.

## Rollback drill

1. Set `QUESTIONNAIRE_MATCHING_ENABLED=false` globally. This stops discovery and new likes; answer storage and every active conversation continue working.
2. If the new shell is faulty, set `QUESTIONNAIRE_SHELL_ENABLED=false`. The updated app displays a retry state instead of falling into the old UI; restore the shell or deploy a corrected build. Existing conversations remain in the database.
3. Roll back the Railway engine independently. Serve only revision-valid cached discovery while available; existing conversations do not depend on Railway.
4. Keep a backend revision that understands `q_connections` deployed until every questionnaire connection is migrated or intentionally ended. Never roll chat authorization back to the legacy date-confirmation-only gate.
5. Leave migrations and user answers in place. Correct forward, deploy, then re-enable flags for the same small cohort.

The rollback passes only when existing and questionnaire conversations remain readable/sendable for active members, blocked/unmatched conversations remain denied, and no connection is routed through payment or date confirmation.
