# Phase 1 — Database schema + `payments_enabled` flag

**Status:** ⬜ Not started
**Depends on:** nothing
**User-visible:** No (foundation only)

## Goal

Add the database tables/columns the whole feature needs, and add the
`payments_enabled` feature flag (default OFF) so nothing changes for users yet.

## Files to edit / create

- Edit `src/db/schema.ts` — add columns to `date_matches`, add `date_payments`,
  `user_credits` tables, add a `low_intent_score` column to the user/profile.
- Edit `src/lib/feature-flags.ts` — add `paymentsEnabled` key.
- Generated migration in `drizzle/` (via drizzle-kit).

## Steps

1. **Extend `dateMatches`** in `src/db/schema.ts` (after the existing columns,
   before the closing `}`):

   ```ts
   paymentState: text("payment_state")
       .$type<
           | "not_required"
           | "awaiting_payment"
           | "paid_waiting_for_other"
           | "both_paid"
           | "expired"
       >()
       .default("not_required")
       .notNull(),
   paymentDueBy: timestamp("payment_due_by"),
   paymentAmountCents: integer("payment_amount_cents").default(49900).notNull(),
   paymentCurrency: text("payment_currency").default("KES").notNull(),
   paidUserCount: integer("paid_user_count").default(0).notNull(),
   ```

   > We piggyback on `date_matches` (not `mutual_matches`) because it is the
   > ops/admin row and already has `userAId`/`userBId`. The mobile gate reads
   > through the `mutual_matches.legacyDateMatchId` link.

2. **Create `datePayments`** (one row per user per date match):

   ```ts
   export const datePayments = pgTable(
       "date_payments",
       {
           id: uuid("id").defaultRandom().primaryKey(),
           dateMatchId: uuid("date_match_id")
               .notNull()
               .references(() => dateMatches.id, { onDelete: "cascade" }),
           userId: text("user_id")
               .notNull()
               .references(() => user.id, { onDelete: "cascade" }),
           amountCents: integer("amount_cents").notNull(),
           currency: text("currency").default("KES").notNull(),
           provider: text("provider").default("paystack").notNull(), // paystack | credit
           paystackReference: text("paystack_reference").notNull().unique(),
           paystackTransactionId: text("paystack_transaction_id"),
           status: text("status")
               .$type<"pending" | "paid" | "failed" | "refund_requested" | "refunded" | "credited" | "cancelled">()
               .default("pending")
               .notNull(),
           paidAt: timestamp("paid_at"),
           refundedAt: timestamp("refunded_at"),
           creditedAt: timestamp("credited_at"),
           refundReason: text("refund_reason"),
           rawVerifyPayload: jsonb("raw_verify_payload"),
           rawWebhookPayload: jsonb("raw_webhook_payload"),
           createdAt: timestamp("created_at").defaultNow().notNull(),
           updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
       },
       (table) => ({
           userMatchUnique: uniqueIndex("date_payments_user_match_unique").on(table.dateMatchId, table.userId),
           referenceIdx: index("date_payments_reference_idx").on(table.paystackReference),
           statusIdx: index("date_payments_status_idx").on(table.status),
       }),
   );
   ```

3. **Create `userCredits`** (a simple ledger):

   ```ts
   export const userCredits = pgTable(
       "user_credits",
       {
           id: uuid("id").defaultRandom().primaryKey(),
           userId: text("user_id")
               .notNull()
               .references(() => user.id, { onDelete: "cascade" }),
           amountCents: integer("amount_cents").notNull(), // positive = granted, negative = spent
           currency: text("currency").default("KES").notNull(),
           reason: text("reason").notNull(), // partner_did_not_pay | admin_credit | promo | spent_on_date | ...
           dateMatchId: uuid("date_match_id").references(() => dateMatches.id, { onDelete: "set null" }),
           paymentId: uuid("payment_id").references(() => datePayments.id, { onDelete: "set null" }),
           status: text("status").$type<"active" | "spent" | "expired">().default("active").notNull(),
           usedAt: timestamp("used_at"),
           createdAt: timestamp("created_at").defaultNow().notNull(),
       },
       (table) => ({
           userIdx: index("user_credits_user_idx").on(table.userId),
       }),
   );
   ```

   > Balance = `SUM(amountCents)` for a user. Granting is a positive row,
   > spending is a negative row. Simpler and more auditable than a single
   > mutable balance column.

4. **Add a low-intent counter.** If `profiles` is the right place (check where
   matchmaking priority is read), add there; otherwise add to `user`:

   ```ts
   lowIntentScore: integer("low_intent_score").default(0).notNull(),
   ```

5. **Register the flag** in `src/lib/feature-flags.ts`:

   ```ts
   export const APP_FEATURE_KEYS = {
       demoLoginEnabled: "demo_login_enabled",
       signupCapEnabled: "signup_cap_enabled",
       adminMatchPreviewEnabled: "admin_match_preview_enabled",
       paymentsEnabled: "payments_enabled", // ← add
   } as const;
   ```

   Do **not** expose it in `getPublicFeatureFlags()` yet — the mobile app reads
   it in phase 10.

6. **Generate + apply the migration:**

   ```bash
   cd strath-mobile/backend/strath-backend
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

7. **Seed the flag row as OFF** (so the admin toggle has something to flip).
   Either insert via a one-off SQL or let the admin flags UI create it. Default
   read fallback is already `false`, so this is optional.

## How to test

1. **Migration applies cleanly:**

   ```bash
   npx drizzle-kit migrate   # exits 0, no errors
   ```

2. **Schema is live** — open a DB console (Neon) and confirm:

   ```sql
   \d date_payments
   \d user_credits
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'date_matches' AND column_name LIKE 'payment%';
   -- expect payment_state, payment_due_by, payment_amount_cents, payment_currency, paid_user_count
   ```

3. **Flag reads false by default:**

   Add a throwaway log or a node/tsx snippet:

   ```ts
   import { isFeatureEnabled, APP_FEATURE_KEYS } from "@/lib/feature-flags";
   console.log(await isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false)); // → false
   ```

4. **Existing flow untouched:** run the backend (`npm run dev`) and confirm the
   normal mutual-match / slot-confirm flow still works (nothing reads the new
   columns yet).

## Done when

- [ ] Migration generated and applied.
- [ ] `date_payments` + `user_credits` tables exist with unique indexes.
- [ ] `date_matches` has the 5 payment columns.
- [ ] `payments_enabled` key exists and reads `false`.
- [ ] No behavior change in the app.

## Rollback

Drop the two new tables and the new `date_matches` columns; remove the flag key.
No data migration needed since the feature is off.
