import { useMutation } from '@tanstack/react-query';

import { getAuthHeaders } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';
const API_TIMEOUT_MS = 20_000;

export interface SubmitVerificationAssistanceParams {
    sessionId: string;
    message: string;
}

export interface SubmitVerificationAssistanceResult {
    ok: boolean;
    alreadySubmitted?: boolean;
}

export function useSubmitVerificationAssistance() {
    return useMutation({
        mutationFn: async ({
            sessionId,
            message,
        }: SubmitVerificationAssistanceParams): Promise<SubmitVerificationAssistanceResult> => {
            const headers = await getAuthHeaders();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

            try {
                const response = await fetch(`${API_URL}/api/verification/face/assistance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers,
                    },
                    body: JSON.stringify({ sessionId, message }),
                    signal: controller.signal,
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
                        detailMessage || payload.error || 'Failed to send your message',
                    );
                }

                return (payload.data ?? payload) as SubmitVerificationAssistanceResult;
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new Error('Request timed out. Check your connection and try again.');
                }
                throw error;
            } finally {
                clearTimeout(timeoutId);
            }
        },
    });
}
