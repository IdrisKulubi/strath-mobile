# StrathSpace — V1 Scope (Recommended)

Date: 2026-02-18

This is a *shipping-focused* cut of the full roadmap in `AGENTIC_STRATHSPACE_IMPLEMENTATION.md`.

## Assumptions (Already Built / In Progress)

Based on the current repo work so far, V1 already includes the MVP backbone:

- **Stage 3 (Core Agent UI)**: “Find” (agent search/refine) as primary flow
- **Stage 4 (Weekly Drops)**: cron generation + Drops tab UI + history entry points
- **Core matchmaking primitive**: “Connect” uses swipe-like action and can create a match + open chat

If any of the above is not true in your build, tell me and I’ll adjust this scope.

---

## V1 Must-Haves (Ship-Blocking)

These are the smallest additions that make V1 stable, safe, and measurable — without adding more big feature surfaces.

### 1) Reliability & Failure Handling (Stage 13 subset)

- Agent request timeouts + friendly fallback UI (“Took longer than expected… try again”)
- Gemini/API failure fallback: **structured-only search** (no semantic) instead of hard failure
- Better error messaging for auth/network/empty results
- Basic rate limiting on expensive routes (`/api/agent/search`, `/api/agent/refine`, weekly cron)

Why it’s V1: prevents “AI is broken” moments and avoids runaway cost.

### 2) Minimal Analytics Events (Stage 13.1 subset)

Track only what proves the loop works:

- `agent_search` (latency, result_count)
- `agent_connect` (from_drop vs on_demand)
- `drop_opened`
- `drop_expired` (matches_connected)

Why it’s V1: without this, you can’t iterate the algorithm or UX confidently.

### 3) Wingman Memory — Minimal (Stage 6 subset)

Not the full “proactive agent” story — just the pieces that improve results over time:

- Persist `agent_context` updates on search + feedback
- Store last ~20 queries (for quick tap-to-rerun)
- “Reset Wingman memory” action

Why it’s V1: improves match quality quickly and makes the agent feel consistent.

### 4) Safety Baseline

- Block/report flows must be present and reachable from match/profile contexts
- Input moderation for agent queries (keyword guard + reject/soft block obvious abuse)

Why it’s V1: campus product → trust and safety issues can kill adoption.

### 5) Push + Deep Link Polish (Stage 4 hardening)

- Notification click → navigates to Drops reliably
- Push token refresh/update flows are stable

Why it’s V1: Weekly Drops are your retention loop.

---

## V1 “Nice-to-Have” (Only if time remains)

These can ship after V1 without breaking the core loop:

- Compatibility breakdown card (Stage 10)
- A lightweight “Drop history” UX polish pass (visual only)

---

## Defer to V1.1+ (Do NOT include in first release)

These are high-effort, high-risk, or add new surfaces that dilute the core agent loop:

- **Stage 5** Match Missions
- **Stage 7** Vibe Check voice calls
- **Stage 8** Campus Pulse feed
- **Stage 9** Study Date mode
- **Stage 11** Hype Me (friend vouches)
- **Stage 12** Blind Dates IRL

Rationale: each adds moderation/ops complexity and new engagement loops.

---

## V1 Definition of Done

- Agent search is reliable (handles timeouts, empty results, API errors)
- Weekly drop works end-to-end (cron → push → open → connect)
- No “stuck UI / modal blocks taps” issues
- Analytics proves the loop: searches → connects → chats
- Safety features exist (block/report) and are discoverable

