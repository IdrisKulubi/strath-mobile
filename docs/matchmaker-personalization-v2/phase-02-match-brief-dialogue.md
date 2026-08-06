# Phase 2: Editable Match Brief and Dialogue

## Implementation Status

Implemented behind `matchmaker_personalization_v2` on 2026-08-06. The flag remains off by default. Before the Phase 2 acceptance gate is declared passed, apply migration `0033_matchmaker_personalization_preferences.sql` in the target environment and complete dynamic-type, screen-reader, small-device, and API integration QA against a migrated database.

Implemented modules include:

- Authenticated, consent-gated, optimistic `GET`/`PATCH` brief and `POST` undo APIs.
- Structured LLM preference proposals with explicit-versus-inferred evidence.
- Persisted unresolved-question handling and contradiction clarification/resolution.
- Search plans and confirmation copy derived from the persisted confirmed brief; inferred and contradictory items are withheld as filters.
- Inline mobile brief review and editing with add, edit, confirm, reclassify, remove, conflict refresh, and Undo.
- Focused backend and mobile unit coverage for unrelated answers, confirmed/inferred grouping, grounded confirmation, and contradictory criteria.

## Goal

Show what the matchmaker understands, let the user correct it, and ensure conversation resolves ambiguity instead of fabricating certainty.

## Dependencies

- Phase 1 acceptance gate passed.
- Versioned brief APIs and hooks are stable.
- V1 candidate presentation remains active behind the V2 flag during this phase.

## UX Contract

- Show “What I understand about you” near the active matchmaker turn.
- Group active information into must-haves, preferences, flexible traits, avoids, and still learning.
- Label inferred information as a suggestion requiring confirmation.
- Support add, edit, confirm, reclassify, remove, and undo without requiring typed conversation.
- Ask one high-value question per turn.
- Never truncate the current question, brief summary, or search confirmation.
- Search remains available with an incomplete brief; unanswered items are not hard filters.
- Brief editing and clarification consume no search credit.

## Backend Work

- Add the brief routes defined in the V2 README with authentication, profile access, and AI-consent enforcement matching existing matchmaker routes.
- Extend the LLM turn contract to return structured preference proposals separately from spoken copy.
- Validate proposals against the supported categories and certainty rules before persistence.
- Require explicit confirmation before moving inferred information to confirmed.
- Track the active unresolved question in session metadata so an unrelated answer cannot silently resolve it.
- Add contradiction detection across active confirmed and inferred preferences.
- When a contradiction exists, generate a clarification turn and defer the conflicting search constraint.
- Build search confirmation from the persisted brief version rather than only recent free text.
- Preserve the legacy intent and plan payloads for backward compatibility.

## Mobile Work

- Add an inline, collapsible match-brief surface above the current decision.
- Default to a concise recap with an explicit Edit action; expanded mode shows groups and source/certainty labels.
- Use inline editing and selection controls instead of modal-first interaction.
- Show pending mutations, save errors, version conflicts, and Undo in context.
- Keep old conversation collapsed while leaving the active question and brief visible.
- Ensure the composer remains above the bottom navigation and safe area.
- Remove line limits from current prompts, confirmations, and explanations.

## Analytics

- Track brief viewed, expanded, preference added, edited, confirmed, reclassified, removed, undo used, and conflict recovered.
- Track clarification asked, answered directly, answered indirectly, contradiction found, and contradiction resolved.
- Do not include raw sensitive preference text in analytics payloads.

## Tests

- Dialogue tests for an answer that addresses the question, supplies unrelated information, contradicts a prior preference, or contains several preferences.
- Verify unrelated useful information is saved at the correct certainty while the original question remains unresolved.
- API tests for invalid categories, stale versions, unauthorized access, missing AI consent, undo ownership, and idempotent retries.
- UI tests for every preference group, empty brief, long values, dynamic type, failed edits, conflict recovery, and undo.
- Screen-reader tests for group headings, certainty, edit controls, and live save announcements.

## Acceptance Criteria

- Every active preference can be corrected without typing a new conversation.
- Inferred information is visually and semantically distinct from confirmed information.
- The matchmaker never summarizes an unanswered preference as confirmed.
- Contradictions trigger clarification rather than silent overwrite.
- Search confirmation names the persisted brief criteria it will use.
- Current content remains fully readable on supported small screens and font scales.

## Exclusions

- No multi-candidate search yet.
- No comparison UI.
- Existing profile decision flow remains unchanged.

## Rollback

Hide the brief UI and restore the V1 conversational surface through the feature flag. Keep structured preferences and history because V1 search can still consume the compatibility memory hint.
