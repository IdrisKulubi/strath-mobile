# Phase 8 — Mobile hooks + API client

**Status:** ✅ Done  
**Depends on:** Phases 4, 5  
**User-visible:** No (plumbing)

## Goal

Add typed API helpers and React Query hooks the UI phases will use.

## Files to create / edit

| File | Purpose |
|------|---------|
| `strath-mobile/lib/reschedule-api.ts` | `fetchRescheduleOptions`, `postRescheduleRequest`, `postRescheduleRespond`, `postRescheduleCancel` |
| `strath-mobile/hooks/use-reschedule.ts` | Mutations + options query |
| `strath-mobile/hooks/use-date-requests.ts` | Extend `MutualDate` / slot types with `reschedule?` |
| `strath-mobile/lib/meetup-slot.ts` | Reuse `formatMeetupSlot` for labels |

## Hook API (suggested)

```ts
export function useRescheduleOptions(mutualMatchId: string | undefined) {
  // queryKey: ['reschedule-options', mutualMatchId]
  // enabled when modal open
}

export function useRequestReschedule() {
  // onSuccess: invalidate ['daily-matches'], ['mutual-dates'], ['reschedule-options']
}

export function useRespondReschedule() {
  // variables: { requestId, action, declineReason?, counterScheduledAt? }
}
```

Mirror patterns from `hooks/use-confirm-meetup-slot.ts` and `hooks/use-daily-matches.ts`.

## Error handling

Map API `reason` to user-facing strings:

| `reason` | Message |
|----------|---------|
| `confirm_first` | Confirm your date before requesting a change. |
| `pending_exists` | You already have a pending date change request. |
| `counter_cap_reached` | You've reached the limit of counter-proposals. Accept the time or cancel this match. |
| `invalid_slot` | That time is no longer available. Pick another slot. |

## Steps

1. Implement `reschedule-api.ts` with `API_URL` from existing config.
2. Add hooks with `useMutation` / `useQuery`.
3. Extend types on `MutualDate` and home hold type to include `reschedule` from phase 5.
4. Export helper `getReschedulePending(match)` for banners.

## How to test

1. Temporarily log responses in a throwaway screen or Reactotron.
2. Call `useRescheduleOptions` with a real `mutualMatchId` → options array length > 0.
3. Fire request mutation → daily-matches refetch shows `pending`.

## Done when

- [ ] Hooks compile and call real backend.
- [ ] Invalidation refreshes dates tab + home hold.
- [ ] Types match backend JSON.

## Rollback

Delete new files; no UI yet.
