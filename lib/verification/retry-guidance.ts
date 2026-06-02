import type { FaceVerificationResult } from '@/hooks/use-face-verification';

export type VerificationRetryGuidance = {
    title: string;
    shortBody: string;
    body: string;
    tips: string[];
    showSelfieAction: boolean;
    showPhotoAction: boolean;
};

const PHOTO_RELATED_REASON_CODES = new Set([
    'no_face_detected',
    'invalid_image_format',
    'invalid_image_parameters',
    'image_too_large',
    'image_processing_failed',
    'insufficient_usable_profile_photos',
]);

const PHOTO_RELATED_QUALITY_FLAGS = new Set([
    'no_face_detected',
    'invalid_image_format',
    'invalid_image_parameters',
    'image_too_large',
    'image_processing_failed',
    'multiple_faces_detected',
    'multiple_target_faces',
]);

export function deriveProfilePhotoIssueSignals(results: FaceVerificationResult[] | undefined) {
    const rows = results ?? [];
    let unsupportedProfilePhotoCount = 0;
    for (const row of rows) {
        if (row.decision === 'error') {
            unsupportedProfilePhotoCount += 1;
            continue;
        }
        const flags = row.qualityFlags ?? [];
        if (flags.some((flag) => PHOTO_RELATED_QUALITY_FLAGS.has(flag))) {
            unsupportedProfilePhotoCount += 1;
        }
    }
    return { unsupportedProfilePhotoCount };
}

export function getVerificationRetryGuidance(input: {
    status: string;
    failureReasons: string[];
    results: FaceVerificationResult[];
    supportedProfilePhotoCount: number;
    unsupportedProfilePhotoCount: number;
}): VerificationRetryGuidance | null {
    if (input.status !== 'retry_required' && input.status !== 'failed') {
        return null;
    }

    const selfieIssueDetected = input.failureReasons.includes('selfie_face_not_detected');
    const photoRelatedReasonCount = input.failureReasons.filter((reason) =>
        PHOTO_RELATED_REASON_CODES.has(reason),
    ).length;
    const photoRelatedResultCount = input.results.filter((result) =>
        (result.qualityFlags ?? []).some((flag) => PHOTO_RELATED_QUALITY_FLAGS.has(flag)),
    ).length;
    const photoIssueDetected =
        input.supportedProfilePhotoCount < 2 ||
        input.unsupportedProfilePhotoCount > 0 ||
        input.failureReasons.includes('insufficient_usable_profile_photos') ||
        photoRelatedReasonCount >= 2 ||
        photoRelatedResultCount >= 2;
    const onlyMatchIssue =
        input.failureReasons.length > 0 &&
        input.failureReasons.every((reason) => reason === 'insufficient_match_count');

    if (photoIssueDetected && selfieIssueDetected) {
        return {
            title: 'A quick photo refresh should help',
            shortBody: 'Refresh your selfie and profile photos, then try again.',
            body: 'A fresh selfie plus a quick update to your profile photos should give this the best chance of passing.',
            tips: [
                'Use at least 2 clear solo photos where your face is easy to see.',
                'Retake your selfie in good light with your full face in frame.',
            ],
            showSelfieAction: true,
            showPhotoAction: true,
        };
    }

    if (photoIssueDetected) {
        return {
            title: 'Your profile photos need a quick update',
            shortBody: 'Swap in clearer photos, then try again.',
            body: 'At least one of your current photos is too hard to verify. Swap in clearer photos and try again.',
            tips: [
                'Use at least 2 recent photos where your face is front and center.',
                'Avoid group shots, heavy filters, and photos where your face is partly covered.',
            ],
            showSelfieAction: false,
            showPhotoAction: true,
        };
    }

    if (selfieIssueDetected) {
        return {
            title: 'Your selfie needs another go',
            shortBody: 'Take a fresh selfie with your full face in frame.',
            body: 'We could not clearly read the selfie from the last attempt. Take a fresh one and keep your full face in frame.',
            tips: [
                'Use soft, even lighting and hold the phone steady.',
                'Look straight at the camera and avoid sunglasses, masks, or strong filters.',
            ],
            showSelfieAction: true,
            showPhotoAction: false,
        };
    }

    if (onlyMatchIssue) {
        return {
            title: 'We need a closer match',
            shortBody: 'Try a fresh selfie and check your profile photos.',
            body: 'Try a fresh selfie and make sure your profile photos still look like you right now.',
            tips: [
                'Use recent profile photos with a clear view of your face.',
                'Retake your selfie in good light and keep your face centered.',
            ],
            showSelfieAction: true,
            showPhotoAction: true,
        };
    }

    const hasWeakPerPhotoSignals = input.results.some(
        (r) =>
            r.decision === 'error' ||
            r.decision === 'not_matched' ||
            (r.qualityFlags?.length ?? 0) > 0,
    );
    const shouldOfferPhotosForMixedFailure =
        input.failureReasons.includes('insufficient_match_count') && hasWeakPerPhotoSignals;

    return {
        title: 'One more try should do it',
        shortBody: 'Try one more selfie and we will check it again.',
        body: 'Something in the last attempt was not clear enough. Try a fresh selfie and we will run it again.',
        tips: [
            'Use clear lighting and keep your face centered in frame.',
            'Take off anything covering your face and hold the phone steady.',
        ],
        showSelfieAction: true,
        showPhotoAction: shouldOfferPhotosForMixedFailure,
    };
}

export function getPhotoFailureCauseLine(
    guidance: Pick<VerificationRetryGuidance, 'showPhotoAction'> | null | undefined,
    failureReasons: string[],
): string | null {
    if (!guidance?.showPhotoAction) {
        return null;
    }
    const explicitPhotoCode = failureReasons.some((code) => PHOTO_RELATED_REASON_CODES.has(code));
    if (explicitPhotoCode) {
        return 'Our check flagged an issue with your profile photos. Edit them in your profile, save, then run verification again.';
    }
    if (failureReasons.includes('insufficient_match_count')) {
        return 'Your selfie did not match enough profile photos closely enough. Update your photos (or add clearer ones), save, then try again.';
    }
    return 'Updating your profile photos may help this pass. Edit them from your profile, save, then run verification again.';
}
