import { Platform } from 'react-native';
import Purchases, {
    LOG_LEVEL,
    PURCHASES_ERROR_CODE,
    type CustomerInfo,
    type CustomerInfoUpdateListener,
    type MakePurchaseResult,
    type PurchasesError,
    type PurchasesOffering,
    type PurchasesPackage,
} from 'react-native-purchases';

/**
 * Thin wrapper around the RevenueCat SDK that encodes StrathSpace-specific
 * conventions (which API key to use per platform, which offering + package
 * represents the Date Coordination Fee, idempotent configure/login, etc.).
 *
 * Design rules:
 *   - Exactly one `Purchases.configure` call per app session (idempotent).
 *   - RevenueCat app-user-id mirrors the StrathSpace user id once available.
 *     When signed out we run anonymous (RC generates the id for us).
 *   - Never block app boot on RevenueCat — if it fails to configure we log
 *     and continue so users in offline/flight-mode don't get stuck.
 *   - This file is the ONLY place that imports `react-native-purchases`.
 *     Everything else in the app talks to us through these helpers, which
 *     keeps the surface area small and testable.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Product + offering identifiers.
 *
 * These MUST match what is set up in:
 *   - RevenueCat dashboard (Offerings → default → Packages)
 *   - App Store Connect (consumable IAP)
 *   - Google Play Console (consumable IAP)
 *
 * See `docs/payment.md` §5 for the product spec.
 */
export const RC_IDS = {
    offering: 'default',
    dateCoordinationPackage: 'date_coordination',
    dateCoordinationProduct: 'strathspace_date_coordination_fee_200',
} as const;

function resolveApiKey(): string | null {
    const ios = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
    const android = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
    const shared = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

    if (Platform.OS === 'ios' && ios) return ios;
    if (Platform.OS === 'android' && android) return android;
    if (shared) return shared;
    return null;
}

// ─── State ───────────────────────────────────────────────────────────────────

let configurePromise: Promise<boolean> | null = null;
let lastKnownUserId: string | null = null;

// ─── Init / identify ─────────────────────────────────────────────────────────

/**
 * Configure the SDK exactly once. Safe to call from multiple places during
 * boot — later calls return the result of the first invocation.
 *
 * Returns `true` if configure succeeded, `false` if we decided to run without
 * RevenueCat (e.g. missing API key, web platform). Never throws.
 */
export function configureRevenueCat(): Promise<boolean> {
    if (configurePromise) return configurePromise;

    configurePromise = (async () => {
        if (Platform.OS === 'web') {
            // react-native-purchases has a web target but we only ship iOS/Android.
            return false;
        }

        const apiKey = resolveApiKey();
        if (!apiKey) {
            console.warn(
                '[revenuecat] Missing EXPO_PUBLIC_REVENUECAT_API_KEY* — skipping configure. ' +
                'Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS / _ANDROID in .env.local to enable payments.'
            );
            return false;
        }

        try {
            if (__DEV__) {
                await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
            } else {
                await Purchases.setLogLevel(LOG_LEVEL.WARN);
            }

            Purchases.configure({ apiKey });
            return true;
        } catch (error) {
            console.warn('[revenuecat] configure failed:', error);
            return false;
        }
    })();

    return configurePromise;
}

/**
 * Identify the currently signed-in StrathSpace user to RevenueCat. Calling
 * with the same id twice is a no-op. Calling with `null` logs out.
 *
 * Run this from the session bootstrap flow whenever the auth state changes.
 */
export async function identifyRevenueCatUser(userId: string | null): Promise<void> {
    const ready = await configureRevenueCat();
    if (!ready) return;

    try {
        if (userId) {
            if (lastKnownUserId === userId) return;
            await Purchases.logIn(userId);
            lastKnownUserId = userId;
        } else {
            if (lastKnownUserId === null) return;
            await Purchases.logOut();
            lastKnownUserId = null;
        }
    } catch (error) {
        console.warn('[revenuecat] identify failed:', error);
    }
}

/**
 * Subscribe to CustomerInfo updates. RevenueCat fires this whenever the
 * underlying entitlements/transactions change — handy to keep React Query
 * caches fresh without polling. Returns an unsubscribe function.
 */
export async function addCustomerInfoListener(
    listener: CustomerInfoUpdateListener
): Promise<() => void> {
    const ready = await configureRevenueCat();
    if (!ready) return () => {};

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
        try {
            Purchases.removeCustomerInfoUpdateListener(listener);
        } catch {
            // ignore
        }
    };
}

// ─── Offerings + purchase ────────────────────────────────────────────────────

/**
 * Fetch the currently configured offering from RevenueCat. Returns `null` if
 * RevenueCat isn't configured, the network is down, or no "current" offering
 * has been set in the dashboard.
 */
export async function fetchCurrentOffering(): Promise<PurchasesOffering | null> {
    const ready = await configureRevenueCat();
    if (!ready) return null;

    try {
        const offerings = await Purchases.getOfferings();
        return offerings.current ?? offerings.all[RC_IDS.offering] ?? null;
    } catch (error) {
        console.warn('[revenuecat] getOfferings failed:', error);
        return null;
    }
}

/**
 * Locate the Date Coordination Fee package inside the current offering.
 * Returns `null` if the package isn't configured — caller should surface a
 * "payments not available right now" message rather than crash.
 */
export async function fetchDateCoordinationPackage(): Promise<PurchasesPackage | null> {
    const offering = await fetchCurrentOffering();
    if (!offering) return null;

    const pkg =
        offering.availablePackages.find((p) => p.identifier === RC_IDS.dateCoordinationPackage) ??
        offering.availablePackages.find(
            (p) => p.product?.identifier === RC_IDS.dateCoordinationProduct
        );

    return pkg ?? null;
}

