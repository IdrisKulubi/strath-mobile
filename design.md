# StrathSpace Design System
*Inspired by Apple's Human Interface Guidelines*

---

## Design Principles

### 1. **Clarity**
- Content is paramount; interface elements should never compete with content
- Use negative space strategically to draw attention to important elements
- Ensure legibility at all sizes with system fonts and proper contrast

### 2. **Deference**
- UI should subtly guide users without distracting from content
- Animations should be purposeful and feel natural
- Transitions should maintain context and provide feedback

### 3. **Depth**
- Use layers to establish hierarchy and communicate relationships
- Subtle shadows and translucency create depth without distraction
- Motion and parallax reinforce the perception of depth

---

## Color System

### Primary Palette
```
Primary:     #FF3B30  (Vibrant Red/Pink - for CTAs, highlights)
Secondary:   #007AFF  (iOS Blue - for links, secondary actions)
Success:     #34C759  (Green - confirmations, success states)
Warning:     #FF9500  (Orange - warnings, alerts)
Error:       #FF3B30  (Red - errors, destructive actions)
```

### Neutral Palette
```
Dark Mode (Default):
  Background:       #000000  (Pure Black)
  Card Background:  #1C1C1E  (Elevated Dark)
  Border:           #38383A  (Subtle Separator)
  Muted Text:       #8E8E93  (Secondary Text)
  Foreground Text:  #FFFFFF  (Primary Text)

Light Mode:
  Background:       #F2F2F7  (Light Gray)
  Card Background:  #FFFFFF  (Pure White)
  Border:           #C6C6C8  (Subtle Separator)
  Muted Text:       #8E8E93  (Secondary Text)
  Foreground Text:  #000000  (Primary Text)
```

### Usage Guidelines
- **Primary:** Use sparingly for key CTAs and important interactive elements
- **Neutral:** Use for 90% of the interface to maintain focus on content
- **Semantic Colors:** Use only for their specific purposes (success, warning, error)

---

## Typography

### Font Family
- **System Font:** SF Pro (iOS) / Roboto (Android)
- **Reason:** Platform-native fonts feel familiar and render perfectly

### Type Scale
```
Display:    34px / 41px line-height / Bold (700)
Title 1:    28px / 34px line-height / Bold (700)
Title 2:    22px / 28px line-height / Bold (700)
Title 3:    20px / 25px line-height / Semibold (600)
Headline:   17px / 22px line-height / Semibold (600)
Body:       17px / 22px line-height / Regular (400)
Callout:    16px / 21px line-height / Regular (400)
Subhead:    15px / 20px line-height / Regular (400)
Footnote:   13px / 18px line-height / Regular (400)
Caption 1:  12px / 16px line-height / Regular (400)
Caption 2:  11px / 13px line-height / Regular (400)
```

### Typography Rules
1. **Never use more than 3 font sizes per screen**
2. **Maintain 4:3 size ratio between hierarchy levels**
3. **Use Bold (700) for emphasis, Semibold (600) for headers, Regular (400) for body**
4. **Text color should have minimum 4.5:1 contrast ratio**
5. **Line height = font size × 1.2 to 1.5**

---

## Spacing & Layout

### Spacing Scale (8pt Grid System)
```
4px   - Micro spacing (icon padding, tight elements)
8px   - Tight spacing (between related items)
12px  - Compact spacing (card padding, form fields)
16px  - Base spacing (default margin/padding)
20px  - Comfortable spacing (section padding)
24px  - Generous spacing (between sections)
32px  - Large spacing (screen padding)
40px  - Extra large spacing (major sections)
48px  - Huge spacing (screen headers)
```

### Layout Principles
1. **Screen Padding:** 20px horizontal, 16px vertical minimum
2. **Card Padding:** 16px all sides
3. **List Item Height:** Minimum 50px (touch-friendly)
4. **Maximum Content Width:** 100% on mobile
5. **Safe Areas:** Always respect device safe areas (notch, home indicator)

---

## Components

### Cards
```
Style: Inset Grouped (iOS Settings style)
- Background: Card color from theme
- Border Radius: 12px
- Border: 2px solid border color (visible in dark mode, subtle in light)
- Padding: 16px
- Shadow: None (rely on borders for definition)
- Margin: 12px between cards
```

### Buttons

#### Primary Button
```
Background: Primary color
Text: White / Bold / 17px
Padding: 16px horizontal, 12px vertical
Border Radius: 12px
Min Height: 50px
Active State: Opacity 0.6
```

#### Secondary Button
```
Background: Transparent
Text: Primary color / Semibold / 17px
Border: 2px solid primary color
Padding: 16px horizontal, 12px vertical
Border Radius: 12px
Min Height: 50px
Active State: Background = Primary color + 10% opacity
```

#### Text Button
```
Background: Transparent
Text: Primary color / Regular / 17px
Padding: 8px horizontal
Active State: Opacity 0.6
```

### Form Inputs

#### Text Input
```
Background: Card background
Border: 1px solid border color
Border Radius: 12px
Padding: 12px 16px
Font: Body (17px Regular)
Height: 50px minimum
Focus State: Border = Primary color, Border Width = 2px
```

#### Selection Input (Dropdown style)
```
Layout: Label on left (110px width) | Value on right | Chevron
Background: Card background
Border Bottom: Hairline width
Height: 50px
Font: Body (17px Regular)
Selected Value: Primary color
Placeholder: Muted color
```

### Modal Sheets

#### Bottom Sheet (Selection Sheet)
```
Position: Bottom of screen
Background: Card background + Blur
Border Radius: 24px (top corners only)
Max Height: 80% of screen
Handle: 4px × 36px / Border color / 4px radius / Top center
Padding: 20px
Shadow: Large elevation shadow
```

