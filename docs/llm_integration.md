# LLM Matchmaker Integration Plan

## Goal

Turn the StrathSpace homepage into a human-feeling AI matchmaker experience. The user should feel like someone is helping them find a partner inside the app, not like they are typing into a generic chatbot or adjusting search filters.

The matchmaker should talk with the user, understand what they want today, ask clarifying questions when needed, search the eligible StrathSpace pool, explain why a person was selected, learn from Interested/Pass feedback, and stop gracefully when the daily search budget is used.

## Product Direction

The matchmaker is not a general assistant. Its primary job is to help users find someone from StrathSpace.

It can still be warm and human when a search cannot continue:

- suggest a profile improvement
- ask a useful preference question for tomorrow
- help the user reflect on what they want
- offer light recommendations like a date idea or a book/activity suggestion

But every interaction should support the core goal: better matching.

## Experience Shape

1. The matchmaker opens the day with context.
2. The user says what kind of person they want.
3. The matchmaker asks one clarifying question if the request is vague.
4. The matchmaker explains the search plan.
5. The user confirms.
6. Backend searches eligible profiles with hard filters, session exclusions, ranking, and diversity.
7. The matchmaker presents one strong candidate or a small set.
8. The user chooses Interested, Not this one, Why them, or Find another.
9. Feedback updates matchmaker memory and the next search.
10. Daily search limits are enforced without making the experience feel cold.

## Architecture

```txt
Mobile Home
  -> Matchmaker conversation API
    -> LLM provider abstraction
    -> Matchmaker session service
    -> Profile intelligence / search service
    -> Recommendation decision service
    -> Postgres
```

The LLM should handle conversation, intent extraction, clarifying questions, and candidate explanation. The backend should remain the authority for user eligibility, safety filters, candidate search, ranking, exposure limits, and decisions.

The LLM should never invent users. It can only reason over candidates returned by the backend.

## Provider Strategy

Build a provider abstraction so we can use OpenAI or Google Gemini without rewriting the matchmaker.

Environment variables:

```txt
MATCHMAKER_LLM_PROVIDER=openai | gemini | scripted
MATCHMAKER_LLM_MODEL=...
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
MATCHMAKER_DAILY_SEARCH_LIMIT=...
MATCHMAKER_MAX_CLARIFYING_QUESTIONS=...
```

`scripted` should stay available as a fallback for local testing and outages.

## Data Model Additions

Add these tables over phases:

```txt
matchmaker_sessions
- id
- user_id
- status
- state
- daily_search_count
- search_limit
- current_intent
- current_plan
- last_candidate_user_id
- created_at
- updated_at

matchmaker_messages
- id
- session_id
- role
- kind
- text
- quick_replies
- metadata
- created_at

matchmaker_session_results
- id
- session_id
- candidate_user_id
- rank
- score
- reason
- labels
- status
- feedback
- shown_at
- decided_at

matchmaker_user_memory
- id
- user_id
- preference_summary
- positive_signals
- negative_signals
- updated_at
```

Enhance `profile_intelligence` with structured tags:

```txt
trait_tags
dating_intent_tags
social_energy_tags
lifestyle_tags
interest_tags
communication_tags
availability_tags
dealbreaker_tags
```

## Conversation States

The matchmaker should be a guided state machine, not an open chat box.

```txt
greeting
collecting_intent
clarifying
ready_to_search
searching
presenting_candidate
collecting_feedback
refining
limit_reached
```

This keeps the assistant focused and prevents the experience from turning into a generic chatbot.

## Guardrails

- Do not expose internal scores.
- Do not rank users by protected traits.
- Do not let the LLM choose candidates outside backend eligibility.
- Do not show blocked, deleted, hidden, paused, unsafe, or incompatible profiles.
- Do not repeat the same people in one session unless the user explicitly asks.
- Do not keep searching after quota is spent.
- Store enough message context to continue the flow, but avoid saving unnecessary sensitive free-form text.

## Phased Implementation

Do not build this all at once. Each phase should be implemented, tested, and verified before the next.

| Phase | Name | Outcome |
| --- | --- | --- |
| 1 | Conversation shell | Home becomes a session-based matchmaker conversation with scripted responses |
| 2 | LLM provider layer | OpenAI/Gemini abstraction for intent extraction, clarifying questions, and replies |
| 3 | Session-aware search | No repeats, hard filters, one-candidate presentation, search plans |
| 4 | Feedback memory | Interested/Pass feedback updates session and user memory |
| 5 | Structured profile intelligence | Generate searchable tags for better matching accuracy |
| 6 | Quotas and graceful limits | Daily search budgets with warm fallback interactions |
| 7 | Quality, analytics, and tuning | Metrics, admin visibility, ranking review, and safe rollout |

See `docs/llm-integration/` for phase-by-phase implementation notes.

## Success Metrics

- Fewer repeated candidates across searches.
- Higher Interested rate from matchmaker suggestions.
- Higher mutual match creation rate.
- Lower pass rate caused by irrelevant suggestions.
- More profile opens from matchmaker candidates.
- Search-to-decision time.
- Number of clarifying turns before a useful result.
- Daily quota usage and return-next-day rate.

## Non-Goals For The First Build

- Unlimited general-purpose AI chat.
- Letting the LLM directly query or select arbitrary users.
- Public attractiveness or ranking labels.
- Replacing deterministic eligibility and safety filters.
- Long free-form therapy or relationship counseling.
