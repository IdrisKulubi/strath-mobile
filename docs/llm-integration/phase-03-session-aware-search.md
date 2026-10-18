# Phase 3: Session-Aware Search

## Goal

Stop showing the same five people repeatedly. Search should understand the current session, exclude already shown candidates, apply hard filters, and present a smaller number of stronger candidates.

## Backend Scope

- Add `matchmaker_session_results`.
- Track every candidate shown in the session.
- Exclude:
  - blocked users
  - deleted users
  - hidden profiles
  - discovery-paused profiles
  - already-passed users
  - already-shown users in the same session
  - incompatible gender preferences
- Apply hard filters where possible:
  - active today
  - relationship intent
  - university/course if requested
  - age range if requested
  - social energy if available
- Add diversity penalties:
  - recently shown in matchmaker
  - shown too many times globally
  - same type repeatedly shown in one session

## Candidate Presentation

Return one primary candidate first, with optional backups hidden behind "Find another."

The assistant should say:

```txt
I would start here.
```

Then explain:

```txt
She matches the calm, intentional direction you asked for and has been active recently.
```

## Mobile Scope

- Show one featured candidate at a time.
- Actions:
  - Interested
  - Not this one
  - Why them?
  - Find another
  - Change what I asked for

## Verification

- Different prompts can produce different search plans.
- Repeating search in the same session does not return the same candidates.
- Search logs which candidates were shown.
- Candidate profile opens with `source=matchmaker`.

## Implementation Notes

- Added `matchmaker_session_results` to record every candidate shown by a matchmaker session.
- Added `POST /api/matchmaker/session/search`.
- Session search now:
  - reads the current conversation intent/plan,
  - builds a search query from the user's latest direction,
  - calls the profile-intelligence-backed matchmaker search service,
  - excludes candidates already shown in the same session,
  - stores the shown candidate in `matchmaker_session_results`,
  - increments the session daily search count,
  - appends a `candidate` message to the conversation.
- Mobile now calls the session search endpoint from the home matchmaker flow.
- Candidate messages render as tappable cards and open profiles with `source=matchmaker`.
