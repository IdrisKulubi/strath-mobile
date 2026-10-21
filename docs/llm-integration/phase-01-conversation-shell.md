# Phase 1: Conversation Shell

## Goal

Replace the plain search-box homepage with a matchmaker conversation that feels guided, personal, and focused on finding a partner.

This phase should not depend on OpenAI or Gemini yet. Use scripted responses and deterministic state transitions so the product shape is stable before adding LLM cost.

## Backend Scope

- Add `matchmaker_sessions`.
- Add `matchmaker_messages`.
- Add an API to get or create today's active session.
- Add an API to send a user message.
- Add a scripted matchmaker response generator.
- Store session state:
  - `greeting`
  - `collecting_intent`
  - `ready_to_search`
  - `presenting_candidate`
  - `collecting_feedback`

## Mobile Scope

- Home renders a conversation timeline.
- User sees a matchmaker greeting.
- User can type a response or tap quick replies.
- UI supports assistant messages, user messages, and action chips.
- Existing `MatchmakerPanel` can be replaced or wrapped by a conversation component.

## API Shape

```txt
GET /api/matchmaker/session
POST /api/matchmaker/session/messages
```

Response should return:

```txt
session
messages
quickReplies
state
remainingSearches
candidateCard?
```

## Verification

- A new user sees a greeting.
- Sending a message stores it.
- A scripted assistant response appears.
- Refreshing the app reloads the same session.
- No LLM key is required.

## Implementation Notes

- The shell uses a scripted provider for Phase 1.
- The homepage renders the matchmaker conversation instead of the old daily carousel.
- The old homepage implementation remains available as `LegacyHomeScreen`.
- Candidate search and LLM-generated clarification are intentionally left for later phases.
