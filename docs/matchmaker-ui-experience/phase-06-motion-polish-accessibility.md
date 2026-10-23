# Phase 6: Motion, Polish, And Accessibility

## Goal

Make the matchmaker feel premium without adding noisy dating-app effects.

## Scope

- Refine spacing and text hierarchy.
- Add purposeful micro-interactions.
- Improve keyboard behavior.
- Check dynamic type and small screens.
- Add accessibility labels.

## Motion Rules

- Use short ease-out transitions.
- Animate opacity/transform only.
- No bounce.
- No confetti.
- No decorative AI shimmer.

## Accessibility

- Minimum touch targets: 44 pt.
- Text must not clip with font scaling.
- Candidate cards need clear labels.
- Composer should support keyboard return behavior.
- Loading and errors should be screen-reader understandable.

## Visual Polish

- Replace heavy card stacking with clean tonal sections.
- Keep magenta for primary actions only.
- Remove all unnecessary section labels.
- Use sentence case.

## Acceptance Criteria

- Works on small phones and larger phones.
- No overlapping text.
- Buttons remain tappable with font scaling.
- Reduced-motion users do not get unnecessary animation.

## Implementation Notes

- Added accessibility labels, roles, and hints to matchmaker candidate cards, search actions, quick replies, feedback chips, retry actions, and composer send.
- Added subtle pressed opacity/scale states on touch targets using transform only.
- Removed clipping line limits from matchmaker buttons and candidate reasons where text should expand with font scaling.
- Added `keyboardDismissMode="interactive"` to the Home matchmaker scroll view.
- Kept motion minimal and state-driven, with no decorative animation or confetti.
