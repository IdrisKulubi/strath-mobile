# Phase 4: Mobile Shortlist and Comparison Experience

## Goal

Turn a persisted shortlist into a calm, decision-ready introduction to up to three people without recreating an endless swipe stack.

## Dependencies

- Phase 3 acceptance gate passed.
- Shortlist payload is stable for one, two, and three candidates.
- Existing matchmaker-sourced profile navigation and decisions remain functional.

## UX Contract

- Present a horizontally paged, full-width shortlist with a text position indicator such as “1 of 3.”
- Show no paging or comparison chrome for one candidate.
- Keep photo, name, relevant profile context, fit reasons, and an honest unknown or tradeoff primary.
- Provide “Why this person?”, “View profile,” and “Not for me.”
- Compare candidates inline against confirmed priorities only.
- Never call a candidate first, best, winner, or highest-ranked.
- Opening and returning from a profile preserves shortlist and page position.
- Inspecting or comparing candidates consumes no search credit.

## Backend Work

- Ensure the session response can restore the active shortlist without generating a new search.
- Expose explanation evidence through user-safe structured copy only.
- Mark a stale or newly ineligible candidate without invalidating the rest of the shortlist.
- Keep recommendation-decision and profile routes authoritative for Interested, Pass, and mutual outcomes.

## Mobile Work

- Replace the V2 candidate renderer with a horizontally paged `FlatList` or equivalent native paging implementation.
- Render one candidate card at viewport width with stable height behavior and no nested card stack.
- Use pagination dots plus accessible text position; announce candidate changes.
- Add an expandable “Why this person?” section with fit reasons, tradeoff, and unknown.
- Add an inline comparison section below the pager. Rows represent confirmed brief priorities; columns represent available candidates.
- Use descriptive values such as “Strong evidence,” “Some evidence,” or “Not enough information,” never percentages.
- Preserve active shortlist ID and candidate index in navigation state or conversation cache before opening a profile.
- Restore the same index when returning from the profile decision flow.
- Keep the composer and contextual quick replies above the tab bar and safe area.
- Collapse earlier history by default while keeping the active brief, shortlist, and next action visible.
- Remove truncation from current questions, candidate rationale, feedback confirmation, and actionable content.
- Provide skeleton, partial, stale-candidate, and inline retry treatments that do not shift the entire layout.

## Analytics

- Track shortlist viewed, candidate page changed, explanation expanded, compare opened, comparison row viewed, profile opened, and candidate unavailable.
- Include shortlist ID, anonymous candidate position, and shortlist size. Do not send private explanation text.

## Tests

- Component-test one, two, and three candidates, missing photo, long name, long explanation, unknown, tradeoff, and stale candidate.
- Verify candidate paging and comparison never trigger search mutations.
- Test profile open, Interested, Pass, close, and return with restored shortlist position.
- Test small phones, large phones, landscape where supported, dynamic type, 200 percent text scaling, reduced motion, and bottom safe areas.
- Screen-reader test candidate position, heading order, explanation expansion, compare rows, and actionable labels.
- Verify every touch target is at least 44 points on iOS and 48 dp on Android.

## Acceptance Criteria

- Users can inspect every candidate without consuming another search.
- Profile return restores the active shortlist and candidate position.
- Single-candidate shortlists render without unnecessary carousel or comparison controls.
- Confirmed priorities are the only criteria in comparison.
- Current content never hides behind the composer or tab bar.
- The full shortlist is usable with dynamic type, screen readers, and reduced motion.

## Exclusions

- No new global learning from candidate rejection yet.
- No visual ranking or numerical compatibility.
- No changes to mutual-match or messaging rules.

## Rollback

Switch V2 users back to the historical single-candidate renderer. Persisted shortlists remain valid and must not consume additional credits when the user returns after rollback.