#### Full Screen Modal
```
Background: Screen background
Animation: Slide up from bottom (300ms ease-out)
Close Button: Top-left or top-right
Safe Area: Respect all safe areas
```

---

## Interactions & Animations

### Timing Functions
```
Ease Out: Most animations (entering screen, appearing)
Ease In: Dismissals (leaving screen, disappearing)
Ease In-Out: Transformations (size changes, rotations)
Spring: Delightful interactions (bouncy feel)
```

### Duration Guidelines
```
Micro:   100-200ms  (Hover states, small transitions)
Short:   200-300ms  (Button presses, modal appearances)
Medium:  300-400ms  (Screen transitions, sheet slides)
Long:    400-600ms  (Complex animations, loading states)
```

### Standard Animations

#### Button Press
```
Scale: 0.95
Duration: 100ms
Timing: Ease Out
Haptic: Light Impact
```

#### Modal Appear
```
Transform: translateY(100%) → translateY(0)
Opacity: 0 → 1
Duration: 300ms
Timing: Ease Out
Haptic: Medium Impact
```

#### Selection
```
Background: Highlight color (Primary + 10% opacity)
Border: 2px solid Primary
Duration: 200ms
Timing: Ease Out
Haptic: Selection
```

#### Loading State
```
Skeleton: Pulsing animation (opacity 0.3 → 0.6 → 0.3)
Duration: 1500ms loop
Blur: Apply during loading
```

### Haptic Feedback
- **Light Impact:** Button taps, toggles
- **Medium Impact:** Selection confirmations, modal opens
- **Heavy Impact:** Destructive actions, errors
- **Selection:** List item selections, segmented control changes
- **Success:** Action completed successfully
- **Warning:** Validation issues
- **Error:** Critical errors, failed actions

---

## Iconography

### Icon Style
- **System Icons:** SF Symbols (iOS) / Material Icons (Android)
- **Size:** 20px (small), 24px (default), 28px (large), 32px (x-large)
- **Weight:** Regular (400) by default, match text weight when inline
- **Color:** Match text color or use semantic colors

### Icon Usage
1. **Always align icons with text baseline**
2. **Maintain 8px minimum padding around touch targets**
3. **Use filled icons for active/selected states**
4. **Use outlined icons for inactive/default states**
5. **Never use more than 2-3 icon styles per screen**

---

## User Experience Guidelines

### Navigation
1. **Hierarchy:** Tab Bar (primary) → Stack Navigation (secondary) → Modal (temporary)
2. **Back Button:** Always on top-left, labeled with previous screen name
3. **Max Depth:** 3 levels deep before offering alternative navigation
4. **Gestures:** Support swipe-back on all stack navigations

### Content
1. **Progressive Disclosure:** Show essential info first, reveal details on interaction
2. **Empty States:** Always provide helpful guidance and next steps
3. **Error States:** Be specific about what went wrong and how to fix it
4. **Loading States:** Use skeletons for content, spinners for actions

### Feedback
1. **Immediate:** Visual feedback within 100ms of interaction
2. **Contextual:** Show feedback where the action occurred
3. **Clear:** State changes should be obvious (selected, disabled, loading)
4. **Reversible:** Allow undo for destructive actions when possible

### Accessibility
1. **Touch Targets:** Minimum 44×44 points (iOS) / 48×48 dp (Android)
2. **Contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for UI)
3. **Labels:** All interactive elements need accessible labels
4. **Dynamic Type:** Support system font scaling
5. **Voice Over:** Test with screen readers regularly

---

## Platform-Specific Patterns

### iOS Patterns to Follow
- **Navigation Bar:** Large titles on scrolling screens
- **Inset Grouped Lists:** For forms and settings
- **Context Menus:** Long-press for additional options
- **Segmented Controls:** For view switching
- **Sheets:** Bottom sheets for selections and actions

### Android Patterns to Adapt
- **FAB:** Use sparingly, only for primary actions
- **Snackbar:** For brief feedback at bottom of screen
- **Bottom Navigation:** Translate iOS tab bar style

---

## Photo & Media Guidelines

### Photo Cards
```
Aspect Ratio: 1:1 (square) or 4:5 (portrait)
Border Radius: 16px
Border: 2px solid border color
Placeholder: Icon + descriptive text + background
Overlay: Semi-transparent (30% black) on hover/active
Edit Indicator: Pencil icon, centered, white
```

### Grid Layouts
```
2 Column: 48% width each, 4% gap
3 Column: 31% width each, 3.5% gap
Padding: Match screen padding (20px)
Spacing: 12px gap between items
```

---

## Design Checklist

Before shipping any screen, verify:

- [ ] Uses system typography scale (max 3 sizes)
- [ ] Follows 8pt spacing grid
- [ ] Touch targets are minimum 44×44pt
- [ ] Text contrast is 4.5:1 minimum
- [ ] Respects safe areas (notch, home indicator)
- [ ] Animations are under 400ms
- [ ] Haptic feedback on key interactions
- [ ] Loading and error states designed
- [ ] Empty states designed
- [ ] Dark mode looks great
- [ ] Tested with dynamic type (larger text sizes)
- [ ] Works on smallest supported device

---

## Resources

### Official Guidelines
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io)

### Tools
- [Figma](https://figma.com) - Design mockups
- [SF Symbols](https://developer.apple.com/sf-symbols/) - iOS icons
- [React Native Paper](https://reactnativepaper.com) - Component library

### Inspiration
- **Apps to Study:** Apollo (Reddit), Halide (Camera), Things (Tasks), Reeder (RSS)
- **Key Principle:** Less is more. Remove elements until it breaks, then add one back.

---

*Last Updated: 2025-11-28*
