# Phase 2 — Paystack client + signed payment token + env

**Status:** ✅ Complete
**Depends on:** Phase 1
**User-visible:** No (foundation only)

## Goal

Create the low-level building blocks every payment API will use:

1. A tiny Paystack HTTP client (initialize transaction, verify transaction,
   verify webhook signature).
2. A **signed, expiring payment token** so the web page URL never exposes raw
   `userId` / `dateMatchId`.
3. Centralised env + amount config.

## Files to create

- `src/lib/payments/paystack.ts` — Paystack API wrapper.
- `src/lib/payments/payment-token.ts` — sign/verify tokens.
- `src/lib/payments/config.ts` — amount + env access in one place.
- Update `.env.example` and `.env.local`.

## Steps

1. **Env vars** — add to `.env.example` (and real values to `.env.local`):

   ```env
   # Paystack (use test keys until launch)
   PAYSTACK_SECRET_KEY=sk_test_xxx
   PAYSTACK_PUBLIC_KEY=pk_test_xxx
   PAYSTACK_WEBHOOK_SECRET=        # Paystack signs webhooks with the SECRET key; leave blank
   # Payment config
   DATE_CONFIRMATION_AMOUNT_CENTS=49900
   DATE_PAYMENT_WINDOW_HOURS=24
   PAYMENT_TOKEN_SECRET=change_me_long_random
   WEB_PAYMENT_URL=https://strathspace.com/payments
   APP_PAYMENT_RETURN_URL=strathspace://payments/callback
   ```

   > Paystack signs webhooks using HMAC-SHA512 with your **secret key**, so
   > `PAYSTACK_WEBHOOK_SECRET` can just reuse `PAYSTACK_SECRET_KEY`. Keep the var
   > so we can rotate independently later.

2. **`src/lib/payments/config.ts`:**

   ```ts
   export const PAYMENT_CONFIG = {
       amountCents: Number(process.env.DATE_CONFIRMATION_AMOUNT_CENTS ?? 49900),
       currency: "KES" as const,
       windowHours: Number(process.env.DATE_PAYMENT_WINDOW_HOURS ?? 24),
       webPaymentUrl: process.env.WEB_PAYMENT_URL ?? "https://strathspace.com/payments",
       appReturnUrl: process.env.APP_PAYMENT_RETURN_URL ?? "strathspace://payments/callback",
   };

   export function assertPaymentEnv() {
       if (!process.env.PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY missing");
       if (!process.env.PAYMENT_TOKEN_SECRET) throw new Error("PAYMENT_TOKEN_SECRET missing");
   }
   ```

3. **`src/lib/payments/paystack.ts`** — thin wrapper over `https://api.paystack.co`:

   ```ts
   const BASE = "https://api.paystack.co";

   function authHeaders() {
       return {
           Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
           "Content-Type": "application/json",
       };
   }

   export async function initializeTransaction(input: {
       email: string;
       amountCents: number;
       reference: string;
       currency?: string;
       callbackUrl: string;
       metadata?: Record<string, unknown>;
   }) {
       const res = await fetch(`${BASE}/transaction/initialize`, {
           method: "POST",
           headers: authHeaders(),
           body: JSON.stringify({
               email: input.email,
               amount: input.amountCents,      // smallest unit
               reference: input.reference,
               currency: input.currency ?? "KES",
               callback_url: input.callbackUrl,
               metadata: input.metadata,
           }),
       });
       const json = await res.json();
       if (!json.status) throw new Error(`paystack_init_failed: ${json.message}`);
       return json.data as { authorization_url: string; reference: string; access_code: string };
   }

   export async function verifyTransaction(reference: string) {
       const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
           headers: authHeaders(),
       });
       const json = await res.json();
       if (!json.status) throw new Error(`paystack_verify_failed: ${json.message}`);
       return json.data as {
           status: "success" | "failed" | "abandoned";
           amount: number;
           currency: string;
           reference: string;
           id: number;
           metadata?: Record<string, unknown>;
       };
   }

   export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
       const crypto = require("crypto") as typeof import("crypto");
       const hash = crypto
           .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
           .update(rawBody)
           .digest("hex");
       return hash === signature;
   }
   ```

4. **`src/lib/payments/payment-token.ts`** — HMAC-signed, expiring token
   (no extra dependency; use Node `crypto`):

   ```ts
   import crypto from "crypto";

   interface TokenPayload { dateMatchId: string; userId: string; exp: number; }

   export function signPaymentToken(p: Omit<TokenPayload, "exp">, ttlMs = 60 * 60 * 1000) {
       const payload: TokenPayload = { ...p, exp: Date.now() + ttlMs };
       const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
       const sig = crypto.createHmac("sha256", process.env.PAYMENT_TOKEN_SECRET!).update(body).digest("base64url");
       return `${body}.${sig}`;
   }

   export function verifyPaymentToken(token: string): TokenPayload | null {
       const [body, sig] = token.split(".");
       if (!body || !sig) return null;
       const expected = crypto.createHmac("sha256", process.env.PAYMENT_TOKEN_SECRET!).update(body).digest("base64url");
       if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
       const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
       if (payload.exp < Date.now()) return null;
       return payload;
   }
   ```

5. **Reference helper** (unique, traceable) — put in `paystack.ts` or config:

   ```ts
   export function buildPaymentReference(dateMatchId: string, userId: string) {
       const short = (s: string) => s.replace(/-/g, "").slice(0, 6);
       return `strath_date_${short(dateMatchId)}_${short(userId)}_${Date.now().toString(36)}`;
   }
   ```

## How to test

This phase has no HTTP surface yet — test the helpers directly with `tsx`.

1. **Token round-trips:**

   ```bash
   cd strath-mobile/backend/strath-backend
   PAYMENT_TOKEN_SECRET=test npx tsx -e "
     import('./src/lib/payments/payment-token.ts').then(m => {
       const t = m.signPaymentToken({ dateMatchId: 'dm1', userId: 'u1' }, 1000);
       console.log('verify ok:', m.verifyPaymentToken(t));
       setTimeout(() => console.log('expired:', m.verifyPaymentToken(t)), 1200);
     });
   "
   ```
   Expect: first log shows the payload, second (after expiry) shows `null`.
   Tamper a char in the token → `verifyPaymentToken` returns `null`.

2. **Webhook signature** — compute an HMAC-SHA512 of a sample body with your
   secret and confirm `verifyWebhookSignature(body, hash)` is `true`, and `false`
   for a wrong hash.

3. **Paystack init (test key)** — call `initializeTransaction` with a test
   `sk_test_…` key and a fake email; expect a real `authorization_url` back.
   Open it in a browser to confirm a Paystack checkout page renders.

## Done when

- [x] `initializeTransaction` returns a working `authorization_url` with test keys (optional via verify script when keys set).
- [x] `verifyTransaction` implemented (live verify when you complete a test payment).
- [x] Token sign/verify works and rejects expired + tampered tokens.
- [x] Webhook signature verify returns true/false correctly.
- [x] Env documented in `.env.example`.

## Rollback

Delete the three files and env vars. Nothing else references them yet.
