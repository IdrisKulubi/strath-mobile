# Trustless Daily Discovery Update Summary

Analysis window: May 10, 2026 to May 12, 2026, Africa/Nairobi time.

## Executive Summary

The new daily-shortlist discovery system is now behaving much closer to the Trustless product direction: users are mostly seeing a constrained set of daily recommendations, one-sided interest is being stored in `user_match_interests`, and recommendation actions are no longer creating one-sided `candidate_pairs`.

The main positive change is that the app now has real directed-interest data. Since the update, users created 67 current `open_to_meet` interest rows, 14 `maybe` rows, and 50 `passed` rows. This means tomorrow's ranking can learn from actual choices instead of relying only on profile compatibility.

The main issue still visible in the data is shortlist stability. Most users are capped correctly, but a few viewers still received more than five distinct daily recommendations after reloads or repeated fetches. This is much better than the first test day, but it needs one more backend guard so the daily five is truly locked per user per day.

## Current Pool Health

- Total profiles: 278
- Admin profiles: 3
- Completed profiles: 278
- Hidden profiles: 87
- Discovery-paused profiles: 87
- Incognito profiles: 0
- Admin Match Preview feature flag: disabled
- Signup cap feature flag: enabled

The available pool is smaller than total profiles because hidden and paused users are correctly removed from normal discovery. Admin preview is currently off, so admin accounts should not be participating unless the flag is manually enabled.

## Recommendation Activity

### May 10

This was still a messy rollout/test day.

- Browse was still used once:
  - 54 browse `shown` events
  - 29 candidates exposed to one viewer
- Daily recommendations were unstable:
  - 75 daily `shown` events
  - 1 viewer
  - 25 distinct candidates
  - This violated the daily-five principle.
- 11 `open_to_meet` decisions were logged.
- 5 recommendation-created candidate pairs were created.

Interpretation: this reflects the old behavior before the asymmetric discovery correction fully settled.

### May 11

This is where the new daily-shortlist behavior started working.

- 25 viewers received daily recommendations.
- 150 daily `shown` events.
- Median shortlist size was 5.
- 20 of the 25 viewers stayed within the intended five-card shape.
- 5 viewers saw 10 distinct candidates, so reload/fetch instability was still present for some users.
- 99 recommendation decisions were made:
  - 45 Interested
  - 14 Maybe
  - 40 Pass
- Decision rate: 66.0%
- Interested share of decisions: 45.5%

Interpretation: engagement was strong, but the daily-five lock was not fully strict yet for every viewer.

### May 12

The system is improved, but not perfect.

- 14 viewers received daily recommendations.
- 85 daily `shown` events.
- 12 of the 14 viewers appear to be within the intended shape.
- 2 viewers still exceeded five:
  - one saw 14 distinct candidates
  - one saw 10 distinct candidates
- 27 recommendation decisions were made:
  - 17 Interested
  - 0 Maybe
  - 10 Pass
- Decision rate so far: 31.8%
- Interested share of decisions: 63.0%

Interpretation: the product is moving in the right direction, but a hard persisted daily-shortlist table or stricter reuse logic is still needed.

## Match-Type Performance

Across the window:

- Similarity:
  - 401 events
  - 35 Interested
  - 7 Maybe
  - 26 Pass
  - average score 72.4
- Discovery:
  - 249 events
  - 24 Interested
  - 5 Maybe
  - 22 Pass
  - average score 76.2
- Complementary:
  - 128 events
  - 11 Interested
  - 0 Maybe
  - 0 Pass
  - average score 65.6
- High activity:
  - 44 events
  - 3 Interested
  - 2 Maybe
  - 2 Pass
  - average score 81.4

The scoring mix is not obviously broken. `discovery` is producing meaningful interest, and `similarity` is doing the most volume. The interesting signal is that `complementary` has interest but very few negative decisions recorded, which could mean users are not seeing enough of those cards, or they are not acting on them as often.

## Directed Interest And Matching

The asymmetric model is now visible in the data.

- Current open-interest rows: 67
- Unmatched open-interest rows: 62
- Reciprocal open dyads: 0
- Reciprocal dyads linked to a pair: 0
- Mutual matches since the update: 0

This is expected early on if people are mostly making one-way decisions and the reverse side has not yet been shown or has not responded.

