# Phase 1: Preference Integrity Foundation

## Implementation Status

Implemented in code on 2026-08-06. Migration `0033_matchmaker_personalization_preferences.sql` must be applied in each environment before enabling `matchmaker_personalization_v2`. The flag defaults off.

## Goal

Stop incorrect and irreversible learning before changing candidate presentation. Introduce structured, versioned preferences while keeping current sessions and memory readable.

## Dependencies

- Existing matchmaker sessions, feedback history, profile intelligence, and AI-consent checks.
- Existing V1 search and conversation UI remain active.
- The `matchmaker_personalization_v2` flag defaults off.

## UX Contract

- The system distinguishes confirmed, inferred, and still-learning information.
- Importance and certainty remain separate concepts.
- Rejection feedback is candidate-specific by default.
- No inferred or migrated value is presented as something the user directly said.
- Every global preference edit is reversible.

## Backend Work

- Add normalized preference persistence with:
  - user and stable preference identifiers;
  - category and normalized value;
  - positive or avoid sentiment;
  - must-have, prefer, or flexible importance;
  - confirmed or inferred certainty;
  - direct, feedback, migrated-memory, or system source;
  - active or removed status;
  - timestamps and current version.
- Add append-only change history containing actor, operation, before/after values, reason, source feedback when applicable, and timestamp.
- Implement a brief assembler that returns active preferences, still-learning questions, version, and latest reversible change identifier.
- Add optimistic mutation and undo services. Apply each mutation and history record in one transaction.
- Backfill existing positive and negative memory signals as inferred, flexible preferences with `migrated-memory` source.
- Keep existing feedback history intact. Do not rewrite historical records.
- Change new rejection handling so profile-derived candidate traits are not globally added as negative signals.
- Continue producing the legacy memory hint from structured preferences and legacy memory during the compatibility window.
- Add the feature flag without routing users into unfinished V2 UI.

## Mobile Work

- Add shared TypeScript types for the versioned brief and preference operations.
- Add query and mutation hooks for reading, editing, and undoing the brief, but do not expose the new brief UI yet.
- Handle optimistic-version conflict responses without dropping the local edit.

## Analytics

- Record migration counts by inferred preference category, never raw sensitive values.
- Add events for brief load failure, preference mutation success/failure, version conflict, and undo.
- Track whether search used legacy memory, structured preferences, or both.

## Tests

- Unit-test certainty, importance, normalization, deduplication, soft removal, version increments, and undo.
- Prove an unanswered value cannot be stored as confirmed.
- Prove rejecting a candidate does not copy their interests, personality, or lifestyle into global avoids.
- Test transaction rollback when history or preference persistence fails.
- Test concurrent edits and stale `baseVersion` handling.
- Migration-test users with no memory, positive-only memory, negative-only memory, mixed signals, and malformed historical values.
- Verify old sessions and feedback remain readable after migration.

## Acceptance Criteria

- All active preferences are versioned, inspectable, editable, and reversible.
- Migrated memory is inferred and flexible, never confirmed or must-have.
- Candidate rejection remains candidate-specific unless a later explicit confirmation changes the brief.
- Legacy search still works with no visible product regression.
- Feature flag off produces current V1 behavior.

## Exclusions

- No user-facing match brief.
- No prompt redesign.
- No shortlist generation or carousel.
- No removal of legacy memory fields.

## Implementation Notes

- Added normalized brief, preference, and append-only change-history tables with optimistic brief versions.
- Added a reversible preference service supporting add, update, confirm, reclassify, remove, and latest-change undo.
- Added a migration that imports legacy positive and negative memory as flexible, inferred preferences while preserving contradictory sentiment for later clarification.
- Changed feedback learning so candidate decisions and rejection reasons remain candidate-specific by default and do not mutate global signal weights.
- Kept explicit limit-mode type refinement as future-search learning. Structured compatibility writes occur only when the V2 feature flag is enabled.
- Added the private admin feature flag, Phase 1 analytics events, shared mobile types, and disabled-by-default mobile data hooks for the Phase 2 routes.
- Added domain regression tests for migration certainty, contradictory legacy signals, candidate-only feedback, future-search signal partitioning, normalization, and operation validation.
- Backend TypeScript and changed-file lint pass. The full backend suite has one pre-existing unrelated face-verification expectation failure; all matchmaker and new preference tests pass.

## Rollback

Disable writes to structured preferences and continue reading legacy memory. Additive tables and history remain in place for diagnosis; do not drop them during rollback.
