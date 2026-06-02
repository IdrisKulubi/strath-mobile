import type { FaceVerificationSession } from '@/hooks/use-face-verification';

export function getStatusDetailCopy(
    status: string,
    isProcessing: boolean,
    options?: { pollTimedOut?: boolean; queuedBackground?: boolean },
) {
    if (options?.pollTimedOut && (isProcessing || status === 'processing')) {
        return 'This is taking longer than usual. We are still finishing your check in the background. Stay here or come back in a moment.';
    }

    if (options?.queuedBackground && (isProcessing || status === 'processing')) {
        return 'Your check is queued and will finish shortly. This usually takes under a minute.';
    }

    if (isProcessing || status === 'processing') {
        return 'Your selfie is being compared with your profile photos. This usually finishes in under a minute.';
    }
    if (status === 'pending_capture') {
        return 'Take one clear selfie. We compare it with your profile photos before you can use matchmaking.';
    }
    if (status === 'manual_review') {
        return 'This check is waiting for a manual review. You will get access once it is cleared.';
    }
    if (status === 'blocked') {
        return 'Verification is blocked on this account. Contact support if you think this is a mistake.';
    }
    return 'Take one selfie to keep moving.';
}

export function getFriendlyStatusLabel(status: string) {
    switch (status) {
        case 'verified':
            return 'Verified';
        case 'processing':
            return 'Checking your selfie';
        case 'pending_capture':
            return 'Waiting for selfie';
        case 'retry_required':
            return 'Needs another try';
        case 'failed':
            return 'Did not pass';
        case 'manual_review':
            return 'Under review';
        case 'blocked':
            return 'Blocked';
        case 'not_started':
            return 'Not started';
        default:
            return status.replace(/_/g, ' ');
    }
}

export function getVerificationUserMessage(error: unknown) {
    const fallback = 'We could not finish verification right now. Please try again.';

    if (!(error instanceof Error)) {
        return fallback;
    }

    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('at least 2') && normalizedMessage.includes('profile')) {
        return 'Add at least 2 clear profile photos, then try again.';
    }

    if (normalizedMessage.includes('cannot be retried')) {
        return 'That attempt has closed out, so we started a fresh check for you. Try again once more.';
    }

    if (normalizedMessage.includes('timed out') || normalizedMessage.includes('timeout')) {
        return 'The request timed out. Check your connection and try again.';
    }

    if (normalizedMessage.includes('session')) {
        return 'Something timed out in the background. Try again and we will restart it cleanly.';
    }

    if (normalizedMessage.includes('upload')) {
        return 'Your selfie did not upload properly. Try again with a steady connection.';
    }

    if (normalizedMessage.includes('selfie')) {
        return 'That selfie did not come through clearly. Retake it and try again.';
    }

    if (
        normalizedMessage.includes('comparefaces') ||
        normalizedMessage.includes('rekognition') ||
        normalizedMessage.includes('image format')
    ) {
        return 'Some of your photos need a quick refresh before we can finish verification.';
    }

    return error.message || fallback;
}

export function isCannotRetrySessionError(error: unknown) {
    return error instanceof Error && error.message.toLowerCase().includes('cannot be retried');
}

export const VERIFICATION_ASSISTANCE_EXPANDED_HINT =
    'Tell us what went wrong. We will use your account email and phone to reach out.';

export const VERIFICATION_ASSISTANCE_PLACEHOLDER =
    'For example: my photos look fine but verification keeps failing…';

export const VERIFICATION_ASSISTANCE_CONFIRMATION =
    'Thanks — we will reach out in a few hours. You can still try verification again below.';

export function isFirstAttemptVerificationFailure(
    status: string,
    attemptNumber: number | null | undefined,
) {
    return (
        attemptNumber === 1 &&
        (status === 'retry_required' || status === 'failed')
    );
}

export function isVerificationSessionExpired(session: FaceVerificationSession | null | undefined) {
    if (!session?.expiresAt) {
        return false;
    }

    return new Date(session.expiresAt).getTime() <= Date.now();
}
