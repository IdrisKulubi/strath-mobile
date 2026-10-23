# Phase 2 — Upcoming slot options helper

**Status:** ✅ Done  
**Depends on:** Phase 1 (optional — pure functions can ship before DB)  
**User-visible:** No (backend utility)

## Goal

Expose a deterministic list of **valid alternative slots** the UI can show when
rescheduling: upcoming Wednesdays and Saturdays with correct `scheduledAt` and
`confirmBy`, excluding the match's current slot and any slot whose confirm
deadline has already passed.

## Files to edit / create

- Edit `backend/strath-backend/src/lib/services/meetup-slot-service.ts` **or**
- New `backend/strath-backend/src/lib/services/meetup-reschedule-slots.ts`

Prefer extending `meetup-slot-service.ts` if functions stay pure and testable.

## Steps

1. **Add `listUpcomingMeetupSlotOptions`:**

   ```ts
   export type MeetupSlotOption = {
     slot: MeetupSlotKind;           // 'wednesday' | 'saturday'
     scheduledAt: Date;
     confirmBy: Date;
   };

   export function listUpcomingMeetupSlotOptions(
     now: Date,
     options?: {
       count?: number;              // default 4
       excludeScheduledAt?: Date;     // current assignment — don't offer same slot
     },
   ): MeetupSlotOption[]
   ```

2. **Algorithm (document in code comment):**

   - Start from `now` in Africa/Nairobi.
   - Walk forward occurrence-by-occurrence using existing
     `getNextMeetupOccurrence(slot, from, config)`.
   - Alternate or enumerate: next Wed, next Sat, then the one after, etc., until
     `count` options collected.
   - Skip any option where `confirmBy <= now` (window already closed).
   - Skip if `scheduledAt` equals `excludeScheduledAt` (same instant as current).
   - Do **not** skip slots only because they're "sooner" than current — user may
     want a later slot; only skip invalid/closed/current.

3. **Unit tests** in `meetup-slot-service.test.ts` (or new test file):

   - Fixed `now` → expect exact Nairobi timestamps for next 4 slots.
   - `excludeScheduledAt` removes current from list.
   - Past `confirmBy` slots never returned.

4. **No HTTP yet** — phase 4 will expose this via API.

## How to test

1. Run unit tests:

   ```bash
   cd strath-mobile/backend/strath-backend
   npm test -- meetup-slot
   ```

2. Temporary script or `tsx` one-liner:

   ```ts
   import { listUpcomingMeetupSlotOptions } from "@/lib/services/meetup-slot-service";
   console.log(listUpcomingMeetupSlotOptions(new Date(), { count: 4 }));
   ```

   Verify Wed 17:30 / Sat 15:00 EAT and sensible `confirmBy` (6h before).

## Done when

- [x] Function returns 4 valid options for a normal `now`.
- [x] Current slot excluded when passed `excludeScheduledAt`.
- [x] Tests green.

## Rollback

Remove new export; no DB impact.
