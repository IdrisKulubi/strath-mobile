# Phase 10 — Mobile UI: respond to reschedule

**Status:** ✅ Done  
**Depends on:** Phases 8, 9  
**User-visible:** Yes

## Goal

When the partner has proposed a new slot, show a clear **respond** modal:
Accept, or Decline with reason + counter slot.

## New component

`components/dates/reschedule-respond-modal.tsx`

Can be opened from:

- `app/(tabs)/index.tsx` when home hold has `reschedule.pending.isYourTurnToRespond`
- `app/(tabs)/dates.tsx` via `action-required-banner.tsx` or auto on focus
- Push notification handler (phase 11)

## Modal content

**Header:** `{partnerName} wants to change your date`

**Body:**

- Proposed: **Saturday, 13 Jun at 15:00** (large)
- Confirm by: **13 Jun at 09:00** (small grey)
- Venue copy: reuse `MEETUP_WINDOWS_COPY` from `lib/meetup-slot.ts`
- If `lastDeclineReason`: show in a quote block — *"They said: …"*

**Actions:**

1. **Accept new time** — primary pink button → `useRespondReschedule({ action: 'accept' })`
2. **Suggest a different time** — secondary → opens same slot picker as phase 9, plus
   **reason** text field (required, min 3 chars) → decline with counter

**Counter cap state:**

When `counterCount >= 3`, hide "Suggest a different time"; show copy:

> You've gone back and forth a few times. Accept this time or cancel the match.

Link **Cancel this match** → existing `useCancelMatchHold`.

## Decline + counter sub-flow

```txt
Tap "Suggest a different time"
  → TextInput: "Why doesn't this work?" (required)
  → Slot picker (same as request)
  → Submit → declineWithCounter API
```

## Steps

1. Build modal; props: `visible`, `pending`, `partnerName`, `onClose`, `mutualMatchId`.
2. Wire Accept mutation → on success close modal + toast "Date updated".
3. Wire decline path with validation (reason + slot).
4. Add banner on Dates tab: **"Respond to date change request"** when
   `isYourTurnToRespond` (extend `action-required-banner.tsx`).
5. Do not block entire app — user can dismiss modal but banner remains.

## How to test

1. A requests → B opens app → modal auto-shows (or banner tap).
2. B accepts → both see new time on confirm card / dates list; chat unlock rules unchanged.
3. B declines + counter → A sees respond modal with A's turn.
4. After 3 counters → only Accept + Cancel match shown.
5. Run accept twice (idempotent) — no double finalize error.

## Done when

- [ ] Respond modal complete for accept + counter.
- [ ] Banner entry on Dates + Home when pending.
- [ ] Cap UI enforced.
- [ ] E2E with two accounts green.

## Rollback

Feature-flag modal `visible={false}` via missing `pending` data.
