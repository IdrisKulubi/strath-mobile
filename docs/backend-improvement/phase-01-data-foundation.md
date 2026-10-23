# Phase 01: Data Foundation

## Status

Implemented in this workspace.

Verification:

- `profile_intelligence`, `profile_intelligence_jobs`, and `matchmaker_intents` schema added.
- Drizzle select/insert types exported.
- Profile intelligence service added.
- Candidate strength and job state tests added.
- Targeted Phase 01 tests pass.
- Backend TypeScript check passes.

## Objective

Create the database and TypeScript schema foundation for cached profile intelligence. This phase should not change recommendation behavior yet.

## Scope

- Add `profile_intelligence` table.
- Add `matchmaker_intents` table for logged user search requests.
- Add `profile_intelligence_jobs` table for async analysis status.
- Add Drizzle schema types.
- Add basic service functions for reading and writing intelligence records.

## Proposed Tables

### `profile_intelligence`

```txt
user_id primary key
profile_summary text
search_text text
text_embedding vector/json reference
visual_embedding vector/json reference
photo_presentation_score int default 0
profile_completeness_score int default 0
activity_score int default 0
response_score int default 0
inbound_interest_score int default 0
mutual_conversion_score int default 0
candidate_strength_score int default 0
last_seen_at timestamp
last_profile_change_at timestamp
last_analyzed_at timestamp
analysis_version text
metadata jsonb
created_at timestamp
updated_at timestamp
```

### `profile_intelligence_jobs`

```txt
id uuid primary key
user_id text
job_type text
status text
attempts int
last_error text
locked_at timestamp
completed_at timestamp
metadata jsonb
created_at timestamp
updated_at timestamp
```

### `matchmaker_intents`

```txt
id uuid primary key
user_id text
raw_text text
parsed_intent jsonb
intent_embedding vector/json reference
created_at timestamp
```

## Files To Touch

- `backend/strath-backend/src/db/schema.ts`
- `backend/strath-backend/drizzle/00xx_profile_intelligence.sql`
- `backend/strath-backend/src/lib/services/profile-intelligence-service.ts`
- `backend/strath-backend/src/lib/services/profile-intelligence-service.test.ts`

## Acceptance Criteria

- Migration creates all new tables safely.
- Drizzle schema exports select and insert types.
- Service can upsert a profile intelligence record.
- Service can enqueue and mark an intelligence job complete or failed.
- No recommendation behavior changes.

## Tests

- Unit test candidate strength calculation.
- Unit test upsert payload normalization.
- Unit test job state transitions.

## Manual Verification

Run a local insert/upsert for one test user and confirm the row appears with default scores and `analysis_version`.

## Rollback

Drop the new tables. No existing matching behavior should depend on this phase.
