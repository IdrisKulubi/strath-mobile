import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Conversation } from '@/hooks/use-conversations';
import { useIdentity } from '@/lib/questionnaire';

type Marker = { id: string; lastMessageId: string | null };
type InboxState = { archived: Marker[]; removed: Marker[] };

const emptyState: InboxState = { archived: [], removed: [] };
const keyFor = (userId: string) => `strathspace:conversation-inbox:${userId}`;

function marked(markers: Marker[], conversation: Conversation) {
  return markers.some((marker) => marker.id === conversation.id && marker.lastMessageId === (conversation.lastMessage?.id ?? null));
}

export function useConversationInbox() {
  const identity = useIdentity();
  const userId = identity.data;
  const [state, setState] = useState<InboxState>(emptyState);
  const [loadedUser, setLoadedUser] = useState<string | null>(null);
  const stateRef = useRef<InboxState>(emptyState);
  const writeRef = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void AsyncStorage.getItem(keyFor(userId)).then((raw) => {
      if (cancelled) return;
      let parsed = emptyState;
      if (raw) {
        try {
          const value = JSON.parse(raw) as Partial<InboxState>;
          if (Array.isArray(value.archived) && Array.isArray(value.removed)) parsed = { archived: value.archived, removed: value.removed };
        } catch { /* An unreadable local inbox state falls back to the full inbox. */ }
      }
      stateRef.current = parsed;
      setState(parsed);
      setLoadedUser(userId);
    }).catch(() => {
      if (!cancelled) {
        stateRef.current = emptyState;
        setState(emptyState);
        setLoadedUser(userId);
      }
    });
    return () => { cancelled = true; };
  }, [userId]);

  const update = useCallback((change: (previous: InboxState) => InboxState) => {
    if (!userId || loadedUser !== userId) return;
    const next = change(stateRef.current);
    stateRef.current = next;
    setState(next);
    writeRef.current = writeRef.current.catch(() => undefined).then(() => AsyncStorage.setItem(keyFor(userId), JSON.stringify(next)));
  }, [loadedUser, userId]);

  const archive = useCallback((conversation: Conversation) => update((previous) => ({
    archived: [...previous.archived.filter((item) => item.id !== conversation.id), { id: conversation.id, lastMessageId: conversation.lastMessage?.id ?? null }],
    removed: previous.removed.filter((item) => item.id !== conversation.id),
  })), [update]);
  const remove = useCallback((conversation: Conversation) => update((previous) => ({
    archived: previous.archived.filter((item) => item.id !== conversation.id),
    removed: [...previous.removed.filter((item) => item.id !== conversation.id), { id: conversation.id, lastMessageId: conversation.lastMessage?.id ?? null }],
  })), [update]);
  const unarchive = useCallback((conversation: Conversation) => update((previous) => ({
    ...previous,
    archived: previous.archived.filter((item) => item.id !== conversation.id),
  })), [update]);

  return {
    ready: Boolean(userId && loadedUser === userId),
    isArchived: (conversation: Conversation) => marked(state.archived, conversation),
    isRemoved: (conversation: Conversation) => marked(state.removed, conversation),
    archive,
    remove,
    unarchive,
  };
}
