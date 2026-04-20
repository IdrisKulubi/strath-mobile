import { getAuthToken } from '@/lib/auth-helpers';

/**
 * Central API client with a strict, conservative auth policy:
 *
 *  - Network failures NEVER log the user out. Offline === keep session.
 *  - A 401 logs the user out ONLY when the server explicitly signals an auth
 *    failure via one of the known error codes below. An unrelated 401 from a
 *    downstream proxy, rate limiter, or misconfigured CDN is treated as a
 *    transient error instead of a session wipe.
 *
 * Everything in the app should route through `apiFetch` so we have exactly
 * one place that decides "this session is really dead".
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

// Explicit opt-in list of codes that mean "the server will not accept this
// token again; it's time to go back to login". Add here as backend grows.
const AUTH_FAILURE_CODES = new Set([
    'SESSION_EXPIRED',
    'INVALID_TOKEN',
    'UNAUTHENTICATED',
    'USER_DELETED',
    'USER_BANNED',
]);

export class NetworkError extends Error {
    readonly isNetworkError = true as const;
    constructor(message = 'Network request failed') {
        super(message);
        this.name = 'NetworkError';
    }
}

export class ApiError extends Error {
    readonly isApiError = true as const;
    readonly status: number;
    readonly code?: string;
    readonly body: unknown;

    constructor(status: number, message: string, body: unknown, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.body = body;
    }
}

export class AuthExpiredError extends ApiError {
    readonly isAuthExpiredError = true as const;
    constructor(message: string, body: unknown, code: string) {
        super(401, message, body, code);
        this.name = 'AuthExpiredError';
    }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    body?: BodyInit | Record<string, unknown> | unknown[] | null;
    /** Skip attaching the Authorization header (for public endpoints). */
    skipAuth?: boolean;
    /** Override the base URL (defaults to EXPO_PUBLIC_API_URL). */
    baseUrl?: string;
    /** Timeout in ms before aborting the request. Defaults to 20s. */
    timeoutMs?: number;
}

type SessionExpiredHandler = (error: AuthExpiredError) => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

/**
 * Register a single global handler invoked when — and only when — the server
 * returns 401 with a known auth-failure code. Typical implementation: clear
 * the local session and navigate to /(auth)/login.
 *
 * We keep this as a registration hook (instead of importing router directly)
 * so this module stays framework-agnostic and doesn't create a cycle.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
    sessionExpiredHandler = handler;
}

function isAuthFailureBody(body: unknown): { code: string; message: string } | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;
    const code = typeof b.code === 'string' ? b.code : undefined;
    const message = typeof b.message === 'string'
        ? b.message
        : typeof b.error === 'string'
            ? b.error
            : 'Session expired';
    if (code && AUTH_FAILURE_CODES.has(code)) {
        return { code, message };
    }
    // Fallback heuristic: explicit "session expired" / "invalid token" phrasing.
    const msgLower = message.toLowerCase();
    if (
        msgLower.includes('session expired') ||
        msgLower.includes('invalid token') ||
        msgLower.includes('token expired')
    ) {
        return { code: 'SESSION_EXPIRED', message };
    }
    return null;
}

export async function apiFetch<T = unknown>(
    path: string,
    options: ApiFetchOptions = {}
): Promise<T> {
    const { skipAuth, baseUrl, timeoutMs = 20_000, body, headers, ...rest } = options;

    const url = path.startsWith('http') ? path : `${baseUrl ?? API_URL}${path}`;

    const finalHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...(headers as Record<string, string> | undefined),
    };

    let finalBody: BodyInit | undefined;
    if (body != null) {
        if (
            typeof body === 'string' ||
            body instanceof FormData ||
            body instanceof ArrayBuffer ||
            (typeof Blob !== 'undefined' && body instanceof Blob)
        ) {
            finalBody = body as BodyInit;
        } else {
            finalBody = JSON.stringify(body);
            if (!finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
                finalHeaders['Content-Type'] = 'application/json';
            }
        }
    }

    if (!skipAuth) {
        const token = await getAuthToken();
        if (token) {
            finalHeaders.Authorization = `Bearer ${token}`;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
        response = await fetch(url, {
            ...rest,
            headers: finalHeaders,
            body: finalBody,
            signal: controller.signal,
        });
    } catch (error) {
        // fetch throws on DNS failure, no route to host, aborted timeout, etc.
        // Every one of these is a network issue, NOT an auth issue.
        if ((error as Error)?.name === 'AbortError') {
            throw new NetworkError('Request timed out');
        }
        throw new NetworkError(
            error instanceof Error ? error.message : 'Network request failed'
        );
    } finally {
        clearTimeout(timeoutId);
    }

    const rawText = await response.text();
    let parsed: unknown = null;
    if (rawText) {
        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = rawText;
        }
    }

    if (response.ok) {
        return parsed as T;
    }

    if (response.status === 401) {
        const authFailure = isAuthFailureBody(parsed);
        if (authFailure) {
            const err = new AuthExpiredError(authFailure.message, parsed, authFailure.code);
            try {
                sessionExpiredHandler?.(err);
            } catch (handlerError) {
                console.warn('[api-client] sessionExpiredHandler threw:', handlerError);
            }
            throw err;
        }
        // 401 without a recognisable auth failure code: treat as a regular
        // server error. Do NOT wipe the session — we don't know why it's 401.
    }

    const errMessage =
        (parsed && typeof parsed === 'object' && 'error' in parsed
            ? String((parsed as Record<string, unknown>).error)
            : undefined) ||
        (parsed && typeof parsed === 'object' && 'message' in parsed
            ? String((parsed as Record<string, unknown>).message)
            : undefined) ||
        `Request failed with status ${response.status}`;

    const code =
        parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).code === 'string'
            ? ((parsed as Record<string, unknown>).code as string)
            : undefined;

    throw new ApiError(response.status, errMessage, parsed, code);
}

export function isNetworkError(error: unknown): error is NetworkError {
    return !!error && typeof error === 'object' && (error as { isNetworkError?: boolean }).isNetworkError === true;
}

export function isAuthExpiredError(error: unknown): error is AuthExpiredError {
    return !!error && typeof error === 'object' && (error as { isAuthExpiredError?: boolean }).isAuthExpiredError === true;
}

export function isApiError(error: unknown): error is ApiError {
    return !!error && typeof error === 'object' && (error as { isApiError?: boolean }).isApiError === true;
}
