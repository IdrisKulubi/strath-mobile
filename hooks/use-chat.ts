import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { z } from 'zod';
import { getAuthToken } from '@/lib/auth-helpers';
import { getCurrentUserId } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const MessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    matchId: z.string(),
    senderId: z.string(),
    status: z.enum(['sent', 'delivered', 'read']),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export class ChatAccessDeniedError extends Error {
    constructor() {
        super('Confirm your assigned date before messaging.');
        this.name = 'ChatAccessDeniedError';
    }
}

interface UseChatOptions {
    /** When false, skips fetch, read receipts, and polling. */
    enabled?: boolean;
}

interface FetchMessagesOptions {
    since?: string;
    before?: string;
    limit?: number;
}

interface FetchMessagesResult {
    messages: Message[];
    hasMore: boolean;
}

function parseMessagesPayload(raw: unknown): FetchMessagesResult {
    if (Array.isArray(raw)) {
        return { messages: parseMessageArray(raw), hasMore: false };
    }
    if (raw && typeof raw === 'object' && 'messages' in raw) {
        const payload = raw as { messages?: unknown; hasMore?: boolean };
        return {
            messages: parseMessageArray(payload.messages ?? []),
            hasMore: Boolean(payload.hasMore),
        };
    }
    return { messages: parseMessageArray(raw), hasMore: false };
}

function parseMessageArray(items: unknown): Message[] {
    if (!Array.isArray(items)) return [];

    const valid: Message[] = [];
    for (const item of items) {
        const parsed = MessageSchema.safeParse(item);
        if (parsed.success) {
            valid.push(parsed.data);
        } else if (__DEV__) {
            console.warn('[useChat] Skipping invalid message:', parsed.error.flatten());
        }
    }
    return valid;
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
    const byId = new Map<string, Message>();
    for (const msg of existing) {
        byId.set(msg.id, msg);
    }
    for (const msg of incoming) {
        byId.set(msg.id, msg);
    }
    return [...byId.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

async function fetchMessages(
    matchId: string,
    options?: FetchMessagesOptions,
): Promise<FetchMessagesResult> {
    const token = await getAuthToken();
    const params = new URLSearchParams();
    if (options?.since) params.set('since', options.since);
    if (options?.before) params.set('before', options.before);
    if (options?.limit) params.set('limit', String(options.limit));

    const qs = params.toString();
    const url = `${API_URL}/api/messages/${matchId}${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
        headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
    });

    if (response.status === 403) {
        throw new ChatAccessDeniedError();
    }

    if (!response.ok) {
        throw new Error('Failed to fetch messages');
    }

    const result = await response.json();
    const raw = result.data ?? result;
    return parseMessagesPayload(raw);
}

async function sendMessage(matchId: string, content: string): Promise<Message> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/messages/${matchId}`, {
        method: 'POST',
        headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });

    if (response.status === 403) {
        throw new ChatAccessDeniedError();
    }

    if (!response.ok) {
        throw new Error('Failed to send message');
    }

    const result = await response.json();
    const parsed = MessageSchema.safeParse(result.data || result);
    if (!parsed.success) {
        throw new Error('Invalid message response from server');
    }
    return parsed.data;
}

async function markMessagesAsRead(matchId: string): Promise<void> {
    const token = await getAuthToken();

    try {
        const url = `${API_URL}/api/messages/${matchId}/read`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok && __DEV__) {
            const data = await response.json().catch(() => ({}));
            console.warn('[markAsRead] Failed:', response.status, data);
        }
    } catch (error) {
        if (__DEV__) {
            console.error('[markAsRead] Error:', error);
        }
    }
}

/**
 * Smart polling hook for chat messages
 * - Polls every 3 seconds when chat is open (delta via ?since=)
 * - Pauses when app is backgrounded
 * - Supports optimistic updates
 */
export function useChat(matchId: string, options?: UseChatOptions) {
    const queryClient = useQueryClient();
    const enabled = options?.enabled !== false && !!matchId;
    const [isAppActive, setIsAppActive] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const hasMoreRef = useRef(false);

    useEffect(() => {
        getCurrentUserId().then(setCurrentUserId);
    }, []);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            setIsAppActive(nextAppState === 'active');
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        if (matchId && enabled) {
            markMessagesAsRead(matchId).then(() => {
                queryClient.invalidateQueries({ queryKey: ['matches'] });
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
                queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
                queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
            });
        }
    }, [matchId, queryClient, enabled]);

    const {
        data: messages = [],
        isPending,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ['chat', matchId],
        queryFn: async () => {
            const existing = queryClient.getQueryData<Message[]>(['chat', matchId]) ?? [];

            if (existing.length > 0) {
                const lastCreatedAt = existing[existing.length - 1]?.createdAt;
                if (lastCreatedAt) {
                    const { messages: delta } = await fetchMessages(matchId, {
                        since: lastCreatedAt,
                    });
                    if (delta.length === 0) {
                        return existing;
                    }
                    return mergeMessages(existing, delta);
                }
            }

            const { messages: loaded, hasMore } = await fetchMessages(matchId);
            hasMoreRef.current = hasMore;
            return loaded;
        },
        refetchInterval: isAppActive ? 3000 : false,
        refetchIntervalInBackground: false,
        enabled,
        retry: (failureCount, err) => {
            if (err instanceof ChatAccessDeniedError) return false;
            return failureCount < 2;
        },
        staleTime: 2000,
        gcTime: 5 * 60 * 1000,
        placeholderData: (previousData) => previousData,
        structuralSharing: true,
    });

    const loadOlderMessages = async (): Promise<void> => {
        if (!hasMoreRef.current || messages.length === 0) return;

        const oldest = messages[0]?.createdAt;
        if (!oldest) return;

        const { messages: older, hasMore } = await fetchMessages(matchId, {
            before: oldest,
        });
        hasMoreRef.current = hasMore;

        if (older.length === 0) return;

        queryClient.setQueryData<Message[]>(['chat', matchId], (old = []) =>
            mergeMessages(older, old),
        );
    };

    const sendMessageMutation = useMutation({
        mutationFn: (content: string) => sendMessage(matchId, content),
        onMutate: async (content) => {
            await queryClient.cancelQueries({ queryKey: ['chat', matchId] });

            const previousMessages = queryClient.getQueryData<Message[]>(['chat', matchId]);

            const optimisticMessage: Message = {
                id: `temp-${Date.now()}`,
                content,
                matchId,
                senderId: currentUserId || '',
                status: 'sent',
                createdAt: new Date().toISOString(),
            };

            queryClient.setQueryData<Message[]>(['chat', matchId], (old = []) => [
                ...old,
                optimisticMessage,
            ]);

            return { previousMessages };
        },
        onError: (_err, _content, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['chat', matchId], context.previousMessages);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['chat', matchId] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
        },
    });

    const isAccessDenied = isError && error instanceof ChatAccessDeniedError;

    return {
        messages,
        isInitialLoading: enabled && isPending && messages.length === 0,
        isLoading: isPending,
        isFetching,
        isError,
        isAccessDenied,
        error,
        refetch,
        loadOlderMessages,
        hasMoreMessages: hasMoreRef.current,
        sendMessage: sendMessageMutation.mutate,
        isSending: sendMessageMutation.isPending,
        currentUserId,
        isAppActive,
        canSend: Boolean(currentUserId),
    };
}

export function formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}
