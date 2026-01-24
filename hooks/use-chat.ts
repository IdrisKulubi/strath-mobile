import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { z } from 'zod';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Message schema
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

// Fetch messages for a match
async function fetchMessages(matchId: string): Promise<Message[]> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/messages/${matchId}`, {
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch messages');
    }

    const result = await response.json();
    const messages = result.data || result;

    // Validate messages
    return z.array(MessageSchema).parse(messages);
}

// Send a message
async function sendMessage(matchId: string, content: string): Promise<Message> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/messages/${matchId}`, {
        method: 'POST',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        throw new Error('Failed to send message');
    }

    const result = await response.json();
    return MessageSchema.parse(result.data || result);
}

// Mark messages as read
async function markMessagesAsRead(matchId: string): Promise<void> {
    console.log('[markAsRead] Starting for matchId:', matchId);
    const token = await getAuthToken();
    console.log('[markAsRead] Token:', token ? 'Present' : 'Missing');

    try {
        const url = `${API_URL}/api/messages/${matchId}/read`;
        console.log('[markAsRead] Calling:', url);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
            },
        });

        console.log('[markAsRead] Response status:', response.status);
        const data = await response.json();
        console.log('[markAsRead] Response data:', data);

        if (!response.ok) {
            console.warn('[markAsRead] Failed:', response.status, data);
        } else {
            console.log('[markAsRead] Success!');
        }
    } catch (error) {
        console.error('[markAsRead] Error:', error);
    }
}

// Get current user ID helper - uses the shared auth helper
import { getCurrentUserId } from '@/lib/auth-helpers';

/**
 * Smart polling hook for chat messages
 * - Polls every 3 seconds when chat is open
 * - Pauses when app is backgrounded
 * - Supports optimistic updates
 */
export function useChat(matchId: string) {
    const queryClient = useQueryClient();
    const [isAppActive, setIsAppActive] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get current user ID on mount
    useEffect(() => {
        getCurrentUserId().then(setCurrentUserId);
    }, []);

    // Track app state for smart polling
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            setIsAppActive(nextAppState === 'active');
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    // Mark messages as read when chat opens
    useEffect(() => {
        if (matchId) {
            markMessagesAsRead(matchId).then(() => {
                // Invalidate matches cache to update unread counts in the list
                queryClient.invalidateQueries({ queryKey: ['matches'] });
            });
        }
    }, [matchId, queryClient]);

    // Fetch messages with smart polling
    // isPending is only true on initial load (no cached data), not during refetches
    // placeholderData keeps previous data visible during refetch
    const {
        data: messages = [],
        isPending,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ['chat', matchId],
        queryFn: () => fetchMessages(matchId),
        refetchInterval: isAppActive ? 3000 : false, // Poll every 3s when active
        refetchIntervalInBackground: false,
        enabled: !!matchId,
        staleTime: 2000, // Consider data stale after 2s
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 min
        placeholderData: (previousData) => previousData, // Keep previous data during refetch
        structuralSharing: true, // Prevent re-renders if data is deeply equal
    });

    // Send message mutation with optimistic update
    const sendMessageMutation = useMutation({
        mutationFn: (content: string) => sendMessage(matchId, content),
        onMutate: async (content) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['chat', matchId] });

            // Snapshot previous messages
            const previousMessages = queryClient.getQueryData<Message[]>(['chat', matchId]);

            // Optimistically add new message
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
            // Rollback on error
            if (context?.previousMessages) {
                queryClient.setQueryData(['chat', matchId], context.previousMessages);
            }
        },
        onSettled: () => {
            // Refetch to get the real message with server ID
            queryClient.invalidateQueries({ queryKey: ['chat', matchId] });
            // Also invalidate matches to update last message
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
    });

    return {
        messages,
        isInitialLoading: isPending && messages.length === 0, // Truly only valid for the first load
        isLoading: isPending,
        isFetching,
        isError,
        error,
        refetch,
        sendMessage: sendMessageMutation.mutate,
        isSending: sendMessageMutation.isPending,
        currentUserId,
        isAppActive,
    };
}

/**
 * Format message timestamp for display
 */
export function formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}
