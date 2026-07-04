# Phase 5: Structured Profile Intelligence

## Goal

Make matching accurate by giving the backend structured profile attributes, not just a text summary and embedding.

## Backend Scope

Enhance `profile_intelligence` with structured tags:

- `trait_tags`
- `dating_intent_tags`
- `social_energy_tags`
- `lifestyle_tags`
- `interest_tags`
- `communication_tags`
- `availability_tags`
- `dealbreaker_tags`

The Python worker should generate these tags during profile analysis and backfill.

## Worker Scope

Update analysis output:

```json
{
  "profileSummary": "...",
  "searchText": "...",
  "structuredTags": {
    "traitTags": ["calm", "ambitious"],
    "datingIntentTags": ["serious"],
    "socialEnergyTags": ["moderate"],
    "lifestyleTags": ["gym", "music"],
    "communicationTags": ["direct"],
    "availabilityTags": ["active_recently"]
  }
}
```

## Search Scope

Use structured tags for:

- hard filtering
- scoring
- explanations
- diversity
- memory matching

## Verification

- New profiles get structured tags.
- Backfill can populate tags for existing eligible profiles.
- Matchmaker search improves when tags are present.
- Missing tags do not break search.

## Implementation Notes

- Added structured tag columns to `profile_intelligence`.
- Extended the Python profile intelligence worker response with `structuredTags`.
- The worker now emits deterministic MVP tags from profile text, interests, qualities, onboarding answers, and lifestyle answers.
- The TypeScript worker client accepts optional structured tags.
- Profile intelligence storage normalizes tags before saving.
- Matchmaker search uses tag overlap as a relevance boost while preserving text/embedding fallback.
- Matchmaker feedback memory now learns from structured tags when available.

## Migration

Apply:

```txt
0032_profile_intelligence_structured_tags.sql
```

Then rerun the local backfill for profiles that need tags:

```txt
npx tsx src/scripts/backfill-profile-intelligence.ts --all --limit 25 --only-stale
```
