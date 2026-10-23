# StrathSpace Payments — Phased Build Plan

This folder breaks the **Date Confirmation Pack** feature into small, independently
buildable, independently testable phases. **Do not build everything at once.**
Build one phase, test it using the "How to test" section in that phase's doc,
get it green, then move to the next phase.

The original product spec lives in [`../payment.md`](../payment.md). This folder
is the *engineering execution plan* and supersedes `payment.md` where they
disagree.

---

## Current priority: Two-Confirmation Pack

**Start here:** [`two-confirmation-pack.md`](./two-confirmation-pack.md)

This is the active plan to change from per-date KSh 499 to **KSh 499 for 2 reusable
date confirmations**, using the existing `user_credits` table as the balance ledger.

```txt
Pay KSh 499 once → 2 date confirmations
Payment only shown after a mutual match
Confirmation spent only when both confirm and date setup proceeds
Second match uses remaining balance (no second payment)
```

The original per-date build phases (1–12 below) remain as the foundation. The
two-confirmation pack plan extends them.

---

## Locked decisions

| Decision | Choice |
|---|---|
| **Model** | **Date Confirmation Pack** — KSh 499 for 2 reusable confirmations. NOT a subscription, NOT unlocking digital features. |
| **Amount** | **KSh 499 per pack** (`49900` cents for Paystack). Grants **2** confirmations per person. |
| **When to pay** | Only after a **mutual match** exists, on the **Confirm your match** screen. |
| **Spend rule** | A confirmation is spent only when **both** users confirm and `tryFinalizeConfirmedMeetup` succeeds. |
| **Balance storage** | Reuse `user_credits` table with confirmation-specific `reason` values. |
| **Rail** | **Paystack** (supports M-Pesa + cards + webhooks). |
| **Gate placement** | Confirm tap requires payment **or** available confirmation balance. |
| **Checkout surface** | **Hosted `/payments` web page** opened from the app in a browser/WebView, deep-links back via `strathspace://`. Store-safe (offline-service fee, not IAP). |
| **Ghosting / expiry** | Restore reserved confirmations; do not spend on failed matches. |
| **Rollout** | Everything behind a `payments_enabled` feature flag, **default OFF**. The free flow keeps working until we flip it on. |

---

## How the gate fits the REAL flow

Today (free): mutual match → system assigns a Wed/Sat slot → each user taps
**Confirm** (`confirmMeetupSlot`) → when both confirm in the window,
`tryFinalizeConfirmedMeetup` schedules the date.

After pack model (flag ON):

```txt
Mutual match created
        ↓
System assigns slot (Wed 17:30 / Sat 15:00 EAT) + slotConfirmBy deadline
        ↓
"Confirm your match" screen
        ↓
User has confirmation balance?
   ├─ Yes → tap Confirm (uses 1 credit, no Paystack)
   └─ No  → "Pay KSh 499" → Paystack → grant 2 confirmations → reserve 1
        ↓
Partner does the same
        ↓
Both confirmed → spend 1 confirmation each → tryFinalizeConfirmedMeetup → date scheduled
        ↓
Next match: user with 1 credit left skips Paystack
        ↓
If slotConfirmBy passes & not both confirmed → match expires
        → restore reserved confirmations (nothing spent)
```

> Key rule: a user who confirmed but was ghosted must **never** lose a confirmation.
> On expiry we release both users and restore any reserved credits.

---

## Build order

### Pack model (active — build these next)

See [`two-confirmation-pack.md`](./two-confirmation-pack.md) for full detail.

| # | Phase | Doc | Ships value on its own? |
|---|---|---|---|
| P1 | Product rules & state language | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-1--product-rules--state-language) | Spec only |
| P2 | Backend credit model (`user_credits`) | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-2--backend-credit-model-using-user_credits) | Foundation |
| P3 | Paystack pack purchase flow | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-3--paystack-pack-purchase-flow) | Buy pack end-to-end |
| P4 | Confirm match consumption flow | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-4--confirm-match-consumption-flow) | Core behavior change |
| P5 | Expiry, cancel, refund, restore | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-5--expiry-cancel-refund-and-restore-rules) | No stuck users |
| P6 | Mobile UI/UX flow | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-6--mobile-uiux-flow) | User-facing clarity |
| P7 | Admin, observability, support | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-7--admin-observability-and-support) | Ops visibility |
| P8 | Testing & rollout | [`two-confirmation-pack.md`](./two-confirmation-pack.md#phase-8--testing--rollout) | Safe launch |

Minimum to ship pack model: **P1–P6** plus existing foundation phases 1–8 and 10 below.

### Original per-date foundation (completed)

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

### Pack model (active)

- [ ] P1 — Product rules & state language
- [ ] P2 — Backend credit model
- [ ] P3 — Paystack pack purchase
- [ ] P4 — Confirm consumption flow
- [ ] P5 — Expiry / cancel / restore
- [ ] P6 — Mobile UI/UX
- [ ] P7 — Admin & observability
- [ ] P8 — Testing & rollout

### Original foundation (completed)

- [ ] Phase 1 — DB schema + flag
- [x] Phase 2 — Paystack client + token
- [x] Phase 3 — create-session API
- [x] Phase 4 — web payment page
- [x] Phase 5 — verify + webhook
- [x] Phase 6 — status API
- [x] Phase 7 — confirm gate
- [x] Phase 8 — expiry cron + credit
- [x] Phase 9 — refund + credit APIs
- [x] Phase 10 — mobile UI
- [x] Phase 11 — notifications
- [x] Phase 12 — admin
