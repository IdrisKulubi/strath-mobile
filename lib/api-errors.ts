export class VerificationRequiredError extends Error {
    constructor(message = 'Face verification required before using matchmaking') {
        super(message);
        this.name = 'VerificationRequiredError';
    }
}

export class ApiRequestError extends Error {
    readonly code?: string;
    readonly status: number;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
    }
}

export async function parseApiError(response: Response, fallbackMessage: string) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error || fallbackMessage;
    const code = typeof payload?.code === 'string' ? payload.code : undefined;

    if (response.status === 403 && typeof message === 'string' && message.toLowerCase().includes('face verification required')) {
        return new VerificationRequiredError(message);
    }

    return new ApiRequestError(message, response.status, code);
}

export function isVerificationRequiredError(error: unknown) {
    return error instanceof VerificationRequiredError;
}
