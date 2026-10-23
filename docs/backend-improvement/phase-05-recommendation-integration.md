# Phase 05: Recommendation Integration

## Objective

Use profile intelligence in daily recommendations while preserving existing hard filters and daily shortlist stability.

## Status

Implemented in this workspace.

## Implemented

- Added a modular final recommendation scoring service.
- Integrated profile intelligence signals into ranking: activity, response, profile completeness, candidate strength, reciprocal interest, and photo presentation.
- Kept existing hard filters and stable daily shortlist persistence intact.
- Updated daily shortlist mix to prioritize incoming interest, active high-probability candidates, complementary discovery, and strong underexposed profiles.
- Added focused tests for profile-intelligence scoring contribution, incoming interest boost, first-session weighting, and daily mix ordering.

## Scope

- Read `profile_intelligence` during candidate ranking.
- Add candidate strength and activity to final scoring.
- Add photo presentation and viewer visual preference as bounded signals.
- Prioritize incoming reciprocal interest.
- Keep daily shortlist persistence authoritative.

## Final Score Proposal

```txt
final_candidate_score =
  25% compatibility_score
+ 25% activity_score
+ 15% response_score
+ 10% reciprocal_interest_score
+ 10% profile_completeness_score
+ 10% candidate_strength_score
+ 5% viewer_visual_preference_fit
- penalties
```

For first-session users:

```txt
final_candidate_score =
  35% activity_score
+ 20% response_score
+ 15% compatibility_score
+ 15% reciprocal_interest_score
+ 10% profile_completeness_score
+ 5% candidate_strength_score
- penalties
```

## Daily Shortlist Composition

The daily shortlist should include:

- 1 to 2 high-probability active candidates
- incoming interest candidates where eligible
- 1 complementary or different candidate
- 1 underexposed high-quality candidate when available

## Files To Touch

- `backend/strath-backend/src/lib/services/match-intelligence-service.ts`
- `backend/strath-backend/src/lib/services/match-ranking.ts`
- `backend/strath-backend/src/lib/matching/candidate-pool-policy.ts`
- relevant tests around ranking and daily shortlists

## Acceptance Criteria

- Existing filters still apply.
- Existing daily shortlist table still locks the day.
- Active and responsive candidates rank higher.
- Incoming-interest candidates are strongly prioritized when eligible.
- Recommendation response includes safe reason labels only.

## Tests

- Ranking test for active vs dormant candidates.
- Ranking test for incoming interest boost.
- Ranking test that passed candidates are excluded.
- Daily shortlist reuse test.

## Manual Verification

Seed a viewer with one incoming interest and several normal candidates. The incoming-interest candidate should appear in the daily shortlist unless blocked or incompatible.

## Rollback

Feature flag the profile-intelligence score contribution and return to the previous formula.
