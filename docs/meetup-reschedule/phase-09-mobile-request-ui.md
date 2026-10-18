# Phase 9 — Mobile UI: request date change

**Status:** ✅ Done  
**Depends on:** Phase 8  
**User-visible:** Yes

## Goal

Add **"Request date change"** to the confirm-date surfaces. If the user has not
confirmed yet, show **confirm first** then open the slot picker.

## Screens / components to touch

| Location | File |
|----------|------|
| Inline confirm card | `components/dates/meetup-slot-confirm.tsx` |
| Full-screen modal | `components/dates/meetup-slot-confirm-modal.tsx` |
| Chat gate | `components/chat/chat-access-gate.tsx` (if embeds confirm card) |
| Dates match card | `components/dates/confirmed-match-card.tsx` |
| Home hold | `components/home/date-hold-card.tsx` (optional secondary entry) |

## New components

| File | Role |
|------|------|
| `components/dates/reschedule-slot-picker-sheet.tsx` | Bottom sheet: list of slot options from API |
| `components/dates/reschedule-confirm-first-alert.tsx` | Alert when `blockReason === 'confirm_first'` |

## UX flow

```txt
Tap "Request date change"
  → if !viewerSlotConfirmed: Alert "Confirm your date first" [Confirm] [Not now]
       → Confirm runs existing confirm mutation, then opens picker on success
  → if pending_exists (you sent): toast "Waiting for {partner} to respond"
  → else: open RescheduleSlotPickerSheet
       → user taps a slot row → Confirm sheet "Move your date to {label}?"
       → Submit → loading → success toast → close sheet
```

## UI placement (from your mockups)

Inside the dark date card, **below** the pink **"Confirm date"** link/button:

- Secondary text button: **Request date change** (pink outline or muted text link).

On the full **Confirm your date** modal, below solid **Confirm date**:

- Same secondary action before **Cancel this match**.

## Steps

1. Add button visible when `reschedule?.canRequest === true`.
2. Hide when `reschedule?.pending` exists and user is requester (waiting).
3. Implement picker sheet using `useRescheduleOptions` + `useRequestReschedule`.
4. Handle `payment_required` same as confirm (open pay flow first if needed).
5. Match existing theme (pink accent, dark card) per `meetup-slot-confirm.tsx`.

## Copy

| Element | Text |
|---------|------|
| Button | Request date change |
| Confirm-first alert title | Confirm your date first |
| Confirm-first body | Confirm your assigned meetup before you can request a different time. |
| Picker title | Choose a new time |
| Picker subtitle | StrathSpace dates are Wednesdays 5:30 PM and Saturdays 3:00 PM at Landmark Bistro Westlands. |
| Submit confirm | Request change |

## How to test

1. User A: mutual match, not confirmed → tap Request → see confirm-first → confirm → picker opens.
2. Pick slot → B gets push (phase 6) and pending on B's dates list (phase 5).
3. User A while pending: button shows waiting state, not picker.
4. Chat gate screen: same button behavior.

## Done when

- [ ] Button on confirm card + modal.
- [ ] Confirm-first gating works.
- [ ] Successful request updates UI via query invalidation.
- [ ] Matches design language of existing date cards.

## Rollback

Hide button with `reschedule?.canRequest === false` until backend ready.
