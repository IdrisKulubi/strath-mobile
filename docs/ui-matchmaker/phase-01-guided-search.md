# Phase 1: Guided Search Entry

## Goal

Make the Wingman tab immediately useful by adding an AI Matchmaker flow that searches the backend profile intelligence index and returns explained candidates.

## Scope

- `types/matchmaker.ts` defines the mobile response contract.
- `hooks/use-matchmaker.ts` owns the API call and data unwrapping.
- `components/matchmaker/matchmaker-panel.tsx` owns the prompt, quick prompts, states, and results shell.
- `components/matchmaker/matchmaker-candidate-card.tsx` owns candidate rendering.
- `app/(tabs)/pulse.tsx` only embeds the panel and handles profile navigation.

## Test Checklist

- User can enter a natural-language preference and submit.
- Quick prompts submit without additional typing.
- Loading, error, empty, and result states render without layout jumps.
- Candidate card opens `/profile/[userId]`.
- The old friend Wingman pack remains available below the new matchmaker panel.
