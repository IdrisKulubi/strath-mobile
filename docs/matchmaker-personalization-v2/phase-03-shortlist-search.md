# Phase 3: Curated Shortlist Backend

## Implementation Status

Implemented behind `matchmaker_personalization_v2` on 2026-08-06. Migration `0034_matchmaker_curated_shortlists.sql` must be applied after the Phase 1 preference migration before enabling the flag. The final Phase 3 gate still requires integration testing against a migrated PostgreSQL environment, including concurrent real requests and forced transaction failures.

Implemented modules include:

- Persisted shortlist records linked to session, viewer, brief version, intent snapshot, request key, status, and credit state.
- Additive shortlist linkage and structured explanation evidence on historical-compatible session results.
- Up-to-three selection with a quality floor, stable order, deduplication, and previously-shown exclusion.
- Grounded fit reasons linked to stored candidate fields and confirmed preference identifiers, with unsupported claims omitted.
- Atomic shortlist, result, message, state, and one-credit persistence with stable retry keys.
- Empty, partial, failed, generated, credit, and per-candidate analytics without preference text.
- Mobile parsing adapters for one, two, and three candidates while retaining the V1 candidate fallback.

## Goal

Make one daily search produce one persisted shortlist containing up to three qualified, non-repeating candidates with grounded explanations.

## Dependencies

- Phase 2 acceptance gate passed.
- Search can consume a versioned match brief.
- Existing eligibility, verification, block, decision, and safety filters are covered by tests.

## UX Contract

- One shortlist consumes exactly one daily search.
- Return one or two candidates when that is all the qualified pool supports.
- Never weaken requirements solely to fill three positions.
- Do not repeat candidates within the active session.
- Explain compatibility using evidence and state relevant uncertainty.
- Do not expose a leaderboard, numeric confidence, internal score, or embeddings.

## Backend Work

- Add a shortlist table linked to session, viewer, brief version, intent snapshot, status, credit-consumption state, and timestamps.
- Link `matchmaker_session_results` to a shortlist while preserving historical rows without a shortlist.
- Add `presenting_shortlist` to supported conversation states and retain `presenting_candidate` readers.
- Refactor session search to request up to three candidates in one call.
- Persist the shortlist and candidate results in one transaction, then increment `dailySearchCount` once.
- Make retry behavior idempotent so a repeated request cannot create a second shortlist or consume another credit.
- Continue excluding every candidate already persisted for the session.
- If no candidates qualify, preserve the current brief and do not consume a credit.
- Generate structured explanation data from approved evidence:
  - two or three concise fit reasons;
  - matched confirmed preference identifiers;
  - optional reciprocal-fit evidence;
  - one optional tradeoff;
  - one optional unknown.
- Validate generated explanations against available evidence. Omit unsupported statements instead of inventing copy.
- Keep activity and completeness in eligibility or reliability metadata, not primary fit reasons.
- Store the original matching evidence separately from user-facing LLM wording for audit and regeneration.

## Mobile Work

- Extend shared conversation and candidate types to parse shortlist metadata.
- Keep the V1 single-candidate renderer as a fallback for historical messages.
- Add data adapters for one, two, and three candidate responses, but defer the final visual treatment to Phase 4.

## Analytics

- Add shortlist requested, generated, partial, empty, failed, and credit-consumed events.
- Record shortlist size, excluded candidate count, evidence availability, and provider fallback without raw preference text.
- Retain candidate-shown events with `shortlistId` and candidate position.

## Tests

- Unit-test shortlist selection, quality threshold behavior, exclusion, stable position, partial results, and explanation grounding.
- Integration-test atomic persistence and one-credit accounting.
- Test concurrent search requests, client retries, provider retries, transaction failures, and timeouts.
- Prove empty search results consume no credit.
- Prove a persisted shortlist with one, two, or three candidates consumes one credit.
- Prove existing safety, verification, block, prior-decision, and profile-access filters still apply.
- Backward-compatibility test historical candidate messages and sessions.

## Acceptance Criteria

- Every successful search persists one shortlist with one to three unique qualified candidates.
- Exactly one search credit is consumed after successful shortlist persistence.
- Empty or failed searches do not consume a credit.
- Previously shown session candidates never reappear.
- Every displayed explanation can be traced to stored evidence.
- Existing clients can continue reading historical and V1 responses.

## Exclusions

- No final carousel or comparison UI.
- No new candidate feedback experience.
- No removal of the V1 candidate contract.

## Rollback

Route search back to the V1 one-candidate service through the feature flag. Keep shortlist records for auditing and do not convert partial V2 shortlist rows into V1 search credits.
