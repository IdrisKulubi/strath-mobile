# StrathSpace project instructions

## Design direction

The user approved **Option 1: Rising sheet** on 2026-09-24. Preserve this direction in future design, coding, review, and fix tasks without requiring the user to repeat it.

Before UI work, read:
1. [DESIGN.md](DESIGN.md) for shared visual tokens.
2. [Onboarding design contract](docs/onboarding-redesign/design-contract.md) for the approved onboarding interaction and reference image.
3. [Master tracker](docs/onboarding-redesign/master.md) and the requested phase document for scope, dependencies, and current evidence.

Use the same shared visual language elsewhere in the mobile app, but the rising-sheet interaction is specific to onboarding. Backend-only work does not require an unrelated UI redesign.

## Working agreement

- Implement only the requested phase or explicitly requested fix. A request to continue the redesign means the next eligible incomplete phase in the master tracker, one phase per task unless the user explicitly requests more.
- Read actual code and preserve existing user changes. Never reset or overwrite unrelated work.
- Reuse and evolve existing components, theme tokens, auth, upload, verification, and questionnaire contracts.
- One active prompt at a time. Follow-ups arrive automatically. No importance slider, accumulated questionnaire form, or More menu hiding visibility/context.
- Single-choice taps advance after clear feedback; multi-select and text input use Continue. Final saves, consent, permissions, and destructive actions remain explicit.
- The generated image is a visual reference, not executable specification. Written design contract wins over invented mockup copy and artifacts.
- Preserve scoring values, privacy, adult eligibility, routing, and existing user data. No silent backend or product-rule changes.
- Before ending a phase task, update its checklist and evidence, then master status, blockers, and next action. Mark Done only after the stated acceptance checks pass. Record unavailable checks honestly.
- Do not start the next phase automatically after completing the requested phase. Finish with the result, validation, remaining limits, and next phase.
- Current user instructions can change scope or design. Record an explicit design change in the contract and decision log; never treat these files as higher priority than the user's request.

## Verification

Run checks relevant to changed behavior from this repository directory. Known scripts: `npm run lint`, `npm run test:questionnaire-ui`, `npm run typecheck:questionnaire`. The last command covers the questionnaire only, not every onboarding/auth file. Inspect TypeScript configuration for broader changes and report existing baseline failures separately. Visual evidence must come from the implemented UI; generated concept images do not prove completion.

Guidance uses Codex's project instruction mechanism: [official AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md). This file guides work; it is not an automated CI enforcement mechanism.
