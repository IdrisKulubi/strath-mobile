/**
 * RevenueCat server-side REST client + webhook helpers.
 *
 * We never trust the mobile client's claim that a purchase happened.
 * After `Purchases.purchasePackage()` succeeds on the device, the app calls
 * `POST /api/payments/confirm` with the `revenuecatTransactionId` and the
 * server re-fetches the subscriber from RevenueCat to verify the transaction
 * exists, matches our product id, and was purchased recently.
 *
 * See docs/payment.md §8 — "Backend verification flow".
 */
import crypto from "node:crypto";

const REVENUECAT_REST_BASE = "https://api.revenuecat.com/v1";

// Small guard so builds don't crash when env is missing locally. Endpoints
// that need the secret key will throw at call-time, not import-time.
function getSecretApiKey() {
    const key = process.env.REVENUECAT_SECRET_API_KEY;
    if (!key) {
        throw new Error(
            "REVENUECAT_SECRET_API_KEY is not set. Payments verification is disabled.",
        );
    }
    return key;
}

export function getExpectedProductId() {
    return (
        process.env.DATE_PAYMENT_PRODUCT_ID
        ?? "strathspace_date_coordination_fee_200"
    );
}

export function getExpectedPriceCents() {
    const kes = Number.parseInt(process.env.DATE_PAYMENT_PRICE_KES ?? "200", 10);
    return Number.isFinite(kes) && kes > 0 ? kes * 100 : 20000;
}

export function getPaymentWindowHours() {
    const h = Number.parseInt(process.env.DATE_PAYMENT_WINDOW_HOURS ?? "24", 10);
    return Number.isFinite(h) && h > 0 ? h : 24;
}

// ─── REST types (narrow to only what we use) ───────────────────────────────

export interface RCNonSubscriptionPurchase {
    id: string;
    purchase_date: string;
    store: "app_store" | "play_store" | "promotional" | string;
    store_transaction_id?: string;
    is_sandbox?: boolean;
}

export interface RCSubscriber {
    original_app_user_id: string;
    first_seen: string;
    last_seen: string;
    non_subscriptions: Record<string, RCNonSubscriptionPurchase[]>;
    subscriptions: Record<string, unknown>;
    entitlements: Record<string, unknown>;
}

export interface RCSubscriberResponse {
    subscriber: RCSubscriber;
    request_date: string;
    request_date_ms: number;
}

// ─── REST calls ────────────────────────────────────────────────────────────

export async function getSubscriber(appUserId: string): Promise<RCSubscriber> {
    const res = await fetch(
        `${REVENUECAT_REST_BASE}/subscribers/${encodeURIComponent(appUserId)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${getSecretApiKey()}`,
                Accept: "application/json",
                "X-Platform": "server",
            },
            // Never cache — we always want fresh state.
            cache: "no-store",
        },
    );
    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
            `RevenueCat getSubscriber(${appUserId}) failed: ${res.status} ${body}`,
        );
    }
    const json = (await res.json()) as RCSubscriberResponse;
    return json.subscriber;
}

/**
 * Look up a specific non-subscription purchase by transaction id across all
 * products on the subscriber. Returns the purchase entry + the product id it
 * came from, or null if not found.
 */
export function findNonSubscriptionTransaction(
    subscriber: RCSubscriber,
    transactionId: string,
): { productId: string; purchase: RCNonSubscriptionPurchase } | null {
    for (const [productId, purchases] of Object.entries(
        subscriber.non_subscriptions ?? {},
    )) {
        const hit = purchases.find((p) => p.id === transactionId);
        if (hit) return { productId, purchase: hit };
    }
    return null;
}

export interface VerifiedPurchase {
    productId: string;
    storeTransactionId: string;
    revenuecatTransactionId: string;
    purchaseDate: Date;
    platform: "ios" | "android" | null;
    isSandbox: boolean;
}

