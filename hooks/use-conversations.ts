import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from '@/lib/api-client';

const LastMessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    senderId: z.string(),
    status: z.enum(['sent', 'delivered', 'read']),
    createdAt: z.string(),
});

const ConversationSchema = z.object({
    id: z.string(),
    mutualMatchId: z.string(),
    arrangementStatus: z.string(),
    partner: z.object({
        id: z.string(),
        name: z.string(),
        image: z.string().nullable(),
        lastActive: z.string().nullable(),
    }),
    lastMessage: LastMessageSchema.nullable(),
    unreadCount: z.number(),
    createdAt: z.string(),
});

const ConversationsResponseSchema = z.object({
    conversations: z.array(ConversationSchema),
});

export type Conversation = z.infer<typeof ConversationSchema>;

function conversationSortTime(c: Conversation): number {
    const iso = c.lastMessage?.createdAt ?? c.createdAt;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? 0 : t;
}

/** One row per partner when the API returns duplicate legacy thread ids. */
export function dedupeConversations(conversations: Conversation[]): Conversation[] {
    const byPartner = new Map<string, Conversation>();

    for (const item of conversations) {
        const existing = byPartner.get(item.partner.id);
        if (!existing) {
            byPartner.set(item.partner.id, item);
            continue;
        }
        if (conversationSortTime(item) >= conversationSortTime(existing)) {
            byPartner.set(item.partner.id, item);
        }
    }

    return [...byPartner.values()].sort(
        (a, b) => conversationSortTime(b) - conversationSortTime(a),
    );
}

async function fetchConversations(): Promise<Conversation[]> {
    const result = await apiFetch<{ data?: { conversations: Conversation[] } }>(
        '/api/conversations',
    );
    const raw = result.data?.conversations ?? [];
    const parsed = ConversationsResponseSchema.safeParse({ conversations: raw });
    const list = parsed.success
        ? parsed.data.conversations
        : z.array(ConversationSchema).parse(raw);
    return dedupeConversations(list);
}

/** Mutual matches eligible for messaging, with optional last message preview. */
export function useConversations() {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: fetchConversations,
        staleTime: 15_000,
        gcTime: 5 * 60_000,
    });
}

export function findConversation(
    conversations: Conversation[] | undefined,
    matchId: string,
): Conversation | undefined {
    return conversations?.find((c) => c.id === matchId);
}
