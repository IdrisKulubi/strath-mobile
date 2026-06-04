# StrathSpace Payments — Phased Build Plan

This folder breaks the **Date Setup Fee** feature into small, independently
buildable, independently testable phases. **Do not build everything at once.**
Build one phase, test it using the "How to test" section in that phase's doc,
get it green, then move to the next phase.

The original product spec lives in [`../payment.md`](../payment.md). This folder
is the *engineering execution plan* and supersedes `payment.md` where they
disagree (because `payment.md` assumed a generic "vibe-check → confirm" flow that
does not match the real codebase).

---

## Locked decisions

| Decision | Choice |
|---|---|
| **Model** | Non-refundable **Date Setup Fee** (paying for StrathSpace to set up/coordinate the date). NOT a subscription, NOT unlocking digital features. |
| **Amount** | **KES 499 per person** (`49900` cents for Paystack). Both people pay → KES 998 per confirmed date. |
| **Rail** | **Paystack** (supports M-Pesa + cards + webhooks). |
| **Gate placement** | **Payment IS the slot confirmation.** The existing "Confirm your slot" tap becomes "Pay KES 499 to confirm." |
| **Checkout surface** | **Hosted `/payments` web page** opened from the app in a browser/WebView, deep-links back via `strathspace://`. Store-safe (offline-service fee, not IAP). |
| **One-paid expiry** | If the window expires with only one person paid, auto-convert the paid amount to **StrathSpace credit** (with an option to request a refund). |
| **Rollout** | Everything behind a `payments_enabled` feature flag, **default OFF**. The free flow keeps working until we flip it on. |

---

## How the gate fits the REAL flow

Today (free): mutual match → system assigns a Wed/Sat slot → each user taps
**Confirm** (`confirmMeetupSlot`) → when both confirm in the window,
`tryFinalizeConfirmedMeetup` schedules the date.

After payments (flag ON): the **Confirm tap requires a successful KES 499
payment first.** Paying = confirming.

```txt
Mutual match created
        ↓
System assigns slot (Wed 17:30 / Sat 15:00 EAT) + slotConfirmBy deadline
        ↓
Each user opens "Pay KES 499 to confirm"   ← NEW (only when payments_enabled)
        ↓
Paystack checkout (hosted web page) → webhook + verify confirm payment server-side
        ↓
On verified payment → set that user's userA/BSlotConfirmedAt
        ↓
Both paid + both inside window → tryFinalizeConfirmedMeetup → date scheduled (upcoming)
        ↓
If slotConfirmBy passes & not both paid → match expires
        → if one paid: auto-credit the payer (refund option), flag the no-payer
```

> Key rule: a paid-but-unmatched user must **never** be left stuck. On expiry we
> release both users back to matching and protect the one who paid.

---

## Build order (each is its own doc)

Build strictly top to bottom. Later phases depend on earlier ones.

| # | Phase | Doc | Ships value on its own? |
|---|---|---|---|
| 1 | Database schema + feature flag | [`phase-01-database-and-flag.md`](./phase-01-database-and-flag.md) | Foundation (no user impact) |
| 2 | Paystack client + signed token + env | [`phase-02-paystack-and-token.md`](./phase-02-paystack-and-token.md) | Foundation |
| 3 | `create-session` API | [`phase-03-create-session-api.md`](./phase-03-create-session-api.md) | Testable via curl |
| 4 | Hosted `/payments` web page + callback | [`phase-04-web-payment-page.md`](./phase-04-web-payment-page.md) | Pay in a browser end-to-end |
| 5 | `verify` API + Paystack webhook | [`phase-05-verify-and-webhook.md`](./phase-05-verify-and-webhook.md) | Server-trusted payment state |
| 6 | Payment `status` API | [`phase-06-status-api.md`](./phase-06-status-api.md) | App can read payment state |
| 7 | Pay-to-confirm backend gate | [`phase-07-confirm-gate.md`](./phase-07-confirm-gate.md) | Gate enforced (flagged) |
| 8 | Payment-expiry cron + credit logic | [`phase-08-expiry-cron-credit.md`](./phase-08-expiry-cron-credit.md) | No stuck users |
| 9 | `refund-choice` + `use-credit` APIs | [`phase-09-refund-and-credit-apis.md`](./phase-09-refund-and-credit-apis.md) | Credit usable |
| 10 | Mobile UI (pay-to-confirm + states) | [`phase-10-mobile-ui.md`](./phase-10-mobile-ui.md) | User-facing flow |
| 11 | Payment notifications | [`phase-11-notifications.md`](./phase-11-notifications.md) | Re-engagement |
| 12 | Admin payment visibility | [`phase-12-admin.md`](./phase-12-admin.md) | Ops can manage |

Minimum to flip the flag on for a pilot: **phases 1–8 + 10.** Phases 9, 11, 12
make it operationally complete.

---

## Global setup before phase 1 (do once)

1. Create a **Paystack test account** → get `pk_test_…` and `sk_test_…` keys.
2. Confirm the production domain for the web payment page (`payment.md` flags a
   `strathspace.com` vs `strutspace.com` discrepancy — resolve before phase 4).
3. These docs assume the backend at
   `strath-mobile/backend/strath-backend` (Next.js 16 app router, Drizzle ORM,
   Neon Postgres) and the Expo app at `strath-mobile/`.

### Conventions used everywhere (already in the codebase)

| Concern | How it's done here |
|---|---|
| Auth in an API route | `getSessionWithFallback(req)` from `@/lib/auth-helpers` (cookie OR `Authorization: Bearer <token>`). |
| API responses | `successResponse(data)` / `errorResponse(err, status)` from `@/lib/api-response`. |
| Cron auth | `isAuthorizedCronRequest(req)` from `@/lib/security` (checks `CRON_SECRET`). |
| DB (writes) | `import db from "@/db/drizzle"`. |
| DB (reads) | `import { db } from "@/lib/db"`. |
| Feature flags | `isFeatureEnabled(key, fallback)` from `@/lib/feature-flags` backed by the `app_feature_flags` table. |
| Push | `sendPushNotification(token, { title, body, data })` from `@/lib/notifications`. |
| Migrations | `npx drizzle-kit generate` (creates SQL in `./drizzle`) then `npx drizzle-kit migrate`. There is **no** npm migrate script. |

### Test ground rules (apply to every phase)

- Use **Paystack test keys** for all phases until the very end. Test card and
  test M-Pesa numbers are in the Paystack dashboard.
- Keep `payments_enabled = false` in the DB while building phases 1–9; only
  flip it on locally (or for staff users) when testing the gate end-to-end.
- A seeded mutual match in the slot-confirm state is needed from phase 3 on.
  Use `src/scripts/create-test-mutual-match.ts` (already exists) to create one.
- Every payment write must be **idempotent** — re-running verify/webhook for the
  same reference must never double-count. Each phase's test includes a
  "run it twice" check where relevant.

---

## Status tracker

Tick these off as phases land.

- [ ] Phase 1 — DB schema + flag
- [ ] Phase 2 — Paystack client + token
- [ ] Phase 3 — create-session API
- [ ] Phase 4 — web payment page
- [ ] Phase 5 — verify + webhook
- [ ] Phase 6 — status API
- [ ] Phase 7 — confirm gate
- [ ] Phase 8 — expiry cron + credit
- [ ] Phase 9 — refund + credit APIs
- [ ] Phase 10 — mobile UI
- [ ] Phase 11 — notifications
- [ ] Phase 12 — admin
