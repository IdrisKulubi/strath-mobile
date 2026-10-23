# StrathSpace Mobile Polish Plan

**Status:** Approved — implementation in progress (Phases 0–2 largely complete; 3–6 ongoing)  
**Created:** 2026-05-22  
**Register:** Product (student mobile app)  
**Guidance:** [`PRODUCT.md`](../PRODUCT.md) — confident, premium, intentional; Linear/Notion quiet hierarchy  
**Impeccable command:** `polish` (planning phase — no code changes until items are approved)

---

## How to approve

Reply with one of:

- `approve all` — implement every item below in phase order  
- `approve P0-01, P0-02, P1-01…` — implement only listed IDs  
- `approve phase 0` / `approve phase 1` — implement a whole phase  
- `skip P2-04` — exclude specific items  

After approval, run **`/impeccable polish`** (or ask to implement) and work through phases sequentially.

---

## Quality bar

| Setting | Choice |
|--------|--------|
| **Fidelity** | Production-ready polish (not sketch) |
| **Scope** | Full mobile app (`app/`, `components/`, shared tokens) |
| **Out of scope** | Admin dashboard (`backend/strath-backend/src/app/admin/*`), EAS/build config |
| **Target feel** | Quiet hierarchy, one primary action per screen, content over chrome |

---

## Audit summary (current state)

| Finding | Severity | Evidence |
|--------|----------|----------|
| **Three parallel color systems** | P0 | `global.css` HSL tokens, `constants/theme.ts` hex purple/pink, 80+ files with inline hex |
| **Legacy design doc drift** | P0 | `docs/DESIGN.md` = Apple HIG / iOS red; app = purple gradient + magenta CTAs |
| **No root `DESIGN.md`** | P1 | Impeccable loader does not pick up `docs/DESIGN.md` when `PRODUCT.md` is at repo root |
| **Overbusy dating patterns** | P1 | Gradients, celebration screens, swipe stacks, uppercase labels, mission gamification |
| **Mixed styling approaches** | P2 | `StyleSheet.create` + NativeWind `className` in same flows |
| **Debug logging in app routes** | P2 | `console.*` in `index`, `onboarding`, `login`, `verification`, etc. |
| **Hardcoded tab chrome** | P2 | `#8E8E93`, `#fff` in `(tabs)/_layout.tsx` bypass tokens |

---

## Phase 0 — Design foundation (blocker)

> Approve Phase 0 before visual polish on individual screens. Otherwise each screen will be fixed in isolation and drift will return.

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P0-01** | **Generate canonical `DESIGN.md`** | Run impeccable `document` flow: extract real tokens from `global.css`, `constants/theme.ts`, and shared UI; write root `DESIGN.md` in Stitch format; deprecate conflicting values in `docs/DESIGN.md` with a pointer | `DESIGN.md` (new), `docs/DESIGN.md` | S |
| **P0-02** | **Unify color tokens (Restrained strategy)** | Single source of truth: tinted neutrals + one accent ≤10% surface area; migrate `Colors` in `constants/theme.ts` to match `global.css`; remove pure `#000` / `#fff` where feasible | `constants/theme.ts`, `global.css`, `hooks/use-theme.ts` | M |
| **P0-03** | **Typography scale** | Define 5–6 named text roles (display, title, body, caption, label); map to system fonts; ban ad-hoc `fontSize` on new edits | `DESIGN.md`, `components/ui/text.tsx` (new or extend) | M |
| **P0-04** | **Spacing scale** | Document 4/8/12/16/20/24/32 grid; add shared layout primitives (`Screen`, `Section`, `Stack`) | `DESIGN.md`, `components/ui/` | M |

**Phase 0 exit criteria:** Any screen can be styled using tokens only; no new hardcoded hex without justification.

---

