export class VerificationRequiredError extends Error {
    constructor(message = 'Face verification required before using matchmaking') {
        super(message);
        this.name = 'VerificationRequiredError';
    }
}

export async function parseApiError(response: Response, fallbackMessage: string) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error || fallbackMessage;

    if (response.status === 403 && typeof message === 'string' && message.toLowerCase().includes('face verification required')) {
        return new VerificationRequiredError(message);
    }

    return new Error(message);
}

export function isVerificationRequiredError(error: unknown) {
    return error instanceof VerificationRequiredError;
}
