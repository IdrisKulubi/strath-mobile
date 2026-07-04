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
