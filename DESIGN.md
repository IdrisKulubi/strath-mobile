---
name: StrathSpace Mobile
description: Quiet premium campus dating — restrained tokens, content-first layouts
colors:
  background-dark: "#141118"
  background-light: "#F7F6F9"
  surface-card-dark: "#221C2A"
  surface-card-light: "#FFFFFF"
  foreground-dark: "#F5F3F8"
  foreground-light: "#1C1524"
  primary: "#D94A8F"
  primary-light: "#B8327A"
  muted-foreground: "#A39DAD"
  border-dark: "#322A3D"
  success: "#3DB87A"
  warning: "#E0A040"
  destructive: "#E05A5A"
typography:
  display:
    fontFamily: "System"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.21
  title:
    fontFamily: "System"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "System"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.375
  caption:
    fontFamily: "System"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.38
  label:
    fontFamily: "System"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  micro: "4px"
  tight: "8px"
  compact: "12px"
  base: "16px"
  comfortable: "20px"
  section: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card-surface:
    backgroundColor: "{colors.surface-card-dark}"
    rounded: "{rounded.md}"
    padding: "16px"
---

## Overview

StrathSpace mobile uses a **restrained** color strategy: tinted neutrals carry most surfaces; magenta accent appears on primary actions and key highlights only. Visual direction follows Linear/Notion-style quiet hierarchy — typography and spacing define structure, not gradients or gamification chrome.

Students use the app in short, one-handed sessions between classes. Screens should feel calm, credible, and fast. See `PRODUCT.md` for strategic principles.

Implementation sources: `lib/design-tokens.ts`, `constants/theme.ts`, `global.css`, `useTheme()`.

## Colors

| Role | Dark | Light | Usage |
|------|------|-------|--------|
| Background | `#141118` | `#F7F6F9` | Screen base (flat default) |
| Card | `#221C2A` | `#FFFFFF` | Grouped content |
| Primary | `#D94A8F` | `#B8327A` | One CTA per screen |
| Muted text | `#A39DAD` | `#5C5668` | Secondary copy |
| Border | `#322A3D` | `#DDD9E4` | Hairlines, inputs |

Never use pure `#000` or `#fff` for large fields. Semantic greens/ambers/reds only for success, warning, error.

Gradients are **opt-in** (auth/intro only), not the default screen background.

## Typography

Max **three sizes** per screen. Prefer roles: display → title → body → caption.

- **Sentence case** for labels (not ALL CAPS section headers).
- **No em dashes** in product copy.
- System fonts only (SF Pro / Roboto).

## Elevation

Flat, tonal layering. Cards use 1px border + subtle fill, not heavy shadow stacks. No decorative glassmorphism. Focus rings use `ring` token.

## Components

- **Screen**: `components/ui/screen.tsx` — safe area + background token
- **Button**: `components/ui/button.tsx` — variants: default, outline, ghost, destructive
- **Text**: `components/ui/text.tsx` — h1–h4, body, muted, caption, label
- **Toast**: token-based surfaces, ease-out motion (no spring)
- **Skeleton**: muted fill, subtle shimmer

Touch targets: minimum 44×44 pt.

## Do's and Don'ts

**Do**

- Use `useTheme().colors` or `lib/design-tokens` in StyleSheet code
- One primary action per screen
- Show loading/error/empty inline before modals

**Don't**

- Inline hex colors in feature components (drift)
- Side-stripe colored borders on cards
- Gradient text, hero-metric stat grids, bounce animations
- Overbusy dating patterns (confetti, badge farms, swipe spam chrome)

Legacy reference: `docs/DESIGN.md` (Apple HIG draft) is deprecated; this file is canonical.
