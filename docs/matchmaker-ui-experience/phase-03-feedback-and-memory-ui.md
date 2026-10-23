# Phase 3: Feedback And Memory UI

## Goal

Make feedback feel natural and useful, so the matchmaker gets better without making the user fill forms.

## Scope

- Add lightweight feedback after `Not this one`.
- Show reason chips:
  - Not my vibe
  - Too social
  - Too quiet
  - Not serious enough
  - Not active enough
  - Different lifestyle
  - Skip
- Show a subtle memory confirmation after feedback.
- Keep feedback optional.

## Memory Copy

Good:

```txt
Got it. I will avoid very social profiles for now.
```

```txt
I will look for someone calmer and more intentional.
```

Avoid:

```txt
Preference vector updated.
```

```txt
Your rank model has changed.
```

## UX Requirements

- Feedback chips should not look like a survey.
- The user should be able to skip and keep moving.
- Feedback should not consume search quota.
- Memory should never reveal hidden scoring or ranking.

## Acceptance Criteria

- Selecting a feedback reason calls `/api/matchmaker/session/feedback`.
- The next search uses updated memory.
- The UI confirms what changed in plain language.
- Skip feedback works.

## Implementation Notes

- Added `MatchmakerFeedbackPanel` for feedback turns so reason chips do not look like generic chat replies.
- Kept feedback optional with a visible `Skip` action.
- Added plain-language confirmation for saved feedback and a note that reason feedback does not use a search.
- Routed feedback reason chips through `/api/matchmaker/session/feedback`.
- Softened the backend memory summary display so it does not expose internal signal prefixes.
