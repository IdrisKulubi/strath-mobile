# Backend Improvement Plan

## Goal

Build a backend-first matching brain for StrathSpace so the app can help users find a partner faster. The system should make the AI matchmaker useful by giving it cached profile intelligence, fast search, activity-aware ranking, and better recommendation data before the frontend becomes more conversational.

The backend should move from "show five profiles" to "select the best available people for this user right now, explain why, and accelerate reciprocal interest."

## Product Outcomes

- Increase time-to-first-mutual-match performance.
- Prioritize users who are active, responsive, complete, and likely to reciprocate.
- Give the AI matchmaker fast access to profile summaries and embeddings.
- Avoid repeatedly showing dormant users or low-trust profiles.
- Make daily recommendations stable, personalized, and easier to act on.
- Keep heavy AI work off the request path by precomputing intelligence records.

## Backend Shape

```txt
Mobile app
  -> Next.js backend
    -> Postgres / pgvector
    -> Python profile intelligence worker
```

The Next.js backend remains the authority for auth, recommendation rules, daily shortlist persistence, match decisions, and admin tools. The Python worker handles heavy asynchronous intelligence work: profile summaries, embeddings, image embeddings, photo quality analysis, and batch backfills.

The mobile app should never call the Python worker directly.

## Core Concepts

### Profile Intelligence

Each user gets a cached profile intelligence record:

```txt
profile_intelligence
- user_id
- profile_summary
- search_text
- text_embedding
- photo_presentation_score
- visual_embedding
- activity_score
- response_score
- inbound_interest_score
- mutual_conversion_score
- candidate_strength_score
- last_seen_at
- last_profile_change_at
- last_analyzed_at
- analysis_version
```

This record is private backend data. It exists so the matchmaker and recommendation engine can search and rank quickly.

### Candidate Strength

Use a private candidate strength score for ranking:

```txt
candidate_strength_score =
  recent_activity_score
+ response_score
+ inbound_interest_score
+ mutual_conversion_score
+ profile_completeness_score
+ photo_presentation_score
```

This is not user-facing. It helps the backend avoid weak or dormant recommendations.

### Viewer-Specific Fit

For a specific viewer, final ranking should combine candidate strength with personalized fit:

```txt
final_candidate_score =
  compatibility_score
+ candidate_strength_score
+ viewer_visual_preference_fit
+ semantic_intent_fit
+ reciprocal_interest_score
- exclusion_penalties
```

The system should learn from real behavior: likes, passes, views, profile opens, mutual matches, and replies.

## Ranking Priorities

The recommendation engine should prioritize:

1. Reciprocal interest candidates.
2. Active users seen recently.
3. Users with high response probability.
4. Users with strong profile completeness and clear photos.
5. Users semantically close to the viewer's stated matchmaker intent.
6. Users similar to profiles the viewer has liked before.
7. Underexposed but high-quality users who need fair distribution.

Hard exclusions still apply:

- blocked users
- existing mutual/date holds
- hidden profiles
- discovery-paused profiles
- deleted users
- already-passed candidates
- incompatible gender preferences
- unverified or unsafe profiles where required

## AI Matchmaker Backend Flow

1. User asks for a match, or chooses a guided intent.
2. Backend parses the intent into structured constraints.
3. Backend generates or reuses an intent embedding.
4. Backend queries `profile_intelligence` with filters and vector search.
5. Backend ranks candidates using final candidate score.
6. Backend returns a small set of candidates with safe reasons.
7. If the user chooses `open_to_meet`, backend boosts the reverse candidate into the other user's flow.

Example intent:

```json
{
  "rawText": "I want someone calm, serious, and active today",
  "traits": ["calm", "serious"],
  "availability": "active_today",
  "relationshipIntent": "intentional",
  "dealbreakers": []
}
```

## Python Worker Responsibilities

The Python worker should support:

- `POST /profiles/analyze`
- `POST /profiles/batch-analyze`
- `POST /profiles/embed-text`
- `POST /profiles/embed-image`
- `POST /profiles/summarize`
- `GET /health`

It should accept only internal requests signed with `PROFILE_INTELLIGENCE_SERVICE_SECRET`.

## Next.js Backend Responsibilities

The Next.js backend should support:

- queueing or invoking Python analysis
- storing intelligence records
- exposing admin reanalysis tools
- running recommendation ranking
- serving matchmaker search endpoints
- tracking interactions
- persisting daily shortlists
- measuring conversion

## Phased Implementation

Do not build this all at once. Each phase should be implemented, tested, and verified before starting the next one.

| Phase | Name | Outcome |
| --- | --- | --- |
| 1 | Data foundation | Tables, types, migrations, and cached intelligence shape |
| 2 | Python intelligence worker | Summaries, embeddings, photo presentation analysis, batch API |
| 3 | Backfill and refresh pipeline | Analyze existing profiles and keep records current |
| 4 | Activity and behavior signals | Last seen, response, likes, mutual conversion, candidate strength |
| 5 | Recommendation integration | Use intelligence in daily recommendations and shortlist selection |
| 6 | Matchmaker search API | Intent parsing, vector search, ranked candidate results |
| 7 | Monitoring and tuning | Admin health, metrics, A/B checks, ranking guardrails |

See `docs/backend-improvement/` for the phase-by-phase implementation plan.

## Success Metrics

- Time to first mutual match.
- Daily shortlist decision rate.
- Open-to-meet rate.
- Reciprocal match creation rate.
- Response rate after mutual interest.
- Percentage of recommendations shown to active users.
- Percentage of daily recommendations with stale intelligence.
- Candidate pool fairness by exposure distribution.

## Non-Goals For V1

- Public profile scores.
- User-visible internal ranking labels.
- Unlimited open-ended matchmaker chat.
- Realtime AI calls for every recommendation request.
- Replacing deterministic filters with opaque AI decisions.
