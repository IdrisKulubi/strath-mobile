# Messaging System Audit

**Date:** June 2026  
**Scope:** Mobile (Expo), Web (Next.js app routes), Backend APIs  
**Status:** Findings documented; Wave 1–2 fixes implemented (June 2026).

---

## Executive summary

Users reported invisible or missing messages. The audit found **one critical data bug** (API returns oldest 50 messages, not latest), **several visibility issues** (text color conflicts, low-contrast hardcoded colors, FlatList layout), **silent error handling** (failures look like empty chats), and **scalability gaps** (3s polling, N+1 inbox queries, no pagination).

---

## Architecture

```
Mobile Chats tab  →  GET /api/conversations  →  conversations-service
Mobile Chat thread →  GET/POST /api/messages/:matchId  →  messages table + chat-access gate
Web Messages      →  GET /api/matches (legacy)
Web Chat          →  GET /api/messages/:matchId (3s poll)
```

**Real-time:** HTTP polling (3s per open chat). Pusher is documented in README but not implemented. Push notifications handle background delivery.

---

## P0 — Critical bugs

### 1. Message API returned oldest 50 messages

**File:** `backend/strath-backend/src/app/api/messages/[matchId]/route.ts`

`orderBy asc` + `limit 50` returned only the first 50 messages chronologically. Threads with 51+ messages never showed newer content.

**Fix:** Fetch latest N with `desc`, reverse for display; add `before` cursor + `since` delta query params.

### 2. Chat access gate hid entire history

**Files:** `app/chat/[matchId].tsx`, `hooks/use-chat.ts`

When slot confirmation was pending, fetch was disabled and FlatList was replaced with gate UI — no read-only history.

**Fix:** Split `canRead` vs `canSend`; always fetch when readable; show history with disabled input when send is blocked.

### 3. No error UI on mobile chat

**Files:** `app/chat/[matchId].tsx`, `components/chat/conversations-list.tsx`

`useChat` exported `isError` / `refetch` but UI never used them. Network failures showed "No messages yet".

**Fix:** Error banner with Retry; separate empty vs error states.

### 4. Strict Zod parse failed entire thread

**File:** `hooks/use-chat.ts`

One malformed message failed the whole array parse.

**Fix:** `safeParse` per message; filter invalid entries; log in dev.

---

## P1 — Visibility bugs

### 5. Text component className overrode bubble colors

**Files:** `components/ui/text.tsx`, `components/chat/message-bubble.tsx`

NativeWind `text-foreground` conflicted with inline `color` on own-message bubbles.

**Fix:** Use `RNText` in bubbles or theme-aware className without conflicting defaults.

### 6. Hardcoded low-contrast colors

| Location | Issue |
|----------|-------|
| `app/chat/[matchId].tsx` | `#636366` connection banner |
| `components/chat/conversations-list.tsx` | `#64748b`, `#94a3b8` hints/empty |
| Web `app/chat/[matchId]/page.tsx` | `text-gray-500` on `bg-white/5` date separators |

**Fix:** Use `useTheme().colors.*` tokens throughout.

### 7. FlatList missing `flex: 1`

**File:** `app/chat/[matchId].tsx`

Bottom messages could be cut off; scroll unreliable.

**Fix:** Add `style={{ flex: 1 }}` to FlatList.

### 8. Three parallel styling systems

`useTheme().colors`, NativeWind `className`, and hardcoded hex — inconsistent contrast and maintenance burden.

**Fix:** Standardize messaging surfaces on theme tokens.

---

## P2 — Scalability & effectiveness

### 9. Polling instead of real-time

| Surface | Interval |
|---------|----------|
| Open chat | 3s full GET |
| Badge counts | 10–15s |

**Improvements:** `?since=` delta polling (implemented); future Pusher/SSE; push → cache invalidation (implemented).

### 10. N+1 in conversations service

Per-conversation `profiles` + `user` queries in a loop.

**Fix:** Batch `inArray` fetch with lookup maps.

### 11. Unused matches pagination

`useInfiniteMatches()` exists but unused; only first 20 legacy matches shown.

### 12. Dual inbox models

Chats tab uses `/api/conversations`; web messages used `/api/matches` with `lastMessage` filter hiding new matches.

**Fix:** Web shows all matches with "Say hello" preview.

### 13. Web chat silent failures

Errors logged only; empty inbox on fetch failure.

**Fix:** Error states with retry on web messages and chat pages.

### 14. Debug logging in production

`markMessagesAsRead` had verbose `console.log` on every chat open.

**Fix:** Gate behind `__DEV__`.

---

## P3 — UX improvements (backlog)

| Area | Recommendation |
|------|----------------|
| Message status | Verify `delivered` is set server-side |
| Search | Include message preview in inbox search |
| Optimistic send | Wait for `currentUserId` before enabling send |
| Archived chats | Persist to backend |
| Media buttons | Hide or implement GIF/music/media in ChatInput |

---

## Fix waves

### Wave 1 — Stop the bleeding
1. Message API ordering + pagination scaffold
2. Error + retry UI
3. MessageBubble text colors
4. FlatList flex
5. Theme tokens for hardcoded grays
6. safeParse for messages

### Wave 2 — Access & reliability
7. Read-only history when gated
8. `?since=` delta polling
9. Batch partner hydration
10. Push cache invalidation
11. Remove debug logs

### Wave 3 — Scale & polish
12. Infinite scroll for older messages
13. Real-time channel (Pusher/SSE)
14. Consolidate web on `/api/conversations`
15. Web theme cleanup
16. Hide/implement media composer

---

## Test plan

- [ ] Thread with 60+ messages: latest visible; older load via cursor (`loadOlderMessages` / `?before=`)
- [ ] Dark + light mode: all bubble text readable
- [ ] Airplane mode → error + retry, not empty state
- [ ] Slot pending: read-only history visible, send disabled
- [ ] Send: optimistic bubble correct side, survives refetch
- [ ] 50+ conversations: inbox loads quickly (batched partner hydration)
- [ ] Web: date separators visible; errors surfaced
- [ ] Push notification received: chat cache invalidates without opening thread

---

## Key files

**Backend**
- `backend/strath-backend/src/app/api/messages/[matchId]/route.ts`
- `backend/strath-backend/src/lib/services/conversations-service.ts`
- `backend/strath-backend/src/lib/chat-access.ts`

**Mobile**
- `hooks/use-chat.ts`
- `hooks/use-conversations.ts`
- `app/chat/[matchId].tsx`
- `app/(tabs)/chats.tsx`
- `components/chat/message-bubble.tsx`
- `components/chat/conversations-list.tsx`
- `hooks/use-push-notifications.ts`

**Web**
- `backend/strath-backend/src/app/app/chat/[matchId]/page.tsx`
- `backend/strath-backend/src/app/app/messages/page.tsx`
