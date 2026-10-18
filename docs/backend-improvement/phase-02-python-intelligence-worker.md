# Phase 02: Python Intelligence Worker

## Status

Implemented in this workspace.

Verification:

- Worker profile endpoints added.
- Worker bearer auth applies to profile endpoints.
- Deterministic profile summaries and 768-d text embeddings added.
- Profile analyze and batch analyze endpoints added.
- Next.js worker client added with timeout, retry, and `PROFILE_*` / `PHOTO_*` env fallback.
- Python worker tests pass with dependencies installed into `C:\tmp\photo-worker-deps`.
- Backend client tests pass.
- Backend TypeScript check passes.

## Objective

Create or extend the Python worker so expensive intelligence tasks run outside the request path.

## Scope

- Add worker endpoints for profile summarization, text embeddings, image embeddings, and photo presentation analysis.
- Require shared-secret authentication.
- Add health endpoint.
- Add request and response schemas.
- Add timeout and retry behavior from the Next.js backend caller.

## Worker Endpoints

```txt
GET /health
POST /profiles/summarize
POST /profiles/embed-text
POST /profiles/embed-image
POST /profiles/analyze
POST /profiles/batch-analyze
```

## Profile Summary Output

The summary should be short, factual, and useful for the matchmaker:

```json
{
  "profileSummary": "John is a third-year CS student who seems calm, focused, and interested in music and tech. He may fit someone looking for low-pressure conversation and intentional dating.",
  "searchText": "gender: male\nage: 22\nuniversity: Strathmore\ncourse: Computer Science\ntraits: calm, focused\ninterests: music, tech\nintent: intentional dating",
  "summaryVersion": "profile_summary_v1"
}
```

## Photo Presentation Output

Return presentation and safety signals only:

```json
{
  "photoPresentationScore": 82,
  "faceVisible": true,
  "imageClear": true,
  "lightingScore": 78,
  "hasMultiplePeople": false,
  "isObjectOnly": false,
  "moderationStatus": "approved"
}
```

## Files To Touch

- `services/photo-intelligence-worker/`
- `backend/strath-backend/src/lib/services/profile-intelligence-worker-client.ts`
- `backend/strath-backend/.env.example`

## Acceptance Criteria

- Worker rejects missing or invalid shared secret.
- Worker returns deterministic JSON schemas.
- Next backend client handles timeout, retry, and failed worker responses.
- Worker can process one profile payload locally.

## Tests

- Python endpoint schema tests.
- Worker auth tests.
- TypeScript client success and failure tests.

## Manual Verification

Call `/health`, then run one test profile through `/profiles/analyze` from the backend client.

## Rollback

Disable `PROFILE_INTELLIGENCE_SERVICE_URL`. Next backend should keep operating without worker-derived intelligence.