export class PurchaseVerificationError extends Error {
    constructor(
        public readonly code:
            | "not_found"
            | "product_mismatch"
            | "too_old"
            | "rc_api_error",
        message: string,
    ) {
        super(message);
        this.name = "PurchaseVerificationError";
    }
}

/**
 * Verify a transaction on RevenueCat and return the normalized purchase.
 *
 * @param appUserId - The RC app-user-id (== our internal user.id).
 * @param transactionId - The `revenuecatTransactionId` returned by the SDK.
 * @param opts.maxAgeMinutes - Reject transactions older than this. Default 30.
 */
export async function verifyTransaction(
    appUserId: string,
    transactionId: string,
    opts: { maxAgeMinutes?: number } = {},
): Promise<VerifiedPurchase> {
    const maxAgeMinutes = opts.maxAgeMinutes ?? 30;
    const expectedProductId = getExpectedProductId();

    let subscriber: RCSubscriber;
    try {
        subscriber = await getSubscriber(appUserId);
    } catch (error) {
        throw new PurchaseVerificationError(
            "rc_api_error",
            error instanceof Error ? error.message : String(error),
        );
    }

    const hit = findNonSubscriptionTransaction(subscriber, transactionId);
    if (!hit) {
        throw new PurchaseVerificationError(
            "not_found",
            `Transaction ${transactionId} not found on subscriber ${appUserId}`,
        );
    }

    if (hit.productId !== expectedProductId) {
        throw new PurchaseVerificationError(
            "product_mismatch",
            `Expected ${expectedProductId}, got ${hit.productId}`,
        );
    }

    const purchaseDate = new Date(hit.purchase.purchase_date);
    const ageMinutes = (Date.now() - purchaseDate.getTime()) / 60_000;
    if (ageMinutes > maxAgeMinutes) {
        throw new PurchaseVerificationError(
            "too_old",
            `Transaction is ${Math.round(ageMinutes)} min old (max ${maxAgeMinutes})`,
        );
    }

    const platform: "ios" | "android" | null =
        hit.purchase.store === "app_store"
            ? "ios"
            : hit.purchase.store === "play_store"
                ? "android"
                : null;

    return {
        productId: hit.productId,
        storeTransactionId: hit.purchase.store_transaction_id ?? transactionId,
        revenuecatTransactionId: transactionId,
        purchaseDate,
        platform,
        isSandbox: !!hit.purchase.is_sandbox,
    };
}

// ─── Webhooks ─────────────────────────────────────────────────────────────

/**
 * RevenueCat webhooks authenticate via a shared secret in the `Authorization`
 * header (`Bearer <secret>`) configured in the RC dashboard. Use a constant-
 * time compare to avoid timing attacks.
 */
export function verifyWebhookAuth(headerValue: string | null): boolean {
    const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!expected) {
        console.warn(
            "[revenuecat-server] REVENUECAT_WEBHOOK_SECRET not set — refusing webhook.",
        );
        return false;
    }
    if (!headerValue) return false;
    const received = headerValue.startsWith("Bearer ")
        ? headerValue.slice("Bearer ".length)
        : headerValue;
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

export interface RCWebhookEvent {
    id: string;
    type:
        | "INITIAL_PURCHASE"
        | "NON_RENEWING_PURCHASE"
        | "RENEWAL"
        | "CANCELLATION"
        | "REFUND"
        | "EXPIRATION"
        | "PRODUCT_CHANGE"
        | "BILLING_ISSUE"
        | "TRANSFER"
        | string;
    app_user_id: string;
    original_app_user_id?: string;
    product_id: string;
    transaction_id?: string;
    original_transaction_id?: string;
    store: "APP_STORE" | "PLAY_STORE" | "PROMOTIONAL" | string;
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    environment?: "SANDBOX" | "PRODUCTION" | string;
    price?: number | null;
    currency?: string | null;
    is_family_share?: boolean;
    cancel_reason?: string;
}

export interface RCWebhookBody {
    api_version: string;
    event: RCWebhookEvent;
}