## Phase 1 — App shell & global UX

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P1-01** | **Tab bar polish** | Replace hardcoded grays/white; calmer inactive state; badge uses `primary` token; labels sentence case | `app/(tabs)/_layout.tsx` | S |
| **P1-02** | **Root layout & offline** | Align `NoInternetScreen`, `OfflineBanner`, splash handoff with tokens; ensure copy is calm, not alarming | `app/_layout.tsx`, `components/no-internet-screen.tsx`, `components/offline-banner.tsx` | S |
| **P1-03** | **Toast system** | Consistent success/error/info colors from tokens; no gradient backgrounds; readable on dark | `components/ui/toast.tsx` | S |
| **P1-04** | **Loading skeletons** | Unified skeleton color/opacity; match card radii from DESIGN.md | `components/ui/skeleton.tsx`, home/matches loaders | S |
| **P1-05** | **Remove production `console.*`** | Strip or gate debug logs in app entry routes | `app/index.tsx`, `app/onboarding/index.tsx`, `app/(auth)/login.tsx`, `app/verification.tsx`, `app/chat/[matchId].tsx`, `app/settings.tsx`, `app/waitlist.tsx` | S |
| **P1-06** | **Screen gradient audit** | Reduce decorative purple gradients; default screens use flat `background` token (gradient only on auth/intro if approved) | `components/ui/screen-gradient.tsx`, tab screens | M |

**Phase 1 exit criteria:** Shell feels quiet and consistent on every tab; offline states do not feel like logout.

---

## Phase 2 — Auth, intro & onboarding

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P2-01** | **Login** | Quieter background (less glow); one primary CTA; benefits card uses tokens; Apple/Google buttons aligned | `app/(auth)/login.tsx`, `components/auth/*` | M |
| **P2-02** | **Intro / launch** | Tone down `LaunchCelebration` and brand intro motion; ease-out only; respect reduced motion | `components/intro/*`, `components/onboarding/LaunchCelebration.tsx` | M |
| **P2-03** | **Onboarding steps** | Replace inline hex in steps with tokens; reduce uppercase labels; consistent step header/footer | `app/onboarding/index.tsx`, `components/onboarding/*` | L |
| **P2-04** | **Onboarding gamification trim** | Simplify `VibeCheckGame`, `BubblePicker`, `QuickFire` chrome (not removing features; reducing visual noise) | `components/onboarding/VibeCheckGame.tsx`, `BubblePicker.tsx`, `QuickFire.tsx` | M |
| **P2-05** | **Waitlist** | Clear hierarchy, single exit action, token-based surfaces | `app/waitlist.tsx` | S |

**Phase 2 exit criteria:** First-run through onboarding feels premium and fast, not like a game show.

---

## Phase 3 — Core dating loops

### Home & daily matches

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P3-01** | **Home screen** | Header, preference panel, daily list share spacing/type scale; one clear primary action | `app/(tabs)/index.tsx`, `components/home/*` | M |
| **P3-02** | **Match cards** | Flatter cards, less gradient border glow; decision bar states (default/loading/disabled) | `components/home/match-card.tsx`, `pending-decision-bar.tsx`, `date-hold-card.tsx` | M |
| **P3-03** | **Empty & error states** | Helpful copy, no decorative illustration overload | `components/home/empty-matches.tsx` | S |

### Matches, chat & dates

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P3-04** | **Matches hub** | `matches.tsx` is large (670+ lines StyleSheet): split styles to tokens, calm list density, archive sheet | `app/(tabs)/matches.tsx`, `components/matches/*` | L |
| **P3-05** | **Chat** | Message bubbles, input, header from tokens; safety modal inline-first (exhaust sheet alternatives per impeccable) | `app/chat/[matchId].tsx`, `components/chat/*` | M |
| **P3-06** | **Dates tab** | Upcoming/pending/history cards consistent; decision modals copy + hierarchy | `app/(tabs)/dates.tsx`, `components/dates/*` | M |
| **P3-07** | **Vibe check** | High hardcode count; simplify decision UI, clear primary/secondary | `app/vibe-check/[matchId].tsx`, `components/vibe-check/*` | M |

**Phase 3 exit criteria:** Home → match → chat → date path is visually one product, not separate design eras.

---

