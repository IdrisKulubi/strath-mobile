# Phase 06: Matchmaker Search API

## Objective

Add backend APIs that let the AI matchmaker search and rank candidates quickly using cached profile intelligence.

## Status

Implemented in this workspace.

## Implemented

- Added `POST /api/matchmaker/search` with auth, matchmaking-access checks, and AI-consent checks.
- Added modular intent parsing with safe trait extraction and optional worker-backed intent embeddings.
- Added cached profile-intelligence search and ranking.
- Applied hard exclusions for self, blocked users, users who blocked the viewer, passed candidates, visibility, discovery pause, profile completion, and reciprocal gender fit.
- Returned safe labels/reasons without exposing internal scores.
- Logged matchmaker requests to `matchmaker_intents`.

## Scope

- Add intent parsing.
- Store user matchmaker requests.
- Generate or reuse intent embeddings.
- Query profile intelligence with semantic search.
- Rank candidates with hard filters and final candidate score.
- Return a small set of explainable candidates.

## API

```txt
POST /api/matchmaker/search
```

Request:

```json
{
  "intent": "I want someone calm, serious, and active today",
  "limit": 3
}
```

Response:

```json
{
  "summary": "I found 3 people who fit that well.",
  "candidates": [
    {
      "candidateUserId": "user_123",
      "reason": "Active today, intentional, and close to the kind of profile you asked for.",
      "labels": ["Active today", "Intentional", "Strong fit"]
    }
  ]
}
```

## Files To Touch

- `backend/strath-backend/src/app/api/matchmaker/search/route.ts`
- `backend/strath-backend/src/lib/services/matchmaker-intent-service.ts`
- `backend/strath-backend/src/lib/services/matchmaker-search-service.ts`
- `backend/strath-backend/src/lib/services/profile-intelligence-service.ts`

## Acceptance Criteria

- Endpoint requires auth.
- Hard exclusions apply.
- Dormant users are deprioritized or excluded depending on threshold.
- Results are pulled from cached intelligence.
- Safe reasons are returned without exposing internal scores.
- Matchmaker request is logged for future learning.

## Tests

- API auth test.
- Intent parsing test.
- Search filter test.
- Ranking test with active vs inactive candidates.

## Manual Verification

Use a test user to search for "calm and active today." Confirm returned candidates are active and semantically relevant.

## Rollback

Hide the matchmaker route behind a feature flag.
