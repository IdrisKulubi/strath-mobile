# Phase 4: States And Limits

## Goal

Make loading, quota, no-result, error, and offline states feel calm and helpful.

## Scope

- Improve loading skeletons.
- Add no-result recovery.
- Add quota reached experience.
- Add network/API failure recovery.
- Add disabled states that explain themselves.

## Quota State

When daily search quota is reached, show:

```txt
I do not want to keep showing weaker matches today. I have saved what I learned, and tomorrow I can search again with that in mind.
```

Offer:

- Help me describe what I want
- Give me a date idea
- Improve my profile
- Save this for tomorrow

## No Result State

If no candidate is found:

- explain that the current request is narrow,
- offer one-tap broadening,
- preserve the user's original intent.

## Error State

If backend fails:

- keep existing messages visible,
- show retry inline,
- do not clear the composer,
- do not send users to a blank screen.

## Acceptance Criteria

- No blank Home screen.
- Quota reached still leaves useful actions.
- Retry works without restarting the app.
- Loading state does not cause layout jump.

## Implementation Notes

- Added `MatchmakerStatePanel` for loading, initial error, inline error, quota, and no-result recovery.
- Replaced the blank initial loading card with a stable skeleton-style panel.
- Kept previous conversation messages visible when a later network/API error happens.
- Added inline retry without clearing the composer or restarting the matchmaker session.
- Rendered quota and no-result quick replies inside focused recovery panels instead of generic chips.
