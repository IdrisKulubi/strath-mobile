// Questionnaire discovery requires actual verification, including accounts
// whose legacy faceVerificationRequired flag is false. Historical sessions
// cannot restore verification after profile photos have reset it.
export function hasCurrentFaceVerification(profile: { faceVerificationStatus?: string } | null | undefined) {
    return profile?.faceVerificationStatus === 'verified';
}

type VerificationStatus = 'not_started' | 'pending_capture' | 'processing' | 'verified' | 'retry_required' | 'manual_review' | 'failed' | 'blocked';

export function currentVerificationStatus(profileStatus: VerificationStatus | undefined, sessionStatus: VerificationStatus | undefined): VerificationStatus {
    if (profileStatus === 'verified') return 'verified';
    if (sessionStatus === 'verified') return profileStatus ?? 'not_started';
    return sessionStatus ?? profileStatus ?? 'not_started';
}
