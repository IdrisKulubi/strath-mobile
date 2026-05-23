# Product

## Register

product

## Users

StrathSpace is for university students who want intentional dating on campus, not endless swipe noise. They use the mobile app in short sessions: checking daily matches, messaging, updating profile and verification, and managing dates. Context is often one-handed, between classes, on the move, with variable network quality.

Internal admins use a separate ops dashboard; they are not the primary design audience. Admin UI should stay clear and efficient, but student-facing mobile quality comes first.

## Product Purpose

Help students discover compatible matches, build trust through verification, and move from match to real-world date with minimal friction. Success means students feel the app is curated and credible, not chaotic or gamified. The product should feel like a serious campus dating tool, not a novelty feed.

## Brand Personality

Confident. Premium. Intentional.

Voice is direct and calm: no hype, no spammy urgency. Celebrate matches and milestones without carnival UI. Errors and sensitive flows (verification, safety) should feel competent and respectful.

## Anti-references

- Overbusy dating apps: swipe spam, badge farms, confetti on every action, loud gradients on cards.
- Generic SaaS dashboards applied to consumer screens (hero metrics, glassmorphism stacks, modal-first workflows).
- Neon / crypto / Web3 aesthetics on a campus dating product.

Note: `docs/DESIGN.md` still describes an Apple HIG / iOS-red direction from an earlier pass. New mobile work should move toward the quieter Linear / Notion reference below; run `/impeccable document` to reconcile tokens with the codebase.

## Design Principles

1. **Quiet hierarchy** — One primary action per screen; typography and spacing carry structure, not decoration.
2. **Premium restraint** — Color and motion are earned; avoid the visual density of mainstream dating apps.
3. **Trust before delight** — Verification, safety, and session reliability outweigh playful chrome.
4. **Content over chrome** — Profiles, matches, and messages are the hero; UI defers to them.
5. **Mobile-first resilience** — Assume flaky networks; never punish users with auth loops or blank states when recovery is possible.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA** for text and interactive controls.
- Minimum touch targets: **44×44 pt** (iOS) / **48×48 dp** (Android).
- Support system dynamic type / font scaling where feasible.
- Respect **prefers-reduced-motion**; no bounce or elastic easing on core flows.
- High-contrast labels on forms, verification, and error states.