The important win: after May 10, recommendation decisions stopped creating candidate pairs. Recommendation-created pairs only appeared on May 10, with 5 pairs. There were no recommendation-created pairs on May 11 or May 12.

That means the new rule is working: one-sided interest is training data, not a hold.

## Candidate Pair Activity

Candidate pairs are still being created by legacy/manual flows, but the volume dropped sharply:

- May 10:
  - 107 active
  - 67 queued
  - 16 closed
  - 1 expired
- May 11:
  - 15 active
  - 6 queued
  - 5 closed
  - 1 expired
- May 12:
  - 3 active

This suggests the old pair-generation behavior has mostly been reduced, but not fully gone. Some legacy routes or daily-match endpoints may still generate pairs, especially when `/api/home/daily-matches` is hit.

## What Changed

1. Browse exposure has effectively stopped after the early test day.
2. Daily recommendations are now the main discovery surface.
3. Most users now receive five recommendations, not an endless catalog.
4. Decisions persist as directed interests.
5. One-sided interest no longer creates candidate pairs after the asymmetric update.
6. Candidate-pair creation is trending down, but legacy flows still exist.
7. No reciprocal matches have happened yet, mostly because reverse-interest loops need time and stronger prioritization.

## Main Risks

### 1. Daily-five stability is not fully locked

Some viewers still receive more than five distinct candidates in one day. This breaks the Trustless promise.

Likely causes:

- Recommendation events are append-only, but there is no authoritative `daily_shortlists` table.
- Reloads may re-rank and produce a different candidate set.
- The same day boundary may be inconsistent between UTC and Africa/Nairobi.
- Some users may have generated recommendations before and after a code change on the same local day.

### 2. Reverse-interest acceleration is not visible yet

There are many one-sided open interests, but zero reciprocal dyads. If A likes B, B should see A soon. That prioritization may be present in code, but it has not yet produced reciprocal outcomes in the data.

### 3. Legacy candidate-pair generation still exists

The old candidate-pair flow is quieter, but not completely removed. It can still confuse the product model if users are receiving both legacy pairs and daily recommendations.

## Next Proposal

### Priority 1: Persist the daily five

Add a real `daily_shortlists` table:

- `viewer_user_id`
- `shortlist_date`
- `candidate_user_id`
- `rank`
- `match_type`
- `final_score`
- `reason`
- `created_at`

Unique constraints:

- one row per viewer/date/rank
- one row per viewer/date/candidate

Then `/api/recommendations/daily` should:

1. Check whether today's shortlist already exists.
2. If it exists, return it exactly.
3. If it does not exist, generate exactly up to five, persist them, then return them.
4. Never create more than five for the same viewer and day.

This is the cleanest fix for reload instability.

### Priority 2: Hard-prioritize incoming interest

When B has not yet decided on A, and A already chose `open_to_meet` for B, A should be strongly eligible for B's next daily five.

Ranking rule:

- incoming open interest should usually land in the top five unless blocked, passed, hidden, paused, or gender-incompatible.
- do not show it as "someone liked you" in the UI.
- use normal friendly copy like "Strong match for today."

This should increase reciprocal decisions and speed up match creation.

### Priority 3: Freeze legacy pair generation for consumer discovery

Keep old candidate-pair logic for admin/manual/regression paths, but stop generating new consumer candidate pairs from Home unless the flow is explicitly legacy.

The new flow should be:

- daily shortlist shown
- directed interest saved
- pair created only when reciprocal interest exists
- mutual match lifecycle starts only after reciprocity

### Priority 4: Add a daily discovery health panel

Add an admin dashboard panel with:

- users who got 0, 1-4, exactly 5, and over 5 recommendations today
- decision rate
- interested/pass/maybe split
- unmatched open interests
- incoming-interest candidates waiting to be shown
- reciprocal matches created

This would make it much easier to see whether the algorithm is behaving without pulling SQL each time.

## Bottom Line

The update is working in the important ways: Trustless is no longer acting like a browse app, decisions are being saved correctly, and one-sided interest no longer creates holds. The biggest remaining fix is to persist the exact daily five so reloads cannot change the shortlist. After that, the next unlock is showing reverse-interest candidates quickly so one-sided interest turns into real matches faster.
