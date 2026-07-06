# Matchmaker UI Experience Plan

## Product Direction

The matchmaker should replace the old homepage discovery loop with a calmer, more personal flow. The user should feel like StrathSpace is actively helping them find a real person, not asking them to browse a stack.

This is a product UI, not a marketing surface. The design should feel quiet, premium, and intentional. Profiles, conversation, and decisions are the hero. The UI should not look like a chatbot pasted into a dating app.

## Experience Principles

- One primary action at a time.
- The matchmaker speaks like a thoughtful person, not a generic AI assistant.
- Candidate search feels curated and scarce, not infinite.
- Feedback feels optional and lightweight.
- Quotas feel like quality protection, not punishment.
- Users can always recover from loading, errors, no results, and weak network.
- The app never exposes internal ranking, scoring, or hidden matching logic.

## First Screen

The homepage opens directly into the matchmaker experience.

The first viewport should contain:

- a personal greeting,
- the current matchmaker state,
- the latest assistant message,
- quick reply options,
- a clear search/action button only when the assistant is ready,
- quota/remaining searches in quiet secondary text.

The first viewport should not contain:

- a marketing hero,
- profile cards before the user gives intent,
- a large “chatbot” box,
- decorative AI branding,
- multiple competing CTAs.

## Core User Loop

1. User opens Home.
2. Matchmaker asks what kind of person feels right today.
3. User replies with text or a quick option.
4. Matchmaker clarifies only when needed.
5. Matchmaker presents one candidate.
6. User opens profile, chooses Interested or Pass.
7. If not right, user gives optional feedback.
8. Matchmaker uses memory to find a better next candidate.
9. If quota is reached, matchmaker keeps helping with low-cost actions.

## Visual Direction

Use the existing StrathSpace restrained palette:

- tinted background,
- tonal surfaces,
- magenta only for primary actions and active states,
- no loud gradients,
- no glassmorphism,
- no badge-heavy gamification.

The physical scene: a student checks the app one-handed between classes, maybe with poor network and low patience. The interface should feel composed, fast, and emotionally clear.

## Build Phases

- Phase 1: Conversation Home Foundation
- Phase 2: Candidate Presentation
- Phase 3: Feedback And Memory UI
- Phase 4: Quota, Empty, Error, And Offline States
- Phase 5: Profile Decision Continuity
- Phase 6: Motion, Polish, And Accessibility
- Phase 7: Admin QA And Rollout Validation

## Success Criteria

- The old swipe-like homepage is no longer the main discovery experience.
- A user understands what to do within three seconds.
- Different intents feel different in the UI and results.
- Candidate cards do not repeat within the same session.
- Interested and Pass work from matchmaker-sourced profiles.
- The UI clearly explains limits without making users feel blocked.
- Loading and failure states never leave a blank homepage.
