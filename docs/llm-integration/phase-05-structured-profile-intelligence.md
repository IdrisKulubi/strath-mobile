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
