import { getPaystackSecretKey } from "@/lib/payments/config";
import type { PaystackApiEnvelope } from "@/lib/payments/types";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export class PaystackApiError extends Error {
    readonly code: string;
    readonly httpStatus?: number;

    constructor(message: string, code = "paystack_api_error", httpStatus?: number) {
        super(message);
        this.name = "PaystackApiError";
        this.code = code;
        this.httpStatus = httpStatus;
    }
}

function authHeaders(): HeadersInit {
    return {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        "Content-Type": "application/json",
    };
}

export async function paystackRequest<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
): Promise<T> {
    const url = `${PAYSTACK_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

    const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    let envelope: PaystackApiEnvelope<T>;

    try {
        envelope = JSON.parse(rawText) as PaystackApiEnvelope<T>;
    } catch {
        throw new PaystackApiError(
            `Paystack returned invalid JSON (${response.status})`,
            "paystack_invalid_json",
            response.status,
        );
    }

    if (!response.ok) {
        throw new PaystackApiError(
            envelope.message || `Paystack HTTP ${response.status}`,
            "paystack_http_error",
            response.status,
        );
    }

    if (!envelope.status) {
        throw new PaystackApiError(
            envelope.message || "Paystack request failed",
            "paystack_request_failed",
            response.status,
        );
    }

    return envelope.data;
}
