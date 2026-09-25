---
name: StrathSpace Mobile
description: Dark-first playful-premium dating UI — pills, one pink moment, tactile commit controls
colors:
  background-dark: "#0D0B0D"
  background-light: "#F5F2F4"
  sheet-dark: "#151215"
  sheet-light: "#FFFFFF"
  control-dark: "#1E1A1E"
  control-light: "#EDE9EC"
  control-border-dark: "#2E292E"
  control-border-light: "#D8D2D6"
  control-active-dark: "#2A252A"
  control-active-light: "#E4DEE2"
  foreground-dark: "#F7F3F5"
  foreground-light: "#1A1418"
  primary-dark: "#E0186A"
  primary-light: "#C41258"
  primary-text-dark: "#FF5C97"
  primary-text-light: "#B8327A"
  muted-foreground-dark: "#A8A0A5"
  muted-foreground-light: "#6B6368"
  success: "#3DB87A"
  warning: "#E0A040"
  destructive: "#E05A5A"
typography:
  display:
    fontFamily: System
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.23
  title:
    fontFamily: System
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: System
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: System
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.38
  overline:
    fontFamily: System
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "1px"
    textTransform: uppercase
rounded:
  pill: "9999px"
  row: "16px"
  sheet: "32px"
  sm: "8px"
spacing:
  micro: "4px"
  tight: "8px"
  compact: "12px"
  base: "16px"
  comfortable: "20px"
  section: "24px"
  large: "32px"
  xl: "40px"
  screen-x: "20px"
  sheet-inner: "24px"
heights:
  primary-control: "56px"
  input: "48px"
  option-row: "56px"
  touch-min: "44px"
components:
  swipe-to-continue:
    track: "{colors.primary-dark}"
    knob: "{colors.foreground-dark}"
    height: "{heights.primary-control}"
    radius: "{rounded.pill}"
  option-row:
    fill: "{colors.control-dark}"
    border-selected: "{colors.primary-dark}"
    radius: "{rounded.row}"
---

## Overview

### Approved onboarding direction (2026-09-24)

The user selected **Option 1: Rising sheet** for the entire mobile onboarding redesign. Read the [onboarding design contract](docs/onboarding-redesign/design-contract.md) for the authoritative sequential interaction and [master tracker](docs/onboarding-redesign/master.md) for implementation status. This file remains the shared visual-token reference. For onboarding, the contract overrides older combined-form layouts: one active prompt, automatic follow-ups, named importance tap choices, and optional context in the normal sequence. Implement only the requested phase. Existing components are not evidence that a redesign phase is complete.

StrathSpace mobile is **dark-first, warm, and tactile**. Surfaces are near-black with a soft smoky backdrop on auth and onboarding; content often sits on a raised **sheet** with large top corners. Shapes are **pills and circles**. One **hot pink** filled control carries the main action per screen; links and headline accents use **primary text** pink on dark surfaces.

Personality comes from **3D emoji or simple icons**, motion, and swipe-to-commit controls, not from decorative gradients or card stacks. See `PRODUCT.md` for voice and strategy.

**Implementation (read before shipping UI):** `lib/design-tokens.ts`, `constants/theme.ts`, `hooks/use-theme.ts`. Add missing tokens to code the first time a screen needs them. Never inline hex in feature components.

## Color strategy

**Committed accent:** one pink-filled control per screen (swipe track or primary pill). Everything else stays on tinted neutrals.

| Token | Dark | Light | Usage |
|-------|------|-------|--------|
| `background` | `#0D0B0D` | `#F5F2F4` | Full-screen base; subtle warm tint, never `#000` |
| `sheet` | `#151215` | `#FFFFFF` | Raised sheet (auth/onboarding); top radius `sheet` |
| `control` | `#1E1A1E` | `#EDE9EC` | Inputs, option rows, OTP cells, toggle track |
| `controlBorder` | `#2E292E` | `#D8D2D6` | Borders, inactive progress segments |
| `controlActive` | `#2A252A` | `#E4DEE2` | Selected segment in toggles |
| `foreground` | `#F7F3F5` | `#1A1418` | Primary text |
| `muted` | `#A8A0A5` | `#6B6368` | Captions, hints, Skip |
| `primary` | `#E0186A` | `#C41258` | Filled buttons, badge, swipe track (AA on white label text) |
| `primaryText` | `#FF5C97` | `#B8327A` | Links, Resend, one accent word in display headlines |
| `success` / `warning` / `destructive` | see frontmatter | | Semantic only |

