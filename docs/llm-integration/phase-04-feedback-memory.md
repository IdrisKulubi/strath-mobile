# Phase 4: Feedback Memory

## Goal

Make the matchmaker learn from user reactions. Interested, Pass, and "Not this one" should shape the next search and future sessions.

## Backend Scope

- Add `matchmaker_user_memory`.
- Store positive signals:
  - traits from Interested candidates
  - interests
  - dating intent
  - activity preferences
  - social energy
- Store negative signals:
  - traits from passed candidates
  - explicit feedback reasons
  - repeated mismatch patterns
- Update memory after:
  - Interested
  - Pass
  - Not this one
  - refinement message
- Feed memory into intent parsing and ranking.

## Feedback Reasons

Use quick feedback options:

- Not my vibe
- Too social
- Too quiet
- Not serious enough
- Not active enough
- Different lifestyle
- Other

## Mobile Scope

- After pass, ask a light follow-up:

```txt
What felt off?
```

- Let the user skip feedback.
- Show a subtle memory summary later:

```txt
I will avoid very social profiles for now.
```

## Verification

- Passing with a reason changes the next search.
- Interested updates positive memory.
- Memory can be inspected in logs/admin.
- User can continue without giving feedback.

## Implementation Notes

- Added `matchmaker_user_memory`.
- Added weighted positive/negative memory signals and compact feedback history.
- Added `POST /api/matchmaker/session/feedback`.
- Added automatic matchmaker memory updates from `recommendation-decisions` when `source=matchmaker`.
- Session-aware search now appends memory hints to the search text:
  - learned likes are prioritized,
  - learned dislikes are avoided.
- Mobile matchmaker now supports:
  - `Not this one`,
  - feedback reason chips,
  - skip feedback,
  - search again after feedback.

## Migration

Apply:

```txt
0031_matchmaker_user_memory.sql
```
