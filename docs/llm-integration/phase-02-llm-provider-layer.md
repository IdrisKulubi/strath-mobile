# Phase 2: LLM Provider Layer

## Goal

Add OpenAI/Gemini support behind a provider abstraction. The LLM should improve conversation quality and intent understanding without controlling eligibility or directly selecting users.

## Backend Scope

- Add `matchmaker-llm-client.ts`.
- Add provider implementations:
  - `openai`
  - `gemini`
  - `scripted`
- Add environment configuration:
  - `MATCHMAKER_LLM_PROVIDER`
  - `MATCHMAKER_LLM_MODEL`
  - `OPENAI_API_KEY`
  - `GOOGLE_GENERATIVE_AI_API_KEY`
- Add structured LLM tasks:
  - classify user message
  - extract match intent
  - decide whether to ask a clarifying question
  - write matchmaker reply
  - explain a backend-selected candidate

## LLM Contract

The LLM should return structured JSON, not loose prose, for backend decisions.

```json
{
  "messageType": "intent" ,
  "shouldClarify": true,
  "clarifyingQuestion": "Do you mean calm socially, emotionally mature, or low-drama?",
  "intent": {
    "traits": ["calm"],
    "relationshipIntent": "serious",
    "activityRequirement": "active_today",
    "dealbreakers": []
  },
  "reply": "I can help with that. Let me narrow one thing first."
}
```

## Guardrails

- LLM does not receive private internal scores unless needed for explanation.
- LLM cannot fabricate candidates.
- LLM output must be validated with Zod.
- If LLM fails, fall back to scripted responses.

## Verification

- App works with `MATCHMAKER_LLM_PROVIDER=scripted`.
- App works with OpenAI or Gemini when configured.
- Invalid LLM JSON falls back safely.
- No candidate search happens from LLM output until backend validates it.

## Implementation Notes

- `matchmaker-llm-client.ts` owns the provider abstraction.
- Supported providers:
  - `scripted`
  - `openai`
  - `gemini`
- The session service calls the LLM client for each user turn.
- Assistant messages store provider, model, fallback status, extracted intent, and search plan in message metadata.
- If OpenAI/Gemini fails, returns invalid JSON, or lacks a key, the service falls back to scripted output.
- Candidate selection remains out of scope for this phase.

## Environment Notes

Use scripted locally by default:

```txt
MATCHMAKER_LLM_PROVIDER=scripted
```

For Gemini:

```txt
MATCHMAKER_LLM_PROVIDER=gemini
MATCHMAKER_LLM_MODEL=gemini-2.0-flash
GOOGLE_GENERATIVE_AI_API_KEY=...
```

The backend also supports the existing `GEMINI_API_KEY` as a fallback key.

For OpenAI:

```txt
MATCHMAKER_LLM_PROVIDER=openai
MATCHMAKER_LLM_MODEL=gpt-4.1-mini
OPENAI_API_KEY=...
```

The OpenAI provider uses the Responses API with JSON output, then validates the result with Zod before it can affect matchmaker state.
