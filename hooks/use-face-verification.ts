import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAuthHeaders } from '@/lib/auth-helpers';
import { normalizeImageForUpload } from '@/lib/image-normalization';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';
const API_TIMEOUT_MS = 20_000;
const POLL_FAST_MS = 2000;
const POLL_SLOW_MS = 5000;
const POLL_FAST_WINDOW_MS = 30_000;
const POLL_MAX_WINDOW_MS = 3 * 60_000;

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
    sourceAssetKey?: string;
    targetAssetKey?: string;
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

interface SubmitSessionResponse {
    session: FaceVerificationSession;
    queued?: boolean;
    processedInline?: boolean;
    duplicateSubmit?: boolean;
}

function normalizeSessionPayload(
    payload: FaceVerificationSession | { session?: FaceVerificationSession } | null,
) {
    if (!payload) {
        return null;
    }

    if ('id' in payload && typeof payload.id === 'string') {
        return payload;
    }

    if ('session' in payload) {
        return payload.session ?? null;
    }

    return null;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableFetchError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();
    return (
        message.includes('network request failed') ||
        message.includes('failed to fetch') ||
        message.includes('network error') ||
        message.includes('timed out') ||
        message.includes('timeout')
    );
}

async function apiFetchOnce<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const response = await fetch(`${API_URL}${path}`, {
            ...init,
            signal: controller.signal,
            headers: {
                ...headers,
                ...(init?.headers ?? {}),
            },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const detailMessage =
                Array.isArray(payload?.details) && payload.details.length > 0
                    ? payload.details
                          .map((detail: { path?: (string | number)[]; message?: string }) => {
                              const field = Array.isArray(detail?.path)
                                  ? detail.path.join('.')
                                  : 'field';
                              return detail?.message ? `${field}: ${detail.message}` : null;
                          })
                          .filter(Boolean)
                          .join(', ')
                    : null;

            throw new Error(
                detailMessage || payload.error || `Request failed with status ${response.status}`,
            );
        }

        return (payload.data ?? payload) as T;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timed out. Check your connection and try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function apiFetch<T>(path: string, init?: RequestInit & { allowRetry?: boolean }) {
    const method = (init?.method ?? 'GET').toUpperCase();
    const allowRetry = init?.allowRetry ?? method === 'GET';
    const maxAttempts = allowRetry ? 2 : 1;

    let lastError: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
            return await apiFetchOnce<T>(path, init);
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1 && isRetriableFetchError(error)) {
                await sleep(400 * (attempt + 1));
                continue;
            }
            throw error;
        }
    }

    throw lastError;
}

async function getLatestSession() {
    const payload = await apiFetch<FaceVerificationSession | { session?: FaceVerificationSession } | null>(
        '/api/verification/face/session',
        { allowRetry: true },
    );
    return normalizeSessionPayload(payload);
}

async function createSession() {
    const payload = await apiFetch<FaceVerificationSession | { session?: FaceVerificationSession }>(
        '/api/verification/face/session',
        {
            method: 'POST',
            body: JSON.stringify({}),
            allowRetry: false,
        },
    );

    const session = normalizeSessionPayload(payload);
    if (!session?.id) {
        throw new Error('Verification session was created without an id');
    }

    return session;
}

async function retrySession() {
    const payload = await apiFetch<FaceVerificationSession | { session?: FaceVerificationSession }>(
        '/api/verification/face/retry',
        {
            method: 'POST',
            body: JSON.stringify({}),
            allowRetry: false,
        },
    );

    const session = normalizeSessionPayload(payload);
    if (!session?.id) {
        throw new Error('Verification retry did not return a valid session id');
    }

    return session;
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
            allowRetry: false,
        },
    );
}

async function submitSession(sessionId: string, profilePhotoUrls: string[]) {
    return apiFetch<SubmitSessionResponse>('/api/verification/face/submit', {
        method: 'POST',
        body: JSON.stringify({
            sessionId,
            profilePhotoUrls,
        }),
        allowRetry: false,
    });
}

export function useFaceVerification() {
    const queryClient = useQueryClient();
    const processingPollStartedAtRef = useRef<number | null>(null);
    const [pollTimedOut, setPollTimedOut] = useState(false);
    const [lastSubmitQueued, setLastSubmitQueued] = useState(false);

    const query = useQuery({
        queryKey: ['face-verification', 'latest-session'],
        queryFn: getLatestSession,
        refetchInterval: (queryState) => {
            const status = queryState.state.data?.status;
            const shouldPoll = status === 'processing' || status === 'pending_capture';

            if (!shouldPoll) {
                processingPollStartedAtRef.current = null;
                return false;
            }

            if (processingPollStartedAtRef.current === null) {
                processingPollStartedAtRef.current = Date.now();
            }

            const elapsed = Date.now() - processingPollStartedAtRef.current;
            if (elapsed >= POLL_MAX_WINDOW_MS) {
                return false;
            }

            return elapsed < POLL_FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;
        },
    });

    const status = query.data?.status;
    const isProcessing = status === 'processing';

    useEffect(() => {
        if (!isProcessing && status !== 'pending_capture') {
            setPollTimedOut(false);
            return;
        }

        setPollTimedOut(false);
        const timer = setTimeout(() => {
            setPollTimedOut(true);
        }, POLL_MAX_WINDOW_MS);

        return () => clearTimeout(timer);
    }, [isProcessing, status, query.data?.id]);

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
            if (!sessionId) {
                throw new Error('Verification session is missing. Please start the verification again.');
            }

            const normalizedSelfie = await normalizeImageForUpload(selfieUri);
            const blobResponse = await fetch(normalizedSelfie.uri);
            const blob = await blobResponse.blob();
            const contentType = normalizedSelfie.contentType;

            const { session, uploadTargets } = await requestUploadTargets(sessionId, contentType);
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

            return submitSession(session.id, profilePhotoUrls);
        },
        onSuccess: (data) => {
            setLastSubmitQueued(Boolean(data.queued && !data.processedInline));
            queryClient.setQueryData(['face-verification', 'latest-session'], data.session);
            queryClient.invalidateQueries({ queryKey: ['face-verification', 'latest-session'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });

    return {
        ...query,
        latestSession: query.data,
        pollTimedOut,
        lastSubmitQueued,
        createSessionAsync: createSessionMutation.mutateAsync,
        retrySessionAsync: retrySessionMutation.mutateAsync,
        uploadAndSubmitAsync: uploadAndSubmitMutation.mutateAsync,
        isCreatingSession: createSessionMutation.isPending,
        isRetryingSession: retrySessionMutation.isPending,
        isUploadingAndSubmitting: uploadAndSubmitMutation.isPending,
    };
}
