# AI Matchmaker UI Improvement

The new matchmaking UI should make StrathSpace feel personal, guided, and faster than browsing. The backend now stores profile intelligence, so the frontend should treat the matchmaker as the main discovery assistant and show daily recommendations as supporting inventory.

## Phase 1: Guided Search Entry

- Add an AI Matchmaker panel inside the Wingman tab.
- Let users describe the person they want in natural language.
- Provide quick prompts for common intents.
- Call `/api/matchmaker/search` and show five explained candidates.
- Keep the implementation modular with a hook, typed response models, and reusable candidate cards.

## Phase 2: Conversational Refinement

- Add follow-up chips after results: more active, more serious, similar vibe, different vibe.
- Send excluded candidate ids on refinement so users do not see the same batch again.
- Preserve the last intent and refinement history for the session.

## Phase 3: Action Loop

- Add interested/pass actions directly on matchmaker results.
- Record recommendation events with source `matchmaker`.
- Move mutual interest users into the normal chat/date flow.

## Phase 4: Personalized Memory

- Show a lightweight matchmaker memory summary.
- Allow users to edit what the assistant remembers.
- Limit daily searches based on backend quota and show clear remaining usage.

## Phase 5: Full Matchmaker Home

- Promote the matchmaker from a panel into the primary discovery surface.
- Keep friend Wingman reviews as profile intelligence enrichment below the main assistant.
- Add empty, loading, error, and offline states that feel calm and premium.