## Phase 4 — Profile, verification & settings

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P4-01** | **Profile tab** | Hero card, photo grid, chips: token migration; reduce stacked cards | `app/(tabs)/profile.tsx`, `components/profile-tab/*` | M |
| **P4-02** | **Profile view (other user)** | CTA hierarchy; compatibility block readability; photo viewer | `app/profile/[userId].tsx`, `components/profile-view/*` | M |
| **P4-03** | **Edit profile** | Form fields, section cards, save states | `app/edit-profile.tsx`, `components/edit-profile/*` | M |
| **P4-04** | **Verification** | Largest offender (67+ inline colors): restructure into sections; trust-first copy; progress states | `app/verification.tsx` | L |
| **P4-05** | **Settings & legal** | Grouped list style (iOS Settings pattern); consistent rows | `app/settings.tsx`, `app/legal.tsx` | S |

**Phase 4 exit criteria:** Trust-sensitive flows feel competent; verification does not look like a separate app skin.

---

## Phase 5 — Secondary surfaces

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P5-01** | **Wingman / Pulse tab** | Calm feed cards; composer restraint | `app/(tabs)/pulse.tsx`, `components/pulse/*`, `components/wingman/*` | M |
| **P5-02** | **Date kit** | Hero + section cards; reduce gradient hero | `app/(tabs)/date-kit.tsx`, `components/date-kit/*` | S |
| **P5-03** | **Explore / discover (hidden routes)** | Swipe/modal patterns: ensure not overbusy if re-enabled | `app/(tabs)/explore.tsx`, `components/discover/*` | M |
| **P5-04** | **Feedback & app feedback** | Star rating, nudge modal, post-date feedback | `app/feedback/[dateId].tsx`, `app/app-feedback.tsx`, `components/feedback/*` | S |
| **P5-05** | **Digital DNA (if still routed)** | Phase components use heavy custom color; align or hide from prod nav | `components/digital-dna/*` | M |

**Phase 5 exit criteria:** Secondary tabs match shell quality; no neon/gamified outliers.

---

## Phase 6 — Final polish pass

| ID | Item | What changes | Primary files | Effort |
|----|------|--------------|---------------|--------|
| **P6-01** | **Interaction states audit** | Every button/input: default, pressed, disabled, loading, error | Shared `Button`, touchables across app | M |
| **P6-02** | **Motion pass** | 150–300ms ease-out-quart/expo; no bounce; `prefers-reduced-motion` | Animated components | M |
| **P6-03** | **Copy pass** | Sentence case labels; consistent nouns (Match, Date, Verification); no em dashes | All `app/` screens | M |
| **P6-04** | **Accessibility pass** | 44pt targets, contrast AA, accessibilityLabel on icon-only controls | High-traffic screens | M |
| **P6-05** | **Anti-pattern sweep** | Remove side-stripe borders, gradient text, decorative glass, hero-metric mini-stats where not needed | Grep-driven fixes | S |

**Phase 6 exit criteria:** Impeccable polish checklist (see `.agents/skills/impeccable/reference/polish.md`) satisfied on core flows.

---

## Explicit anti-goals (will not do unless you ask)

- Rebrand to light-only or remove dark mode  
- Remove Wingman, Pulse, missions, or swipe discovery features (only visual quieting)  
- Admin dashboard redesign  
- Backend/API changes  
- New illustrations or marketing landing pages  

---

## Recommended default approval

If you want the highest impact with least risk, approve:

```text
approve P0-01, P0-02, P1-01, P1-02, P1-05, P1-06, P3-01, P3-04, P4-04, P6-03
```

That sequence establishes tokens, fixes the shell, polishes home + matches + verification, and finishes with copy consistency.

---

## After implementation

1. Re-run `node .agents/skills/impeccable/scripts/load-context.mjs` (should show `hasDesign: true`).  
2. Ship via OTA for JS/UI-only changes (per your existing release notes).  
3. Optional: `/impeccable critique app/(tabs)` for a scored review of the result.

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 2026-05-22 | Impeccable teach + polish plan | Initial plan from codebase audit |
