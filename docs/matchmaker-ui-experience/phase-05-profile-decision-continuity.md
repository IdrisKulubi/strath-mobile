# Phase 5: Profile Decision Continuity

## Goal

Make the transition from matchmaker suggestion to profile decision feel seamless.

## Scope

- Ensure matchmaker-sourced profile opens with `source=matchmaker`.
- Ensure Interested and Pass are enabled for matchmaker candidates.
- After a decision, return the user to the matchmaker with useful context.
- Show a short confirmation in the matchmaker timeline.

## Desired Flow

1. Matchmaker suggests a candidate.
2. User opens profile.
3. User taps Interested or Pass.
4. Decision is saved through recommendation decision APIs.
5. User returns to Home.
6. Matchmaker acknowledges and offers next action.

## UX Requirements

- Do not show `Not in today's curated set` for matchmaker candidates.
- Decision feedback should be immediate.
- Mutual match path should still point users to Dates/Messages.
- Pass should offer optional feedback but never force it.

## Acceptance Criteria

- Interested works on matchmaker profiles.
- Pass works on matchmaker profiles.
- Profile view logs `matchmaker_profile_opened`.
- Decision logs `matchmaker_interested` or `matchmaker_pass`.

## Implementation Notes

- Profile view already logs `matchmaker_profile_opened` through the recommendation event endpoint when `source=matchmaker`.
- Matchmaker profile decisions now call the recommendation decision API and then update the matchmaker conversation via `/api/matchmaker/session/feedback`.
- `Interested` records an `interested` feedback outcome so the matchmaker can acknowledge and learn from the fit.
- `Pass` records a `passed` feedback outcome without forcing the user to explain why.
- Closing the decision sheet for a matchmaker profile returns the user to Home, where the matchmaker conversation cache has the updated acknowledgement.
- Added a quiet matchmaker-origin note above the profile CTA so users know the decision feeds the next search.
