# Phase 1: Conversation Home Foundation

## Goal

Make Home feel like the matchmaker is the primary discovery experience, not a small chat widget.

## Scope

- Replace the visible old daily-card homepage surface with the matchmaker conversation.
- Keep legacy homepage code available but not primary.
- Create a strong matchmaker screen structure:
  - greeting,
  - assistant status,
  - message timeline,
  - quick replies,
  - composer,
  - quota hint.
- Use the current `MatchmakerConversation` as the base, but refine layout and hierarchy.

## UX Requirements

- The first assistant message should feel personal and specific.
- Quick replies should be readable one-handed.
- The text input should not dominate the screen before the user needs it.
- The quota hint should be visible but quiet.
- The top of Home should not feel like a chatbot product.

## Components

- `components/matchmaker/matchmaker-conversation.tsx`
- `app/(tabs)/index.tsx`
- optional: `components/matchmaker/matchmaker-home-shell.tsx`

## States

- loading conversation,
- active greeting,
- awaiting user intent,
- awaiting backend response,
- API error with retry.

## Acceptance Criteria

- Opening Home shows the matchmaker as the main experience.
- The user can start with a quick reply or typed message.
- The layout works on small phones without clipped text.
- No old profile stack appears above the matchmaker.

## Implementation Notes

- Added `MatchmakerHomeShell` as the Home-specific matchmaker wrapper.
- Updated the Home tab to render the matchmaker shell while keeping the legacy Home implementation in the file.
- Simplified the conversation header into a quiet status row with a visible daily search quota.
- Converted quick replies into wrap-friendly chips for one-handed use.
- Kept the typed composer available, but visually secondary to the guided replies and match search action.
