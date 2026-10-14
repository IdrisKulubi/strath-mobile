# Matchmaker Personalization V2

## Status

Implementation complete behind `matchmaker_personalization_v2`. Production device QA and the staged rollout remain pending. V1 stays authoritative for users outside the assigned rollout cohort.

This roadmap supersedes the V1 decisions to present one candidate per search and to expose a generated memory summary without direct user control. The completed V1 documentation remains the historical record of the current implementation.

## Product Outcome

The StrathSpace matchmaker should feel like an accountable matchmaking partnership, not a chatbot connected to profile search. It must:

- learn through focused conversation without treating guesses as facts;
- show users what it remembers and let them correct or forget it;
- present one curated shortlist of up to three qualified people per search;
- explain fit using stored evidence and honest uncertainty;
- learn from candidate feedback only at the scope the user approves;
- preserve the dignity, privacy, and safety of both people.

The physical scene remains a university student checking the app one-handed between classes, often with limited time or an unreliable network. The UI stays quiet, premium, direct, and content-first.

## Locked Product Decisions

- One persisted shortlist consumes one daily search.
- A shortlist contains one to three qualified candidates. Never pad it with weaker candidates.
- Users can add, edit, confirm, reclassify, remove, and undo remembered preferences.
- Candidate feedback is candidate-specific unless the user explicitly applies it to future matches.
- Comparison is inline and uses confirmed priorities only.
- Internal rank, score, embedding data, and numeric confidence never appear in the product.
- Existing Interested, Pass, mutual-match, verification, block, report, and safety flows remain authoritative.
- Clarification, brief editing, comparison, explanation viewing, and feedback do not consume searches.
- V1 remains available behind the existing path until V2 passes full rollout gates.

## Experience Contract

### Preference states

Every remembered preference has a user-facing meaning:

- **Confirmed:** directly stated or explicitly approved by the user.
- **Inferred:** suggested by behavior or prior memory and awaiting confirmation.
- **Still learning:** an important unanswered question; it is not a search constraint.

Importance is separate from certainty:

- **Must have:** a confirmed hard requirement.
- **Prefer:** a confirmed positive or negative preference.
- **Flexible:** useful context that may be traded against stronger fit elsewhere.

### Dialogue rules

- Ask one question at a time.
- Ask only when the answer can materially change the search or explanation.
- If an answer supplies useful information but does not answer the question, save the new information at the correct certainty and leave the question unresolved.
- Resolve contradictions before converting them into search constraints.
- Reflect the user's meaning, not only their adjectives.
- Never claim that an unanswered preference is confirmed.
- Allow a search with an incomplete brief and explain relevant uncertainties.

### Shortlist rules

- Search for up to three candidates in one operation.
- Persist the shortlist before consuming its search credit or returning it to the app.
- Exclude all candidates already shown in the active session.
- Use activity and profile completeness as eligibility or reliability signals, not primary compatibility reasons.
- Every fit reason must be traceable to stored profile, preference, or matching evidence.
- When evidence for a potential mismatch or unknown exists, state it plainly.

### Feedback rules

- A rejection does not copy all traits of the rejected person into global negative memory.
- Feedback first applies to the candidate only.
- A proposed future-search change is previewed in plain language and requires confirmation.
- Every global preference mutation returns a reversible change identifier.
- Free-text feedback is private and is never shown to the candidate.

## Architecture Direction

### Persistence

Add normalized user preferences, append-only preference change history, and persisted shortlists. Existing `matchmaker_user_memory` remains readable during migration and may continue to provide a compatibility hint until structured preferences fully replace it.

Each shortlist links to its session, viewer, brief version, intent snapshot, creation time, and one to three `matchmaker_session_results`. Session results retain candidate-level evidence and presentation position.

### API contracts

Add a versioned `MatchmakerBrief` contract and these authenticated, AI-consent-protected routes:

- `GET /api/matchmaker/brief`
- `PATCH /api/matchmaker/brief`
- `POST /api/matchmaker/brief/undo`

`PATCH /api/matchmaker/brief` accepts an optimistic `baseVersion` and one or more add, update, confirm, reclassify, or remove operations. Version conflicts return the latest brief without discarding the user's pending edit.

The existing session search response remains a `MatchmakerConversationResponse`. Candidate-message metadata gains a `shortlist` payload containing one to three structured candidates. During rollout, clients must continue to read historical single-candidate metadata.

The feedback request remains backward compatible and gains `shortlistId`, `candidateUserId`, `reasonCode`, optional `detail`, `learningScope`, and optional confirmed brief operations.

Add `presenting_shortlist` to the conversation state while retaining `presenting_candidate` for historical sessions.

### Shortlist candidate contract

Each presented candidate contains existing profile-summary fields plus:

- two or three `fitReasons` grounded in evidence;
- `matchedPreferenceIds` containing confirmed preferences only;
- an optional `tradeoff`;
- an optional `unknown`;
- optional reciprocal-fit copy when supported by stored evidence;
- no public score, rank, or percentage.

## Phase Order

1. [Preference integrity foundation](phase-01-preference-foundation.md)
2. [Editable match brief and dialogue](phase-02-match-brief-dialogue.md)
3. [Curated shortlist backend](phase-03-shortlist-search.md)
4. [Mobile shortlist experience](phase-04-shortlist-experience.md)
5. [Specific feedback and visible learning](phase-05-feedback-learning.md)
6. [Hardening and rollout](phase-06-hardening-rollout.md)

Operational rollout steps are defined in the [V2 rollout runbook](rollout-runbook.md).

## Shared Delivery Rules

- Put all V2 behavior behind `matchmaker_personalization_v2` until full rollout.
- Keep API readers backward compatible throughout rollout.
- Use additive migrations before removing or rewriting old fields.
- Do not silently backfill inferred data as confirmed.
- Instrument behavior in the phase that introduces it.
- Include loading, empty, error, retry, offline, and accessibility behavior in acceptance testing.
- Update this index and the relevant phase document when implementation changes an agreed contract.

## Rollout Strategy

After all phase gates pass:

1. Internal and seeded-account QA.
2. Five percent of eligible users.
3. Twenty-five percent.
4. Fifty percent.
5. One hundred percent.

Hold each external step long enough to cover at least one full Nairobi quota-reset cycle. Pause or roll back when:

- API error rate rises by more than two percentage points over the V1 baseline;
- repeated-candidate rate exceeds one percent;
- one persisted shortlist consumes anything other than one credit;
- conversation, shortlist, or brief state becomes unrecoverable;
- any privacy, safety, block, report, or verification regression appears.

Interested rate is a diagnostic metric, not an automatic rollback trigger. Evaluate it with shortlist quality, profile-open rate, feedback quality, and mutual outcomes.

## Definition of Done

V2 is complete when every phase gate passes, accessibility and resilience QA are complete, admin analytics distinguish shortlist-level from candidate-level behavior, V2 is stable at full rollout, and V1 fallback can be retired through a separate reviewed cleanup plan.