Optional **smoky backdrop** on auth/onboarding: very low-contrast noise or soft radial tint on `background` only. Not glassmorphism. In-app tabs use flat `background` without texture.

## Typography

System font only (SF Pro / Roboto). Max **four roles** visible on one screen (usually display or title, body, caption, overline).

| Role | Size / weight | Use |
|------|----------------|-----|
| **display** | 26 / 700 | Auth & onboarding headlines; **centered** |
| **title** | 20 / 600 | App name bar, sheet titles, in-app section headers (left-aligned) |
| **body** | 15 / 400–600 | Labels, inputs, option text |
| **caption** | 13 / 400 | Supporting copy; often centered + muted on onboarding |
| **overline** | 12 / 600 uppercase | **Only** step labels, e.g. `STEP 1 OF 3` |

- **Accent word in display:** one word or short phrase in `primaryText`, solid color (never gradient text).
- **Sentence case** everywhere except overlines.
- **No em dashes** in product copy.

## Shape and spacing

| Radius | Value | Use |
|--------|-------|-----|
| `pill` | full | Buttons, inputs, toggles, progress segments, swipe track |
| `row` | 16px | Option rows |
| `sheet` | 32px | Top corners of content sheet |
| Circle | 50% | Brand badge, OTP, social buttons, back control |

| Height | px | Use |
|--------|-----|-----|
| Primary / swipe | 56 | Main commit control |
| Input / toggle | 48 | Fields and segmented control |
| Option row | 56 | Selectable list rows |
| Touch minimum | 44 | All interactive targets |

Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40. Screen horizontal padding **20**; sheet inner padding **24**.

## Layout patterns

### Auth and onboarding

1. Top: progressive blur overlay with back (translucent circle) or centered app name (`title`), plus optional progress. Sheet content scrolls beneath the fade.
2. **Sheet** fills the viewport with `sheet` top radius; smoky `background` may show above the sheet edge on entry flows.
3. **Brand badge** (56px `primary` circle + white icon) above headline.
4. **Overline** + **display** (optional accent word) + **caption**.
5. Form content (options, inputs, OTP).
6. **Primary control pinned** above safe area (swipe-to-continue or secondary pill until valid).

### In-app (Discover, messages, profile)

- Same tokens and components; **left-aligned** `title` / `body` hierarchy.
- No sheet lift or textured backdrop unless a full-screen modal flow.
- Still **one pink-filled control** per screen when a commit action exists.

## Component catalogue

### Step progress

- **Anatomy:** 3–5 horizontal pill segments; filled = `primary`, empty = `controlBorder` on `background`.
- **Chrome:** `Skip` as `muted` text button, min 44pt, top trailing.
- **States:** default, complete (all segments filled for final step).

### Brand badge

- 56×56 circle, fill `primary`, centered white line icon (logo mark).
- Sits 24px below sheet top (or below app name on flat screens).

### Option row

For the approved Rising onboarding variant, use a raised `controlActive` row when idle and the `sheet` tone with a 1px `primary` outline when selected. Keep the trailing radio dot or checkbox check and a 56px minimum row height. Add a leading emoji or icon only when the option has a meaningful one.

- **Anatomy:** leading 3D emoji or 24px icon, `body` 600 label, trailing radio ring (24px).
- **Default:** fill `control`, border `controlBorder`, radius `row`, height 56.
- **Selected:** border 1px `primary`, radio ring `primary` with inner fill; background stays `control`.
- **Disabled:** opacity 0.45.
- **Press:** haptic selection; no auto-advance unless flow specifies it.

### Pill input

- Label: `body` 600 `foreground` above field.
- Field: height 48, radius `pill`, fill `control`, border `controlBorder`, text `foreground`.
- **Focus:** border `primary` (1px).
- **Error:** border `destructive`, caption below in `destructive`.
- **Disabled:** opacity 0.45.
- Trailing icon (e.g. password visibility) in `muted`, 44pt hit area.

### Segmented toggle

- Pill track `control`, height 48, padding 4.
- Segments: active fill `controlActive`, inactive transparent; label `body` 600.
- Use for Log in / Sign up and similar binary choices.

### Swipe-to-continue

