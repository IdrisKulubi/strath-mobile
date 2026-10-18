# Phase 7: Admin QA And Rollout

## Goal

Ship the new homepage safely and tune it using real behavior.

## Scope

- Add QA checklist for matchmaker UI.
- Compare matchmaker funnel metrics against old homepage behavior.
- Use admin analytics to watch repeat rate, Interested rate, Pass rate, quota reached, and LLM fallback.
- Roll out gradually if needed.

## QA Checklist

- New user with no matchmaker session.
- Returning user with active session.
- User with quota remaining.
- User with quota reached.
- User with no candidates.
- User with feedback memory.
- User with network/API failure.
- Matchmaker profile Interested.
- Matchmaker profile Pass.
- Mutual match creation from matchmaker source.

## Rollout Metrics

- Session start rate.
- Intent submitted rate.
- Candidate shown rate.
- Profile opened rate.
- Interested rate.
- Pass rate.
- Repeat candidate rate.
- Feedback reason rate.
- Mutual creation rate.
- Quota reached rate.

## Acceptance Criteria

- Admin can monitor matchmaker quality.
- No increase in support issues from homepage confusion.
- Repeat candidate rate remains acceptable.
- Interested rate improves or matches old discovery.
- Users can still recover when the matchmaker cannot find someone.

## Implementation Notes

- Added a Phase 7 rollout readiness panel to the admin Profile Intelligence page.
- The panel uses existing matchmaker quality metrics instead of creating a second analytics path.
- Readiness checks now cover candidate variety, decision quality, LLM stability, and quota pressure.
- Manual QA cases are visible in admin so rollout testing follows the same checklist each time.
- Widening watch items are visible beside the checklist: repeat rate, fallback rate, Interested baseline, quota pressure, and support confusion.
