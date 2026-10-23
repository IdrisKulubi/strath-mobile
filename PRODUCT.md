# Product

## Register

product

## Users

StrathSpace is for university students who want intentional dating on campus, not endless swipe noise. They use the mobile app in short sessions: checking daily matches, messaging, updating profile and verification, and managing dates. Context is often one-handed, between classes, on the move, with variable network quality.

Internal admins use a separate ops dashboard; they are not the primary design audience. Admin UI should stay clear and efficient, but student-facing mobile quality comes first.

## Product Purpose

Help students discover compatible matches, build trust through verification, and move from match to real-world date with minimal friction. Success means students feel the app is curated and credible, not chaotic or gamified. The product should feel like a serious campus dating tool with a warm, Gen Z-friendly surface, not a novelty feed.

## Brand Personality

Bold. Warm. Playful-premium.

Voice is friendly and direct: no hype, no spammy urgency. Celebrate matches and milestones with tactile moments (swipe, haptics), not carnival UI. Errors and sensitive flows (verification, safety) should feel competent and respectful.

## Anti-references

- Overbusy dating apps: swipe spam, badge farms, confetti on every action, loud gradients on cards.
- Generic SaaS dashboards applied to consumer screens (hero metrics, glassmorphism stacks, modal-first workflows).
- Neon / crypto / Web3 aesthetics on a campus dating product.
- Copying reference mocks literally (different brand, no fake engagement patterns).

Visual and component rules live in root `DESIGN.md` (canonical).

## Design Principles

1. **One pink moment** — At most one pink-filled commit control per screen; structure comes from type and spacing.
2. **Tactile over decorative** — Pills, swipe-to-continue, and haptics signal progress; avoid ornamental chrome.
3. **Personality with purpose** — Emoji and motion clarify choices; do not clutter every surface.
4. **Trust before delight** — Verification, safety, and session reliability outweigh playful chrome.
5. **Content over chrome** — Profiles, matches, and messages are the hero; UI defers to them in the main app.
6. **Mobile-first resilience** — Assume flaky networks; never punish users with auth loops or blank states when recovery is possible.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA** for text and interactive controls.
- Minimum touch targets: **44×44 pt** (iOS) / **48×48 dp** (Android).
- Support system dynamic type / font scaling where feasible.
- Respect **prefers-reduced-motion**; no bounce or elastic easing on core flows.
- High-contrast labels on forms, verification, and error states.
- Every **swipe-to-continue** control must include an equivalent **tap** action for assistive tech and reduced-motion users.
