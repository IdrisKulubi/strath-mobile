# Strathspace — Product Redesign Design Document

> **Philosophy:** A smart matchmaker helping you meet the right person.
> Not social media. Not a swipe casino. Not a messaging platform.
> **The goal is real-world dates.**

**Pipeline:** Profile → Compatibility → Date Request → Mutual Accept → 3-Min Call → Real Date → Feedback

---

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## Table of Contents

1. [Navigation Restructure](#1-navigation-restructure)
2. [Onboarding Overhaul](#2-onboarding-overhaul)
3. [Home Screen — Daily Matches](#3-home-screen--daily-matches)
4. [Profile View Screen](#4-profile-view-screen)
5. [Date Request Flow](#5-date-request-flow)
6. [Receiving a Date Request](#6-receiving-a-date-request)
7. [Mutual Match Screen](#7-mutual-match-screen)
8. [3-Minute Call (Vibe Check)](#8-3-minute-call-vibe-check)
9. [Post-Call Confirmation](#9-post-call-confirmation)
10. [Dates Tab — Upcoming Dates](#10-dates-tab--upcoming-dates)
11. [Post-Date Feedback](#11-post-date-feedback)
12. [Wingman Feature](#12-wingman-feature)
13. [Compatibility Algorithm](#13-compatibility-algorithm)
14. [Admin Dashboard (Web)](#14-admin-dashboard-web)
15. [Push Notifications](#15-push-notifications)
16. [UI/UX Design System](#16-uiux-design-system)
17. [Metrics & Analytics](#17-metrics--analytics)
18. [Backend Changes](#18-backend-changes)
19. [Future Automation (Post-Validation)](#19-future-automation-post-validation)

---

## 1. Navigation Restructure

**Current tabs:** Profile | Drops | Find | Matches | Wingman (5 tabs)

**New tabs:** Profile | Find | Dates | Wingman (4 tabs)

### Changes

#### Mobile App

- [ ] **Remove** `drops` tab from bottom navigation
- [ ] **Remove** `matches` tab from bottom navigation
- [ ] **Rename** `explore` tab → `Find`
- [ ] **Add** new `Dates` tab (date requests + upcoming dates — see Section 10)
- [ ] **Keep** `Wingman` as a standalone tab (4th position)
- [ ] Update tab bar order: Profile | Find | Dates | Wingman
- [ ] Update tab bar icons:
  - Profile → `person` (keep existing)
  - Find → `sparkles` (keep existing)
  - Dates → `calendar-heart` or `heart-outline`
  - Wingman → `people` (keep existing)
- [ ] Update tab bar badge logic: `Dates` tab shows badge count for pending date requests
- [ ] Remove badge from old `matches` tab
- [ ] Update `app/(tabs)/_layout.tsx` with new tab order and config
- [ ] Hide `drops`, `pulse`, `chats`, `study-date`, `index` from tab bar (keep routes accessible if needed)

---

## 2. Onboarding Overhaul

**Goal:** Collect enough data to run compatibility algorithm on first load.

### Personality & Lifestyle Questions to Add

These generate **compatibility vectors** used in matching.

- [ ] **Add personality questions step** to onboarding (after existing QuickFire or replace it):
  - Night owl or early bird?
  - Partying or chill nights in?
  - Career-focused or spontaneous?
  - Favorite music genre (multi-select)
  - Conversation style: deep talks / light banter / both
  - Social battery: introvert / ambivert / extrovert
  - Ideal first date vibe: coffee / walk / dinner / casual hangout
- [ ] **Add interests step** (multi-select chips — BubblePicker already exists, extend it):
  - Startups / Tech / Art / Music / Sports / Travel / Food / Books / Gaming / Fitness / Film / Fashion
- [ ] **Add lifestyle step:**
  - Relationship goal: casual / serious / open
  - How often do you go out per week?
  - Do you drink / smoke? (yes / no / sometimes)
- [ ] Store all answers as structured JSON in `profile` table (new columns or extend existing `lifestyle` field)
- [ ] Show **progress bar** across all onboarding steps
- [ ] Each step: card-based UI (like Bumble), full-screen, one question at a time
- [ ] Add **haptic feedback** on every selection tap (`expo-haptics`)
- [ ] Add **micro-animations** on step transitions (slide in from right, fade out to left — Reanimated)
- [ ] Add **celebration animation** (confetti / pulse) on onboarding completion (LaunchCelebration already exists — enhance it)
- [ ] After onboarding completes → trigger compatibility algorithm → navigate to Home tab

---

## 3. Home Screen — Daily Matches

**New screen:** `app/(tabs)/index.tsx` (rename current hidden index or create new)

**Route:** `/` (default tab)

### UI Layout

```
┌─────────────────────────────────┐
│  Good evening, [Name] 👋        │
│  Your matches today             │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  [Photo]                  │  │
│  │  Sarah, 22                │  │
│  │  ████████░░  86% match    │  │
│  │                           │  │
│  │  Why you might match:     │  │
│  │  • Afrobeats              │  │
│  │  • Late-night convos      │  │
│  │  • Startup culture        │  │
│  │                           │  │
│  │  [View Profile] [Ask Date]│  │
│  └───────────────────────────┘  │
│  (scroll for more — max 4)      │
└─────────────────────────────────┘
```

### Tasks

- [ ] Create `app/(tabs)/index.tsx` — Home screen
- [ ] Create `components/home/` directory with:
  - [ ] `home-header.tsx` — greeting with user's first name + time of day
  - [ ] `match-card.tsx` — card showing photo, name, age, compatibility %, reasons
  - [ ] `compatibility-bar.tsx` — animated progress bar showing % (Reanimated)
  - [ ] `match-reasons.tsx` — bullet list of 2–3 shared traits
  - [ ] `daily-matches-list.tsx` — vertical scroll list of max 4 match cards
  - [ ] `empty-matches.tsx` — empty state when no matches yet
- [ ] **No swiping.** Cards are static, scrollable vertically.
- [ ] Each card has two CTAs:
  - `View Profile` → navigates to profile detail screen
  - `Ask for a Date` → opens date request flow (Section 5)
  - `Skip` → dismisses card (soft skip, not permanent block)
- [ ] Matches refresh daily (or on pull-to-refresh)
- [ ] Add **skeleton loading** state while matches load
- [ ] Add **haptic feedback** on `Ask for a Date` tap (medium impact)
- [ ] Add **entrance animation** — cards slide up staggered on load (Reanimated)
- [ ] Compatibility % shown as animated fill bar (fill animation on mount)
- [ ] Show "Refreshes tomorrow" countdown if all 4 matches have been actioned

---

## 4. Profile View Screen

**Route:** `app/profile/[userId].tsx` (new screen — different from own profile)

### UI Sections

1. **Photos** — horizontal scroll / pager
2. **Name, age, location**
3. **Compatibility block** — "Why you might match" with shared traits
4. **Bio**
5. **Interests** — chip grid
6. **Personality** — visual tags (night owl, introvert, etc.)
7. **Wingman reviews** — quotes from friends (if any)
8. **CTA sticky at bottom:** `Ask for a Date` button

### Tasks

- [ ] Create `app/profile/[userId].tsx` — other user's profile view
- [ ] Create `components/profile-view/` directory:
  - [ ] `profile-photos.tsx` — photo pager with dot indicators
  - [ ] `compatibility-block.tsx` — "Why you might match" section
  - [ ] `interests-chips.tsx` — interest tags grid
  - [ ] `personality-tags.tsx` — personality trait pills
  - [ ] `wingman-quotes.tsx` — friend review quotes
  - [ ] `profile-view-cta.tsx` — sticky bottom bar with `Ask for a Date`
- [ ] Smooth scroll with parallax header photo (Reanimated)
- [ ] Haptic feedback on `Ask for a Date` tap
- [ ] Back navigation with swipe gesture
- [ ] Show compatibility % prominently near top

---

## 5. Date Request Flow

**Triggered from:** Home match card CTA or Profile view CTA

### Flow

1. User taps `Ask for a Date`
2. Bottom sheet opens: **Select Date Vibe**
   - Coffee ☕
   - Walk 🚶
   - Dinner 🍽️
   - Casual hangout 🎮
3. Optional message field (placeholder: "Hey, I'd love to meet you.")
4. Tap `Send Date Request`
5. Success animation + haptic feedback
6. Card on Home updates to show "Request Sent"

### Tasks

- [ ] Create `components/date-request/` directory:
  - [ ] `date-request-sheet.tsx` — bottom sheet with vibe selector + message input
  - [ ] `vibe-option-card.tsx` — tappable card for each date vibe with emoji + label
  - [ ] `date-request-success.tsx` — success state animation (checkmark + pulse)
- [ ] Create `app/api/date-requests/route.ts` (backend) — POST endpoint to create date request
- [ ] Add `date_request` table to DB schema (see Section 18)
- [ ] Add `useCreateDateRequest` hook in `hooks/use-date-requests.ts`
- [ ] Vibe selector: single-select, tapping a card highlights it with border + scale animation
- [ ] Message field: optional, max 150 chars, character counter
- [ ] Send button: disabled until vibe is selected
- [ ] On success: sheet closes, haptic success feedback, card state updates
- [ ] On error: toast notification

---

## 6. Receiving a Date Request

**Triggered by:** Push notification

### UI

- Notification: `[Name] wants to go on a date with you 💜`
- Opens to `Dates` tab → `Requests` section
- Request card shows:
  - Photo + name
  - Compatibility %
  - Date vibe they selected
  - Their optional message
  - "Why you match" reasons
  - `Accept Date` button (primary, pink)
  - `Decline` button (ghost)
  - `View Profile` link

### Tasks

- [ ] Add `Requests` section to `Dates` tab (Section 10)
- [ ] Create `components/date-request/incoming-request-card.tsx`
- [ ] Create `app/api/date-requests/[id]/respond/route.ts` — PATCH endpoint (accept/decline)
- [ ] Add `useRespondToDateRequest` hook
- [ ] Push notification on new date request (use existing `expo-notifications` setup)
- [ ] Haptic feedback on `Accept Date` tap
- [ ] Decline: soft animation (card slides out), no permanent block
- [ ] Accept: triggers Mutual Match flow (Section 7)

---

## 7. Mutual Match Screen

**Triggered when:** Both users accept each other's date request (or one accepts the other's)

### UI

- Full-screen celebration modal:
  - Both profile photos side by side with animated heart between them
  - "It's a Date Match! 💜"
  - Compatibility % shown
  - Message: "Before you meet, we recommend a quick 3-minute call."
  - `Start Call` button
  - `Skip for now` link (smaller, below button)

### Tasks

- [ ] Create `components/date-match/` directory:
  - [ ] `date-match-modal.tsx` — full-screen celebration overlay
  - [ ] `match-photos-animation.tsx` — two photos + heart animation (Reanimated)
- [ ] Trigger modal when mutual accept detected (via React Query invalidation or push notification)
- [ ] Confetti / particle animation on match (use `react-native-reanimated` or a lightweight confetti lib)
- [ ] Haptic feedback: success pattern on match
- [ ] `Start Call` → navigates to existing `vibe-check/[matchId]` screen
- [ ] `Skip for now` → navigates to Dates tab, shows upcoming date pending setup

---

## 8. 3-Minute Call (Vibe Check)

**Existing feature** — `app/vibe-check/[matchId].tsx` + Daily.co

### Changes Needed

- [ ] Update UI to match new design system (dark purple + pink)
- [ ] Show **countdown timer** prominently (large, centered)
- [ ] Add **mute button** with haptic feedback
- [ ] Add **end call** button
- [ ] After call ends → auto-navigate to Post-Call Confirmation (Section 9)
- [ ] Show both user avatars during call
- [ ] Add subtle **pulse animation** on active speaker indicator

---

## 9. Post-Call Confirmation

**Shown after:** 3-minute call ends

### UI

```
┌─────────────────────────────────┐
│  How did the vibe feel?         │
│                                 │
│  [Photo of match]               │
│  Sarah                          │
│                                 │
│  Would you still like to meet?  │
│                                 │
│  [Yes, let's meet! 🎉]          │
│  [Not really]                   │
└─────────────────────────────────┘
```

### Tasks

- [ ] Update existing `components/vibe-check/vibe-check-decision.tsx` with new copy + UI
- [ ] If both say "Yes" → triggers admin queue (manual date setup)
- [ ] If either says "No" → graceful decline, no notification to other user, date request marked as declined
- [ ] POST to `app/api/date-requests/[id]/vibe-result/route.ts`
- [ ] Haptic feedback on both buttons
- [ ] "Yes" button: primary pink, scale animation on tap
- [ ] "No" button: ghost, subtle

---

## 10. Dates Tab — Upcoming Dates

**New tab replacing `Matches`**

### Sections

1. **Requests** — incoming date requests (badge count)
2. **Upcoming** — confirmed dates pending admin setup + scheduled dates
3. **Past** — completed dates (with feedback prompt if not yet given)

### Upcoming Date Card UI

```
┌─────────────────────────────────┐
│  Upcoming Date                  │
│                                 │
│  [Photo]  Sarah                 │
│  Saturday, 6 PM                 │
│  Java House, Westlands          │
│                                 │
│  [Add to Calendar] [Cancel]     │
│  [Message Support]              │
└─────────────────────────────────┘
```

### Tasks

- [ ] Create `app/(tabs)/dates.tsx` — Dates tab screen
- [ ] Create `components/dates/` directory:
  - [ ] `dates-tab-header.tsx` — segmented control (Requests / Upcoming / Past)
  - [ ] `incoming-requests-list.tsx` — list of incoming date requests
  - [ ] `upcoming-date-card.tsx` — confirmed date with details
  - [ ] `pending-setup-card.tsx` — "Your date is being arranged" state card
  - [ ] `past-date-card.tsx` — past date with feedback CTA
  - [ ] `empty-dates.tsx` — empty state for each section
- [ ] `Add to Calendar` → `expo-calendar` integration
- [ ] `Cancel` → confirmation dialog → POST to cancel endpoint
- [ ] `Message Support` → deep link to WhatsApp or email (no in-app messaging yet)
- [ ] Pull-to-refresh on all sections
- [ ] Skeleton loading states
- [ ] Badge on Dates tab = count of pending incoming requests

---

## 11. Post-Date Feedback

**Triggered by:** Push notification next day after scheduled date

### UI

```
┌─────────────────────────────────┐
│  How was your date? 💜          │
│  with Sarah                     │
│                                 │
│  ★ ★ ★ ★ ★  (tap to rate)      │
│                                 │
│  Would you meet again?          │
│  [Yes, definitely] [Maybe] [No] │
│                                 │
│  Anything to share? (optional)  │
│  [text input]                   │
│                                 │
│  [Submit Feedback]              │
└─────────────────────────────────┘
```

### Tasks

- [ ] Create `app/feedback/[dateId].tsx` — feedback screen
- [ ] Create `components/feedback/` directory:
  - [ ] `star-rating.tsx` — animated star rating (1–5, haptic on each star)
  - [ ] `meet-again-selector.tsx` — three-option selector
  - [ ] `feedback-text-input.tsx` — optional text area
- [ ] Create `app/api/date-feedback/route.ts` — POST endpoint
- [ ] Add `date_feedback` table to DB schema (see Section 18)
- [ ] Add `useDateFeedback` hook
- [ ] Push notification: "How was your date with Sarah?" (sent day after scheduled date)
- [ ] Feedback data feeds into compatibility algorithm improvement
- [ ] After submit: thank you animation + navigate back to Dates tab
- [ ] Haptic feedback on star rating taps

---

## 12. Wingman Feature

**Standalone tab** — 4th position in bottom navigation

### Flow

1. User opens Wingman tab
2. Sees their current wingman reviews + a CTA to get more
3. Taps `Get Wingman Reviews` → share link generated
4. Friend opens link → web form (or in-app)
5. Friend answers:
   - Describe [Name] in 3 words
   - What makes [Name] attractive?
   - Best date idea for [Name]?
6. Answers saved, shown on user's profile as quotes
7. Wingman answers improve compatibility scoring

### Tasks

- [ ] Repurpose existing `pulse` tab route → rename to `wingman` tab
- [ ] Update `app/(tabs)/pulse.tsx` → `app/(tabs)/wingman.tsx` (or update content in place)
- [ ] Keep existing `hype-request.tsx` and `hype-section.tsx` — rename/rebrand to "Wingman"
- [ ] Update `app/hype-request.tsx` copy to match new Wingman questions above
- [ ] Wingman tab shows: current reviews received + share link CTA + progress/status
- [ ] Ensure wingman answers are surfaced on profile view (Section 4)
- [ ] Add `Wingman Reviews` section to own profile screen as a preview

---

## 13. Compatibility Algorithm

**Backend service** — runs after onboarding and on each new profile

### Scoring Dimensions

| Dimension | Weight | Source |
|---|---|---|
| Interest overlap | 25% | Onboarding interests |
| Personality alignment | 25% | Personality questions |
| Lifestyle similarity | 20% | Lifestyle answers |
| Communication style | 15% | Conversation style answer |
| Wingman feedback | 15% | Wingman submissions |

### Tasks

- [ ] Create `src/services/compatibility-service.ts` in backend
- [ ] Implement scoring function: takes two user profiles, returns 0–100 score + top reasons
- [ ] Store compatibility scores in `compatibility_score` table (cache, recompute on profile update)
- [ ] Expose `GET /api/matches/daily` endpoint — returns top 4 matches for authenticated user with scores + reasons
- [ ] Trigger recompute on:
  - Profile update
  - New wingman submission
  - Post-date feedback received
- [ ] Extend existing `pgvector` embedding pipeline to include new personality/lifestyle fields
- [ ] Add `GET /api/matches/[userId]/compatibility` — returns score + reasons between current user and target user (used on profile view)

---

## 14. Admin Dashboard (Web)

**Location:** New Next.js pages in `backend/strath-backend/src/app/admin/`

**Access:** Protected route — admin-only (role check on session)

### Sections

#### 14.1 Overview Dashboard

- [ ] Create `app/admin/page.tsx` — dashboard home
- [ ] Metric cards:
  - Total profiles created
  - Date requests sent (today / all time)
  - Date requests accepted
  - Calls completed
  - Dates pending setup
  - Dates scheduled
  - Dates attended (confirmed by feedback)
  - Second dates (meet again = yes)
- [ ] Recent activity feed (last 10 events)
- [ ] Quick action buttons: View Pending Dates, View New Requests

#### 14.2 Date Requests

- [ ] Create `app/admin/date-requests/page.tsx`
- [ ] Table columns: User A | User B | Vibe | Message | Status | Date Sent | Actions
- [ ] Filters: All / Pending / Accepted / Declined / Expired
- [ ] Click row → expand to see full profiles of both users
- [ ] Status badges with colors (pending=yellow, accepted=green, declined=red)

#### 14.3 Pending Date Setup

- [ ] Create `app/admin/pending-dates/page.tsx`
- [ ] Shows all mutual matches where call completed + both said "Yes"
- [ ] Card per pending date:
  - User A profile summary (name, photo, phone)
  - User B profile summary (name, photo, phone)
  - Preferred date vibe
  - Call completed timestamp
- [ ] Admin actions:
  - `Mark as Scheduled` → opens modal to enter: date, time, venue name, venue address
  - `Cancel` → with reason
- [ ] On `Mark as Scheduled` → push notification sent to both users with date details

#### 14.4 Scheduled Dates

- [ ] Create `app/admin/scheduled-dates/page.tsx`
- [ ] Table: User A | User B | Venue | Date/Time | Status | Feedback Received
- [ ] Status: Scheduled / Attended / Cancelled / No-show
- [ ] Manual status update by admin
- [ ] Feedback column shows star rating once submitted

#### 14.5 User Management

- [ ] Create `app/admin/users/page.tsx`
- [ ] Table: Name | Email | Joined | Profile Complete | Matches | Dates | Last Active
- [ ] Click user → view full profile
- [ ] Actions: Suspend / Delete / Reset

#### 14.6 Metrics & Funnel

- [ ] Create `app/admin/metrics/page.tsx`
- [ ] Funnel chart: Profiles → Requests Sent → Requests Accepted → Calls → Dates → Attended → Second Date
- [ ] Conversion rates at each step
- [ ] Time-series charts (daily/weekly)

### Admin Auth

- [ ] Add `role` field to `user` table (`user` | `admin`)
- [ ] Create `src/lib/admin-auth.ts` — middleware to check admin role
- [ ] Protect all `/admin/*` routes with admin middleware
- [ ] Admin login via existing Better Auth (email/password only for admin)

### Admin UI Style

- [ ] Use existing Tailwind + shadcn/ui components (already in backend)
- [ ] Dark sidebar navigation
- [ ] Consistent with existing landing page design system
- [ ] Mobile-responsive (admin may check on phone)

---

## 15. Push Notifications

### New Notification Types to Add

- [ ] `date_request_received` — "Alex wants to go on a date with you 💜"
- [ ] `date_request_accepted` — "Sarah accepted your date request! 🎉"
- [ ] `date_request_declined` — "Sarah passed on your request." (gentle copy)
- [ ] `mutual_match` — "It's a Date Match with Sarah! 💜"
- [ ] `call_reminder` — "Your 3-min call with Sarah starts in 5 minutes"
- [ ] `date_scheduled` — "Your date is set! Saturday 6PM, Java House Westlands 📍"
- [ ] `feedback_prompt` — "How was your date with Sarah? Share your thoughts 💬"
- [ ] `date_cancelled` — "Your date with Sarah was cancelled."

### Tasks

- [ ] Add new notification type constants to `src/lib/services/notifications-service.ts`
- [ ] Create notification templates for each type
- [ ] Wire notifications to relevant API endpoints (date request create, respond, schedule, etc.)
- [ ] Ensure deep links work: notification tap → correct screen

---

## 16. UI/UX Design System

### Global Principles

- **Dark gradient background:** `#1a0d2e` → `#2d1b47`
- **Primary accent:** `#e91e8c` (hot pink)
- **Secondary accent:** `#d946a6` (magenta)
- **Cards:** `#3d2459` with `#482961` border, `border-radius: 20px`
- **Soft shadows:** `shadow-lg` with purple tint

### Animation Standards

- [ ] All screen transitions: slide + fade (Reanimated `withSpring`)
- [ ] Card entrance: staggered slide-up (50ms delay between cards)
- [ ] Button press: scale down to 0.96 on press, spring back on release
- [ ] Compatibility bar: animated fill from 0 to % on mount
- [ ] Match celebration: particle/confetti burst
- [ ] Success states: checkmark draw animation
- [ ] Loading states: shimmer skeleton (purple tint)
- [ ] Tab bar: smooth icon transition on switch

### Haptic Feedback Standards

- [ ] **Light impact:** any tap on non-primary UI (chips, tags, navigation)
- [ ] **Medium impact:** primary CTA buttons (Ask for a Date, Accept, Send)
- [ ] **Heavy impact:** match celebration, date confirmed
- [ ] **Success notification:** feedback submit, date scheduled
- [ ] **Warning notification:** decline, cancel actions
- [ ] Add `expo-haptics` calls consistently across all new components

### Typography

- [ ] Headers: `font-bold`, size 24–28px
- [ ] Body: `font-normal`, size 16px, line-height 24px
- [ ] Captions: `font-medium`, size 13px, muted color
- [ ] Compatibility %: `font-bold`, size 20px, pink color

### Accessibility

- [ ] All interactive elements: minimum 44×44pt touch target
- [ ] Color contrast: WCAG AA minimum
- [ ] Screen reader labels on all icon buttons

---

## 17. Metrics & Analytics

### Key Metrics to Track (Idea Validation)

| Metric | Description | Target |
|---|---|---|
| Profiles created | Total signups with complete profile | — |
| Date requests sent | Total date requests initiated | — |
| Date requests accepted | Acceptance rate | >30% |
| Calls completed | % of matches who do the 3-min call | >50% |
| Dates scheduled | % of calls that lead to a date | >60% |
| Dates attended | % of scheduled dates that happen | >70% |
| Second dates | % of attended dates where both say "meet again" | >40% |

### Tasks

- [ ] Create `app/api/admin/metrics/route.ts` — aggregated metrics endpoint
- [ ] Log events to a `events` table: `event_type`, `user_id`, `metadata`, `created_at`
- [ ] Event types: `profile_created`, `date_request_sent`, `date_request_accepted`, `call_completed`, `date_scheduled`, `date_attended`, `feedback_submitted`
- [ ] Funnel query: join events to compute conversion rates
- [ ] Expose metrics on Admin Dashboard (Section 14.6)

---

## 18. Backend Changes

### New Database Tables

- [ ] **`date_request`**
  ```sql
  id, from_user_id, to_user_id, vibe (coffee|walk|dinner|hangout),
  message, status (pending|accepted|declined|expired|cancelled),
  created_at, updated_at
  ```

- [ ] **`date_match`**
  ```sql
  id, request_id, user_a_id, user_b_id,
  call_completed (bool), user_a_confirmed (bool), user_b_confirmed (bool),
  status (pending_setup|scheduled|attended|cancelled|no_show),
  created_at
  ```

- [ ] **`scheduled_date`**
  ```sql
  id, match_id, venue_name, venue_address, scheduled_at,
  admin_notes, created_by_admin_id, created_at
  ```

- [ ] **`date_feedback`**
  ```sql
  id, match_id, user_id, rating (1-5), meet_again (yes|maybe|no),
  text_feedback, created_at
  ```

- [ ] **`compatibility_score`**
  ```sql
  id, user_a_id, user_b_id, score (0-100), reasons (jsonb),
  computed_at
  ```

- [ ] **`events`** (analytics)
  ```sql
  id, event_type, user_id, metadata (jsonb), created_at
  ```

- [ ] Add `role` column to `user` table: `text default 'user'`

### New API Endpoints

- [ ] `POST /api/date-requests` — create date request
- [ ] `GET /api/date-requests/incoming` — get incoming requests for current user
- [ ] `GET /api/date-requests/sent` — get sent requests
- [ ] `PATCH /api/date-requests/[id]/respond` — accept or decline
- [ ] `PATCH /api/date-requests/[id]/vibe-result` — post-call confirmation
- [ ] `GET /api/matches/daily` — get today's top 4 matches with compatibility scores
- [ ] `GET /api/matches/[userId]/compatibility` — compatibility score + reasons
- [ ] `POST /api/date-feedback` — submit post-date feedback
- [ ] `GET /api/dates/upcoming` — upcoming scheduled dates for current user
- [ ] `GET /api/dates/past` — past dates for current user
- [ ] `POST /api/admin/dates/[matchId]/schedule` — admin schedules a date
- [ ] `PATCH /api/admin/dates/[matchId]/status` — admin updates date status
- [ ] `GET /api/admin/metrics` — aggregated metrics
- [ ] `GET /api/admin/date-requests` — all date requests (admin)
- [ ] `GET /api/admin/pending-dates` — pending setup queue (admin)
- [ ] `GET /api/admin/users` — user list (admin)

### Profile Table Extensions

- [ ] Add `personality` column: `jsonb` — stores personality question answers
- [ ] Add `lifestyle` column (extend if exists): `jsonb` — lifestyle answers
- [ ] Add `date_vibe_preference` column: `text[]` — preferred date vibes from onboarding

---

## 19. Future Automation (Post-Validation)

> **Do not build these now.** Build only after manual process validates the model.

- [ ] Automated date scheduling (calendar sync, venue suggestion API)
- [ ] AI matchmaker conversation (chat with AI to refine preferences)
- [ ] Automated venue coordination
- [ ] Calendar sync (Google Calendar / Apple Calendar)
- [ ] Smart venue recommendations based on location + vibe
- [ ] Automated follow-up messaging
- [ ] ML-based compatibility model (replace rule-based scoring)
- [ ] In-app messaging between matched users (currently: no direct messaging)

---

## Implementation Order (Suggested)

### Phase 1 — Core Flow (Mobile)
1. Navigation restructure
2. Home screen with daily matches
3. Date request flow (send + receive)
4. Dates tab

### Phase 2 — Backend Foundation
5. New DB tables + migrations
6. `/api/matches/daily` endpoint
7. `/api/date-requests` CRUD endpoints
8. Compatibility scoring service
9. Push notifications for date flow

### Phase 3 — Admin Dashboard
10. Admin auth + role system
11. Pending dates queue
12. Scheduled dates management
13. Metrics dashboard

### Phase 4 — Polish
14. Post-call confirmation updates
15. Post-date feedback flow
16. Wingman integration into profile
17. Animation + haptics pass across all new screens
18. Onboarding personality questions

---

*Last updated: March 13, 2026*
*Status: Planning — no features started*
