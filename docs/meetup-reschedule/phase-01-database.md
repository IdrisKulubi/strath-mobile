# Phase 1 — Database schema

**Status:** ✅ Done  
**Depends on:** nothing  
**User-visible:** No (foundation only)

## Goal

Add tables/columns to store reschedule requests, link one pending request per
mutual match, and keep an audit trail of propose / accept / decline / counter.

## Files to edit / create

- Edit `backend/strath-backend/src/db/schema.ts`
- New migration `backend/strath-backend/drizzle/0026_meetup_reschedule.sql` (number may shift)

## Steps

1. **Create `meetup_reschedule_requests` table** in `schema.ts`:

   | Column | Type | Notes |
   |--------|------|--------|
   | `id` | uuid PK | |
   | `mutual_match_id` | uuid FK → `mutual_matches.id` | cascade on delete |
   | `requested_by_user_id` | text FK → `user.id` | who proposed |
   | `proposed_slot` | text | `'wednesday' \| 'saturday'` |
   | `proposed_scheduled_at` | timestamp | must be a valid upcoming slot instant |
   | `proposed_confirm_by` | timestamp | derived at write time (6h before meetup) |
   | `status` | text | `'pending' \| 'accepted' \| 'declined' \| 'superseded' \| 'cancelled'` |
   | `decline_reason` | text nullable | set when status becomes `declined` before supersede, or store on the *counter* row as metadata — pick one convention and stick to it |
   | `counter_of_request_id` | uuid nullable FK self | links counter to previous request |
   | `chain_root_id` | uuid nullable | optional: same for whole negotiation chain (easier cap counting) |
   | `responded_at` | timestamp nullable | |
   | `created_at` | timestamp | default now |

   Indexes:
   - `(mutual_match_id, status)` where you query pending often
   - `(mutual_match_id, created_at)` for history

2. **Extend `mutual_matches`**:

   ```ts
   pendingRescheduleRequestId: uuid("pending_reschedule_request_id")
       .references(() => meetupRescheduleRequests.id, { onDelete: "set null" }),
   reschedulePausedExpiryAt: timestamp("reschedule_paused_expiry_at"), // optional: when pause started
   ```

   > `pending_reschedule_request_id` is the fast pointer for "someone needs to respond."
   > Clear it when request is accepted, cancelled, or match is cancelled.

3. **Optional kill switch** (recommended if you want safe rollout):

   Add `reschedule_enabled` to `APP_FEATURE_KEYS` in `feature-flags.ts`, default `false`.
   Skip if you prefer shipping without a flag.

4. **Generate and apply migration**:

   ```bash
   cd strath-mobile/backend/strath-backend
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

5. **Export types** from schema if you use `$type<>` unions — mirror in a small
   `meetup-reschedule-types.ts` later (phase 3).

## SQL reference (if hand-writing migration)

```sql
CREATE TABLE meetup_reschedule_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mutual_match_id uuid NOT NULL REFERENCES mutual_matches(id) ON DELETE CASCADE,
  requested_by_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  proposed_slot text NOT NULL,
  proposed_scheduled_at timestamp NOT NULL,
  proposed_confirm_by timestamp NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decline_reason text,
  counter_of_request_id uuid REFERENCES meetup_reschedule_requests(id) ON DELETE SET NULL,
  chain_root_id uuid,
  responded_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE mutual_matches
  ADD COLUMN pending_reschedule_request_id uuid
    REFERENCES meetup_reschedule_requests(id) ON DELETE SET NULL;
```

## How to test

1. Migration applies with exit code 0.
2. In Neon/SQL console:

   ```sql
   \d meetup_reschedule_requests
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'mutual_matches' AND column_name = 'pending_reschedule_request_id';
   ```

3. Backend starts (`npm run dev`) with no runtime errors from schema imports.
4. Existing confirm-slot flow still works (no code reads new columns yet).

## Done when

- [x] Table + FK + indexes exist (`0026_meetup_reschedule.sql`).
- [x] `mutual_matches.pending_reschedule_request_id` and `reschedule_paused_expiry_at` exist.
- [x] `reschedule_enabled` in `APP_FEATURE_KEYS`; types in `src/lib/meetup-reschedule/types.ts`.
- [x] No behavior change in production until phase 3+.

## Rollback

Drop `meetup_reschedule_requests`, drop column on `mutual_matches`. Safe if no rows yet.