/**
 * Result returned by `purchaseDateCoordination`. Consumable purchases don't
 * grant an entitlement we check elsewhere — backend is the source of truth
 * for "this user paid for this date". We return the raw transaction so the
 * caller can hand it to our server for verification.
 */
export interface DateCoordinationPurchase {
    productIdentifier: string;
    transactionIdentifier: string;
    purchaseDate: string;
    purchaseToken: string | null; // Android only; iOS returns null
    customerInfo: CustomerInfo;
    rcAppUserId: string;
}

export class RevenueCatUnavailableError extends Error {
    readonly code = 'REVENUECAT_UNAVAILABLE' as const;
    constructor(message = 'RevenueCat is not configured on this device.') {
        super(message);
        this.name = 'RevenueCatUnavailableError';
    }
}

export class PaywallCancelledError extends Error {
    readonly code = 'USER_CANCELLED' as const;
    constructor(message = 'Purchase was cancelled.') {
        super(message);
        this.name = 'PaywallCancelledError';
    }
}

export class PurchaseFailedError extends Error {
    readonly code: string;
    readonly underlying: unknown;
    constructor(message: string, code: string, underlying: unknown) {
        super(message);
        this.name = 'PurchaseFailedError';
        this.code = code;
        this.underlying = underlying;
    }
}

/**
 * Kick off the native purchase sheet for the Date Coordination Fee. Resolves
 * with the raw store transaction on success. Rejects with a typed error:
 *
 *   - `PaywallCancelledError` if the user backed out.
 *   - `RevenueCatUnavailableError` if the SDK isn't configured or the
 *     product isn't available (e.g. dashboard misconfigured, offline).
 *   - `PurchaseFailedError` for all other store / network errors.
 *
 * The caller MUST forward the returned transaction to the backend for
 * verification before unlocking anything (see `docs/payment.md` §8).
 */
export async function purchaseDateCoordination(): Promise<DateCoordinationPurchase> {
    const ready = await configureRevenueCat();
    if (!ready) {
        throw new RevenueCatUnavailableError();
    }

    const pkg = await fetchDateCoordinationPackage();
    if (!pkg) {
        throw new RevenueCatUnavailableError(
            'Date coordination package not available. Check RevenueCat dashboard.'
        );
    }

    let result: MakePurchaseResult;
    try {
        result = await Purchases.purchasePackage(pkg);
    } catch (error) {
        const rcError = error as PurchasesError;
        const isCancel =
            rcError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
            rcError?.userCancelled === true;
        if (isCancel) {
            throw new PaywallCancelledError();
        }
        const code = String(rcError?.code ?? 'UNKNOWN_ERROR');
        const message =
            rcError?.message ??
            (error instanceof Error ? error.message : 'Purchase failed.');

        // Graceful mapping for common store errors.
        switch (rcError?.code) {
            case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
                throw new PurchaseFailedError(
                    'Purchases are disabled on this device. Check restrictions in Settings.',
                    code,
                    error
                );
            case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
                throw new PurchaseFailedError(
                    'Payment is pending approval. We\'ll confirm your date as soon as it clears.',
                    code,
                    error
                );
            case PURCHASES_ERROR_CODE.NETWORK_ERROR:
                throw new PurchaseFailedError(
                    'Network error — check your connection and try again.',
                    code,
                    error
                );
            default:
                throw new PurchaseFailedError(message, code, error);
        }
    }

    const customerInfo = result.customerInfo;
    // For a consumable, the most recent transaction is what we just made.
    // RevenueCat guarantees `result.transaction` is populated on iOS/Android
    // for v7+, but fall back to scanning non-subscription transactions for
    // robustness against future API shifts.
    const transaction =
        result.transaction ??
        [...customerInfo.nonSubscriptionTransactions]
            .sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : -1))
            .find((t) => t.productIdentifier === result.productIdentifier);

    if (!transaction) {
        throw new PurchaseFailedError(
            'Purchase completed but no transaction was returned.',
            'MISSING_TRANSACTION',
            result
        );
    }

    return {
        productIdentifier: result.productIdentifier,
        transactionIdentifier: transaction.transactionIdentifier,
        purchaseDate: transaction.purchaseDate,
        purchaseToken: transaction.purchaseToken ?? null,
        customerInfo,
        rcAppUserId: customerInfo.originalAppUserId,
    };
}

/**
 * Fetch the latest customer info from the store. Use this to refresh UI
 * after app backgrounds, or when verifying a pending purchase. Returns
 * `null` if RevenueCat isn't configured.
 */
export async function getLatestCustomerInfo(): Promise<CustomerInfo | null> {
    const ready = await configureRevenueCat();
    if (!ready) return null;

    try {
        return await Purchases.getCustomerInfo();
    } catch (error) {
        console.warn('[revenuecat] getCustomerInfo failed:', error);
        return null;
    }
}

/**
 * Forces RevenueCat to re-sync unverified store transactions. Useful after a
 * pending purchase clears, or if the user reinstalls. Restores appear in
 * `nonSubscriptionTransactions` for consumables already consumed server-side,
 * so we don't surface a user-facing "Restored!" message — we just re-send
 * any unverified transactions to our backend.
 */
export async function syncPurchasesForRestore(): Promise<CustomerInfo | null> {
    const ready = await configureRevenueCat();
    if (!ready) return null;

    try {
        await Purchases.syncPurchases();
        return await Purchases.getCustomerInfo();
    } catch (error) {
        console.warn('[revenuecat] syncPurchases failed:', error);
        return null;
    }
}
