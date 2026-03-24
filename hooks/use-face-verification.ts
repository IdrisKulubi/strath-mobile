import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAuthHeaders } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

export type FaceVerificationStatus =
    | 'not_started'
    | 'pending_capture'
    | 'processing'
    | 'verified'
    | 'retry_required'
    | 'manual_review'
    | 'failed'
    | 'blocked';

export interface FaceVerificationResult {
    id: string;
    sessionId: string;
    decision: string;
    similarity?: number | null;
    faceConfidence?: number | null;
    qualityFlags: string[];
    facesDetected: number;
    createdAt: string;
}

export interface FaceVerificationSession {
    id: string;
    userId: string;
    status: FaceVerificationStatus;
    attemptNumber: number;
    selfieAssetKeys: string[];
    profileAssetKeys: string[];
    thresholdConfigVersion: string;
    decisionSummary: Record<string, unknown>;
    failureReasons: string[];
    startedAt: string;
    completedAt?: string | null;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    results?: FaceVerificationResult[];
}

interface UploadTarget {
    key: string;
    contentType: string;
    signedUrl: string;
    expiresInSeconds: number;
    slot: 'front' | 'left' | 'right' | 'smile' | 'extra';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            ...headers,
            ...(init?.headers ?? {}),
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detailMessage = Array.isArray(payload?.details) && payload.details.length > 0
            ? payload.details
                .map((detail: { path?: (string | number)[]; message?: string }) => {
                    const field = Array.isArray(detail?.path) ? detail.path.join('.') : 'field';
                    return detail?.message ? `${field}: ${detail.message}` : null;
                })
                .filter(Boolean)
                .join(', ')
            : null;

        throw new Error(detailMessage || payload.error || `Request failed with status ${response.status}`);
    }

    return (payload.data ?? payload) as T;
}

async function getLatestSession() {
    return apiFetch<FaceVerificationSession | null>('/api/verification/face/session');
}

async function createSession() {
    return apiFetch<FaceVerificationSession>('/api/verification/face/session', {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

async function retrySession() {
    return apiFetch<FaceVerificationSession>('/api/verification/face/retry', {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

async function requestUploadTargets(sessionId: string, contentType = 'image/jpeg') {
    return apiFetch<{ session: FaceVerificationSession; uploadTargets: UploadTarget[] }>(
        '/api/verification/face/upload-targets',
        {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                uploads: [{ slot: 'front', contentType }],
            }),
        },
    );
}

async function submitSession(sessionId: string, profilePhotoUrls: string[]) {
    return apiFetch<{ session: FaceVerificationSession; queued: boolean }>(
        '/api/verification/face/submit',
        {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                profilePhotoUrls,
            }),
        },
    );
}

export function useFaceVerification() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['face-verification', 'latest-session'],
        queryFn: getLatestSession,
        refetchInterval: (queryState) => {
            const status = queryState.state.data?.status;
            return status === 'processing' || status === 'pending_capture' ? 4000 : false;
        },
    });

    const createSessionMutation = useMutation({
        mutationFn: createSession,
        onSuccess: (data) => {
            queryClient.setQueryData(['face-verification', 'latest-session'], data);
        },
    });

    const retrySessionMutation = useMutation({
        mutationFn: retrySession,
        onSuccess: (data) => {
            queryClient.setQueryData(['face-verification', 'latest-session'], data);
        },
    });

    const uploadAndSubmitMutation = useMutation({
        mutationFn: async ({
            sessionId,
            selfieUri,
            profilePhotoUrls,
        }: {
            sessionId: string;
            selfieUri: string;
            profilePhotoUrls: string[];
        }) => {
            const blobResponse = await fetch(selfieUri);
            const blob = await blobResponse.blob();
            const contentType = blob.type || 'image/jpeg';

            const { uploadTargets } = await requestUploadTargets(sessionId, contentType);
            const target = uploadTargets[0];

            const uploadResponse = await fetch(target.signedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': target.contentType,
                },
                body: blob,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload verification selfie');
            }

            return submitSession(sessionId, profilePhotoUrls);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['face-verification', 'latest-session'], data.session);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });

    return {
        ...query,
        latestSession: query.data,
        createSessionAsync: createSessionMutation.mutateAsync,
        retrySessionAsync: retrySessionMutation.mutateAsync,
        uploadAndSubmitAsync: uploadAndSubmitMutation.mutateAsync,
        isCreatingSession: createSessionMutation.isPending,
        isRetryingSession: retrySessionMutation.isPending,
        isUploadingAndSubmitting: uploadAndSubmitMutation.isPending,
    };
}
