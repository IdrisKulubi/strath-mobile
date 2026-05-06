# Manual Matching

This document explains how the admin manual matching flow works in the StrathSpace backend.

## Where It Lives

- Admin page: `src/app/admin/matchmaking/page.tsx`
- Main admin UI: `src/app/admin/matchmaking/_manual-matchmaking-board.tsx`
- Server actions: `src/lib/actions/manual-matchmaking.ts`
- Candidate pair logic: `src/lib/services/candidate-pairs-service.ts`
- Compatibility scoring: `src/lib/services/compatibility-service.ts`
- Match activity page: `src/app/admin/date-requests/page.tsx`
- Admin activity data/actions: `src/lib/actions/admin.ts`

## Main Tables

### `user`

Stores the auth/account row: name, email, phone, role, deleted/suspended state, push token, and last active timestamp.

### `profiles`

Stores the dating profile: first/last name, photos, gender, age, course, university, visibility, discovery pause, waitlist status, and face verification state.

Manual matching depends heavily on these fields:

- `profile_completed` or `is_complete`
- `is_visible`
- `discovery_paused`
- `face_verification_status`
- `face_verified_at`
- `waitlist_status`
- `photos`
- `gender`

### `candidate_pairs`

This is the main table for suggested matches.

Important fields:

- `user_a_id` and `user_b_id`: the two users in canonical sorted order.
- `a_decision` and `b_decision`: each side's response.
- `status`: `active`, `queued`, `mutual`, `closed`, or `expired`.
- `compatibility_score`: numeric score from compatibility logic.
- `match_reasons`: the reasons shown in admin/user UI.
- `expires_at`: when normal generated pairs expire.

### `candidate_pair_history`

Audit/event history for candidate pairs.

Manual matching writes history entries with `metadata.source = "admin_curated"`.

The Match Activity page archive/delete button writes an archive marker with:

```json
{
  "source": "admin_activity_archive"
}
```

That marker hides the pair from `/admin/date-requests`, but does not delete the real candidate pair or audit history.

### `mutual_matches`

Created when both users respond `open_to_meet`. This table is used to hold users out of new matching while the admin call/date setup is in progress.

Statuses include:

- `mutual`
- `call_pending`
- `being_arranged`
- `upcoming`
- `completed`
- `cancelled`
- `expired`

## Who Appears In Manual Matching

The admin pool comes from `getManualMatchmakingPool()`, which calls `getPoolData()`.

A user must have:


- a `user` row that is not soft-deleted (`deleted_at` is null)
- a joined `profiles` row

Each user gets an `activeState`:

- `available`: profile is complete and they are not busy
- `active_pair`: currently has an active or queued candidate pair
- `mutual_hold`: currently in a mutual/call/date hold
- `unavailable`: profile incomplete

Manual matching labels an unavailable profile as `Incomplete profile`.

## Matchable Rules

For manual pair creation, both selected people must pass:

- `profileComplete === true`, where `profileComplete` means `profile_completed || is_complete`

Manual admin matching intentionally allows profiles with discovery paused or visibility off. Those users may be hidden from normal discovery, but an admin can still curate a manual pair for them.

If this fails, the server throws a specific error, for example:

```text
Mercy Mutea cannot be matched because profile is incomplete
```

The suggestions list also checks whether a candidate is ready for the manual launch pool:

```ts
waitlistStatus === "admitted" || faceVerificationStatus === "verified" || Boolean(faceVerifiedAt)
```

Gender filtering is opposite-side by default:

- selected female -> male candidates
- selected male -> female candidates
- unknown/other -> does not force the male/female filter

## Suggestions

When an admin selects a user, `getManualMatchSuggestions(userId)`:

1. Loads the full pool.
2. Filters out the selected user.
3. Keeps candidates that are admitted or face verified.
4. Keeps candidates on the opposite gender side.
5. Computes compatibility for each candidate.
6. Adds warnings:
   - already has active card
   - already matched/on hold
   - no push token
7. Sorts by compatibility score descending.
8. Returns the top 30.

Compatibility is computed by `computeCompatibility()`, which loads both profiles and calls the shared `scoreProfilePair()` ranking engine.

## Creating A Manual Match

`createManualCandidatePair(userAId, userBId)` does the work.

Flow:

