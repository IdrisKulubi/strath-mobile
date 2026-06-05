# Phase 4 — HTTP API routes

**Status:** ✅ Done  
**Depends on:** Phase 3  
**User-visible:** Yes (via API clients / curl)

## Goal

Expose reschedule operations under `/api/me/match-hold/reschedule/*` mirroring
existing `confirm-slot` and `cancel` routes.

## Files to create

```
backend/strath-backend/src/app/api/me/match-hold/reschedule/
  options/route.ts      GET or POST
  request/route.ts      POST
  respond/route.ts      POST
  cancel/route.ts       POST  (optional — cancel own pending request)
```

## API contract

### `GET /api/me/match-hold/reschedule/options?mutualMatchId=...`

**Auth:** session required.

**Response:**

```json
{
  "options": [
    {
      "slot": "saturday",
      "scheduledAt": "2026-06-13T12:00:00.000Z",
      "confirmBy": "2026-06-13T06:00:00.000Z",
      "label": "Saturday, 13 Jun at 15:00"
    }
  ],
  "currentScheduledAt": "2026-06-06T12:00:00.000Z"
}
```

Server may include `label` using same formatting as mobile `formatMeetupSlot`, or
let mobile format ISO strings.

### `POST /api/me/match-hold/reschedule/request`

**Body:**

```json
{ "mutualMatchId": "uuid", "proposedScheduledAt": "ISO-8601" }
```

**Success:** `{ "requestId", "status": "pending", ... }`  
**Errors:** 400 with `{ "reason": "confirm_first" | ... }`

### `POST /api/me/match-hold/reschedule/respond`

**Body:**

```json
{
  "requestId": "uuid",
  "action": "accept" | "decline",
  "declineReason": "optional when decline",
  "counterScheduledAt": "ISO when decline"
}
```

**Success accept:** `{ "status": "applied", "scheduledAt", "mutualStatus": "upcoming" }`  
**Success decline:** `{ "status": "pending", "requestId": "new-counter-id" }`  
**Errors:** `counter_cap_reached`, `not_your_turn`, etc.

### `POST /api/me/match-hold/reschedule/cancel` (optional)

**Body:** `{ "requestId": "uuid" }` — only requester can cancel pending.

## Steps

1. Implement routes with `getSessionWithFallback`, `successResponse`, `errorResponse`.
2. Map service errors → HTTP status (400 user error, 403 wrong user, 404).
3. If `reschedule_enabled` flag exists, return 404 or 403 when off.
4. Add Zod or existing validation pattern used by `confirm-slot/route.ts`.

## How to test

With two user tokens (A and B) and a mutual match id:

```bash
# Options
curl -H "Authorization: Bearer $TOKEN_A" \
  "$API/api/me/match-hold/reschedule/options?mutualMatchId=$MM_ID"

# Request (after A confirmed)
curl -X POST -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" \
  -d '{"mutualMatchId":"...","proposedScheduledAt":"..."}' \
  "$API/api/me/match-hold/reschedule/request"

# Accept (B)
curl -X POST -H "Authorization: Bearer $TOKEN_B" ... \
  -d '{"requestId":"...","action":"accept"}' \
  "$API/api/me/match-hold/reschedule/respond"
```

Repeat decline/counter path; verify DB `scheduled_at` only changes on accept.

## Done when

- [x] All routes return correct shapes.
- [x] Zod validation + `route-helpers` error mapping.
- [x] Wrong user gets `not_your_turn` on respond (service layer).

## Rollback

Remove route folders; service remains unused.
