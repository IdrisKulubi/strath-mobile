# Phase 5: Specific Feedback and Visible Learning

## Goal

Turn candidate feedback into precise, user-approved learning while preserving the rest of the shortlist and preventing accidental global exclusions.

## Dependencies

- Phase 4 acceptance gate passed.
- Versioned preference mutations and undo are stable.
- Candidate-level shortlist identity persists across profile and conversation flows.

## UX Contract

- Candidate feedback begins with one of:
  - lifestyle mismatch;
  - relationship goals;
  - communication style;
  - attraction;
  - practical mismatch;
  - something else.
- Feedback remains optional.
- Ask one follow-up only when it will produce a more useful and less ambiguous signal.
- Ask whether the learning is for this person only or future matches.
- Candidate-only is the safe default.
- Preview future-search changes before applying them.
- Confirm the exact brief update and offer Undo.
- Never show raw internal tags or free-text feedback to another user.

## Backend Work

- Extend feedback validation with `shortlistId`, `candidateUserId`, `reasonCode`, optional `detail`, and `learningScope`.
- Verify the candidate belongs to the user's shortlist before accepting feedback.
- Store candidate feedback independently from global preferences.
- Map reason codes to proposed preference operations, but do not apply them globally without explicit confirmation.
- Generate a plain-language preview that distinguishes candidate-specific context from proposed future-search behavior.
- Apply confirmed operations through the versioned brief service and return the updated brief plus reversible change identifier.
- Keep old feedback payloads working as candidate-only input during rollout.
- Remove candidate-trait scraping from negative global memory updates.
- Sanitize memory summaries so internal prefixes, personality tokens, or malformed values cannot reach user-facing copy.

## Mobile Work

- Add reason choices after “Not for me” without hiding the remaining shortlist.
- Add one contextual follow-up when requested by the backend.
- Present scope choice in plain language:
  - “Only about this person”;
  - “Use this for future matches.”
- Show a preview of proposed brief changes before global confirmation.
- On save, show exactly what changed with an inline Undo action.
- Let the user skip feedback, continue comparing, or open another candidate.
- Preserve unsent free text through keyboard dismissal, navigation interruption, and retry.
- Ensure attraction feedback remains neutral and private without encouraging demeaning language.

## Analytics

- Track reason selected, follow-up requested/completed/skipped, candidate-only selected, future-learning previewed, future-learning confirmed/cancelled, and undo.
- Track category codes only. Never log free-text detail or private preference content.

## Tests

- Prove every reason defaults to candidate-only scope.
- Prove candidate-only feedback leaves the global brief unchanged.
- Prove future learning requires an explicit confirmation request tied to the latest brief version.
- Test preview cancellation, version conflict, retry, duplicate submission, and undo.
- Test feedback for one candidate while navigating and deciding on other shortlist candidates.
- Verify free text is private, excluded from analytics, and never returned in another user's payload.
- Test sanitization against raw strings such as `avoid:calm`, personality tags, malformed summaries, and unsupported attributes.

## Acceptance Criteria

- Candidate-specific feedback never mutates global preferences.
- Every global learning change is previewed, explicitly confirmed, and reversible.
- Feedback does not consume a search credit or discard the remaining shortlist.
- The next search uses confirmed updates and ignores unconfirmed proposals.
- No raw internal memory tokens appear in the app.
- Free-text feedback remains private.

## Exclusions

- No automatic global learning from passive profile viewing or carousel position.
- No candidate-facing feedback summaries.
- No removal of historical feedback records.

## Rollback

Disable V2 global-learning confirmation and retain candidate-level feedback only. Existing confirmed preference events remain available and reversible through the brief service.
