# Phase 2: Candidate Presentation

## Goal

Make a suggested person feel like a thoughtful introduction, not another browse card.

## Scope

- Improve candidate messages in the timeline.
- Present one primary candidate at a time.
- Show why the matchmaker chose them using human-readable reasons.
- Make candidate card tap target clear.
- Avoid exposing internal score, rank, or hidden matching logic.

## Candidate Card Content

- first name and age,
- course/university,
- one concise matchmaker reason,
- up to three helpful labels,
- photo preview if available from the profile payload or profile fetch path,
- clear profile-open affordance.

## Actions

- View profile,
- Not this one,
- Find another,
- Change what I asked for.

Interested and Pass remain inside the profile view, so the decision flow stays consistent and safe.

## UX Requirements

- A candidate suggestion should feel scarce and deliberate.
- The UI should make it clear that `Find another` consumes a search.
- If a candidate is unavailable, the UI should recover inline.

## Acceptance Criteria

- Candidate card opens `/profile/[userId]?source=matchmaker`.
- The user sees one candidate per search.
- Repeated candidates are not shown in the same session.
- Candidate card does not shift layout while loading.

## Implementation Notes

- Reworked `MatchmakerCandidateCard` into a deliberate introduction card with photo support, matchmaker reason, labels, and a clear profile-open affordance.
- Removed the visible `#1` rank badge so users never see hidden rank or scoring logic.
- Added optional `profilePhoto` and `photos` fields to the matchmaker candidate payload.
- Passed profile photos through the backend matchmaker search service from cached profiles.
- Added a quiet hint that `Find another` consumes one daily search.