1. Requires admin auth.
2. Rejects missing IDs or same user.
3. Loads both people from the manual pool.
4. Rejects incomplete/hidden profiles.
5. Canonicalizes the pair order with `canonicalizePairUsers()`.
6. Computes compatibility.
7. Checks for an existing active/queued/mutual pair between the same two users.
8. If one exists, it closes the old one and writes history.
9. Inserts a new `candidate_pairs` row:
   - `status = "active"`
   - `a_decision = "pending"`
   - `b_decision = "pending"`
   - `expires_at = 2099-12-31T23:59:59.000Z`
10. Writes a `candidate_pair_history` row:
   - `event_type = "generated"`
   - `metadata.source = "admin_curated"`
11. Sends push notifications to both users if they have push tokens.
12. Revalidates `/admin/matchmaking`.

Manual curated pairs use the far-future expiry constant:

```ts
MANUAL_CURATED_PAIR_EXPIRES_AT = new Date("2099-12-31T23:59:59.000Z")
```

This prevents normal expiry cleanup from treating manual admin matches like short-lived daily generated pairs.

## User Decisions

Candidate pair decisions are:

- `pending`
- `open_to_meet`
- `maybe`
- `passed`

Pair status is resolved like this:

- either user `passed` -> `closed`
- either user `maybe` -> `expired`
- both users `open_to_meet` -> `mutual`
- otherwise -> `active`

When both users are interested, the pair becomes a mutual match and users are held out of future matching until that mutual flow is resolved.

## Sent Matches And Calls

`getManualMatchmakingActivity()` powers the "Sent matches and calls" panel on `/admin/matchmaking`.

It only shows admin curated pairs:

```ts
candidate_pair_history.event_type = "generated"
metadata.source = "admin_curated"
```

It only includes pair statuses:

- `active`
- `queued`
- `mutual`

Closed and expired pairs disappear from the Sent panel.

Admins can:

- mark call accepted
- mark call rejected
- delete/remove the item from the Sent panel

Call accepted:

- If the linked mutual match is `mutual`, it becomes `call_pending`.
- A history event is written with `metadata.callOutcome = "accepted"`.

Call rejected:

- Calls `cancelManualCandidatePair()`.
- The candidate pair is closed if active/queued.
- The linked mutual match is cancelled.
- Any linked date match is cancelled.

## Match Activity Page

The Match Activity page is `/admin/date-requests`.

It combines:

- candidate pair decisions
- mutual matches
- legacy date requests

Rows show:

- actor
- target
- activity label
- pair status
- details
- timestamp
- action

Candidate pair activity rows now have a **Delete** button.

The Delete button calls `archiveAdminMatchActivity(pairId)`.

That action:

1. Requires admin auth.
2. Confirms the candidate pair exists.
3. Inserts a `candidate_pair_history` row with `metadata.source = "admin_activity_archive"`.
4. Revalidates `/admin/date-requests`.

`getAdminDateRequests()` excludes candidate pairs and mutual matches whose pair ID has that archive marker.

This means "Delete" on Match Activity is an archive/hide-from-this-page action. It does not physically delete the `candidate_pairs`, `mutual_matches`, or history rows.

## Cancelling A Manual Pair

`cancelManualCandidatePair(pairId, reason)`:

1. Requires admin auth.
2. Finds the pair.
3. If pair is `active` or `queued`, sets it to `closed`.
4. Writes a `candidate_pair_history` entry with `event_type = "closed"`.
5. If a linked mutual match exists, sets it to `cancelled`.
6. If that mutual match has a linked date match, sets the date match to `cancelled`.
7. Revalidates `/admin/matchmaking`.

## Match Holds

Once a mutual match exists, the hold system prevents users from continuing to receive new intros while the match is being worked.

Hold statuses:

- `mutual`
- `call_pending`
- `being_arranged`
- `upcoming`
- `completed_pending_feedback`

Released statuses:

- `cancelled`
- `expired`
- `completed` after feedback is submitted or the feedback grace window passes

## Admin Notes

- "Active" in admin user lists means the account recently used the app. It does not guarantee they are matchable.
- A user can be complete and verified with `is_visible = false` or `discovery_paused = true`; manual admin matching still allows them.
- Manual match creation is intentionally auditable through `candidate_pair_history`.
- The Match Activity Delete button archives a row from the activity page; it is not a hard database delete.
