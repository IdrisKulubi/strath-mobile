const DEFAULT_AMOUNT_CENTS = 49_900;
const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_TOKEN_TTL_MS = 3_600_000;
const DEFAULT_WEB_PAYMENT_URL = "https://strathspace.com/payments";
const DEFAULT_APP_RETURN_URL = "strathspace://payments/callback";

export function parsePositiveInt(value: string | undefined, fallback: number): number {
    if (value === undefined || value === "") return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function readPaymentConfig() {
    return {
        amountCents: parsePositiveInt(
            process.env.DATE_CONFIRMATION_AMOUNT_CENTS,
            DEFAULT_AMOUNT_CENTS,
        ),
        currency: "KES" as const,
        windowHours: parsePositiveInt(
            process.env.DATE_PAYMENT_WINDOW_HOURS,
            DEFAULT_WINDOW_HOURS,
        ),
        webPaymentUrl: process.env.WEB_PAYMENT_URL?.trim() || DEFAULT_WEB_PAYMENT_URL,
        appReturnUrl: process.env.APP_PAYMENT_RETURN_URL?.trim() || DEFAULT_APP_RETURN_URL,
        tokenTtlMs: DEFAULT_TOKEN_TTL_MS,
    };
}

/** Read at call time so tests/scripts can set env before use. */
export function getPaymentConfig() {
    return readPaymentConfig();
}

/** @deprecated Prefer getPaymentConfig() for fresh env reads; kept for simple imports. */
export const PAYMENT_CONFIG = new Proxy({} as ReturnType<typeof readPaymentConfig>, {
    get(_target, prop) {
        const config = readPaymentConfig();
        return config[prop as keyof typeof config];
    },
});

export function getPaystackSecretKey(): string {
    const key = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!key) {
        throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }
    return key;
}

export function getPaystackPublicKey(): string | null {
    const key = process.env.PAYSTACK_PUBLIC_KEY?.trim();
    return key || null;
}

export function getWebhookSigningSecret(): string {
    const dedicated = process.env.PAYSTACK_WEBHOOK_SECRET?.trim();
    if (dedicated) return dedicated;
    return getPaystackSecretKey();
}

export function getPaymentTokenSecret(): string {
    const secret = process.env.PAYMENT_TOKEN_SECRET?.trim();
    if (!secret) {
        throw new Error("PAYMENT_TOKEN_SECRET is not configured");
    }
    return secret;
}

export function assertPaymentEnv(): void {
    getPaystackSecretKey();
    getPaymentTokenSecret();
}
