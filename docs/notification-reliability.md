# Notification reliability plan and implementation

Status: implemented locally on 2026-10-16; migration, deployment and physical-device acceptance pending. Separate from the onboarding redesign. Existing verification work is preserved.

## Plan and audit

1. Map active events and recipients. New questionnaire incoming likes had no sender; reciprocal matches already notified both users. Messages, curated introductions, date requests/responses, scheduling, meetup confirmation/rescheduling, payments, feedback and waitlist admission already have senders.
2. Add incoming-like alerts after a committed eligible decision. Serialize on the existing pair lock, suppress repeated likes, keep passes quiet, and use the mutual-match alert when a reciprocal like forms a connection.
3. Persist every existing shared push send before contacting Expo. Retry transient failures, inspect tickets and receipts, clear rejected device tokens, and retain short-lived failure diagnostics.
4. Handle notification taps with the app running or launched from a closed state. Add questionnaire fallback routes and refresh questionnaire lists for likes, matches and messages.
5. Reuse the permission sheet. Offer it in the authenticated dating shell on entry/foreground, with one shared seven-day cooldown per account. Allow immediate access through Settings; explicitly request OS permission only after Enable. Previously dismissed users become eligible again. Android channel creation precedes permission requests.
6. Validate event idempotency, retry/receipt behavior and cooldown boundaries locally; finish two-account native acceptance before release.

## Event coverage

| Event | Recipient / destination | Implementation |
| --- | --- | --- |
| New questionnaire like | Liked person / `/dating/likes` | Added generic lock-screen copy; no private questionnaire answers |
| Reciprocal questionnaire match | Both people / `/dating-chat/:matchId` | Existing sender, durable delivery added |
| Chat message | Other person / corresponding chat | Existing idempotent message sender, durable delivery and questionnaire cache refresh added |
| Curated introduction | Candidate / home | Existing sender, durable delivery added |
| Date and meetup changes | Relevant participant / dates | Existing senders, durable delivery added |
| Payments, credits, refunds | Relevant participant / dates | Existing senders, durable delivery added |
| Feedback and waitlist admission | Relevant member / feedback or entry | Existing senders, durable delivery added |

Blocks, reports, passes and unmatches do not produce new recipient alerts. This work does not change matching, eligibility, privacy or date/payment rules.

## Release order

1. Against the intended backend database, review and run `npx tsx src/scripts/migrate-push-delivery.ts --apply` from `backend/strath-backend`. Migration `drizzle/0041_push_delivery.sql` is additive and idempotent. No production SQL was run here.
2. Deploy backend including `/api/cron/push-delivery` and the five-minute Vercel cron. Existing cron authorization protects the worker; configure the existing cron secret in the target environment. Apply the migration before the new sender is used.
3. Release the updated mobile build/update through the normal project release process. Backend-only deployment does not deliver the mobile routing/reminder fixes.
4. Run the native acceptance below. Inspect `push_deliveries` grouped by `status` and `last_error`; `delivered` means an OK provider receipt, not proof the person read it. Payloads and diagnostics are purged after seven days by the worker. Pending notifications expire after 24 hours or five attempts.

## Validation evidence

- Questionnaire connection integration suite: 12/12, including incoming-like duplicate suppression, pass silence, reciprocal match recipients, eligibility and blocked connections.
- Push queue integration suite: 6/6, using PostgreSQL-compatible PGlite and a mocked Expo transport. Covers leases, durable retries, receipt success/failure, rejected tokens, replacement-token preservation, migration reapplication and expiry.
- Mobile reminder policy: 2/2, covering first use, invalid storage, weekly boundaries and clock rollback.
- Targeted mobile and backend ESLint passed. Final backend `tsc --noEmit --pretty false` passed. `git diff --check` passed.
- Whole mobile TypeScript retains 69 diagnostics in unrelated screens/components/contracts; no diagnostic names a changed notification file. Full output: `notifications-evidence/mobile-typecheck.txt`.
- No physical-device UI capture or push delivery is claimed.

## Native acceptance still required

- With two verified eligible accounts, like once and retry: recipient gets one like alert; returning the like sends one match alert to each account.
- Send a chat message and retry its client request ID: one message and one alert. Verify like/match/message lists refresh while open.
- Tap each alert in foreground, background and after force-closing the app; confirm the intended screen opens and the same launch response does not replay.
- Disable notifications, open the dating shell, dismiss the reminder and foreground repeatedly: no repeat during seven days. Settings opens immediately. Verify a second account has its own cooldown.
- Enable via the OS dialog and via Settings, return, and confirm the backend token registers. Test Android channel/permission ordering and iOS permission denial.
- Disable the Expo transport, send, restore it and run the worker; inspect retry and receipt status. Reinstall and verify token replacement and rejection cleanup.
- Spot-check existing curated introduction, date/meetup and payment alerts after the shared sender change.

## Practical limits

Push delivery depends on OS permission, provider credentials, connectivity and OS presentation policy. The queue supports at-least-once delivery: a crash after Expo accepts a send but before its ticket is saved can cause a duplicate retry. Existing event writes and queue insertion are separate transactions, so process termination between them can still lose an event; eliminating that window requires moving each producer to a transactional outbox. The existing account schema stores one push token, so only the most recently registered device is targeted. There is no persistent notification inbox in this change; the existing API history endpoint remains a placeholder. These limits must not be described as guaranteed delivery.