- **Use for:** only flows that explicitly call for a swipe interaction. The approved Rising onboarding action is a tap pill, including commits.
- **Anatomy:** full-width pill track `primary`, height 56; white circular knob (heart icon) on the left; centered label `foreground` on track; chevrons on the right.
- **Interaction:** drag knob past threshold to fire action; **always** provide tap-to-commit fallback and `accessibilityActions`.
- **Complete:** light impact + success notification haptic; ease-out snap (no spring).
- **Reduced motion:** tap-only, no drag animation.

### Secondary pill (pre-commit)

The approved Rising onboarding action pill now floats above the sheet on Continue and explicit save/consent steps. Use liquid glass (`GlassView` with `risingGlassTint` / blur fallback with `risingGlassOverlay`), `controlBorder` hairline, soft shadow, pink circular heart (or task icon) on the left, centered label, and paired chevrons on the right. It is a tap control; chevrons do not imply that a swipe is required. Preserve disabled, loading, and accessibility states.

- Floating glass pill, height 56 minimum, inset from screen gutters; content scrolls beneath.
- Pink heart circle on the left.
- Label centered, `muted` when disabled, `foreground` when enabled.
- Stays a tap action when the step becomes valid.

### Primary pill button

- Outside Rising onboarding, non-commit actions or flows that call for a filled control may use `primary`, height 56, radius `pill`, label `primaryForeground` 600.
- Only one pink-filled control visible per screen (swipe **or** primary pill, not both).

### OTP input

- Six circles, 48×48 (or 52), fill `control`, border `controlBorder`.
- **Focus:** ring 2px `primary`.
- Digit `title` weight centered.

### Circle buttons

- Social login and back: 44×44 minimum, fill `control`, border `controlBorder`, icon `foreground`.

### Text link

- `primaryText`, `body` 600, no underline by default (underline allowed in long body prose only).

## Motion

- Duration **150–250ms**, easing **ease-out-quart** (or expo-out). No bounce or elastic on core flows.
- Swipe knob follows finger; release uses ease-out snap.
- Beat reveals (e.g. questionnaire follow-ups): opacity + translateY(12) max, disabled when reduced motion.
- Haptics: `selectionAsync` on option pick; impact on save; `notificationAsync(Success)` on step/chapter complete.

## Elevation

- Prefer tonal layers (`background` → `sheet` → `control`) over shadows.
- No decorative glassmorphism. Hairline borders use `controlBorder`.

## Bans

- Gradient text (`background-clip: text`).
- Glass cards as default chrome.
- Side-stripe colored borders on rows or alerts.
- Nested cards (card inside bordered card).
- Confetti, badge farms, swipe spam feeds.
- Pure `#000` / `#fff` on large fields.
- Em dashes in copy.
- More than **one** pink-**filled** control per screen.
- ALL CAPS except **overline** step labels.

## Do's and don'ts

**Do**

- Read this file before any UI change; align new tokens in `lib/design-tokens.ts` first.
- Use `useTheme().colors` in StyleSheet code.
- Center display headlines on auth/onboarding; left-align in main app.
- Offer tap fallback for every swipe control.

**Don't**

- Copy Flareo literally (different product name, no fake swipe spam).
- Use neon/crypto palette or SaaS hero-metric layouts.
- Add emoji to every row; use when the option benefits from quick recognition.

## Code alignment (migration map)

Tokens below are **specified here**; code may still expose legacy names until migrated.

| DESIGN.md token | Target in code |
|-----------------|----------------|
| `background`, `sheet`, `control`, `controlBorder`, `controlActive` | `Palette.dark` / `Palette.light` in `lib/design-tokens.ts`; mirror in `constants/theme.ts` `Colors` |
| `primary`, `primaryText`, `primaryForeground` | `primary`, new `primaryText`, `primaryForeground` on palette |
| `foreground`, `muted` | `foreground`, `mutedForeground` |
| `rounded.pill`, `row`, `sheet` | extend `RADIUS` in `lib/design-tokens.ts` |
| `heights.*` | new `HEIGHTS` export or `TYPOGRAPHY` companion in `lib/design-tokens.ts` |
| SwipeToContinue, OptionRow (design), OtpInput, SegmentedToggle | future `components/design-system/*` (not yet in repo) |
| Questionnaire primitives | `components/questionnaire/*` — restyle to this doc in a follow-up pass |

Legacy `docs/design.md` is deprecated; this file is canonical.
