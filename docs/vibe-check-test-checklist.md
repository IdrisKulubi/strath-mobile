# Vibe Check — Manual Test Checklist

Run these in order. Each phase builds on the previous one.

---

## Phase 1 — Daily.co API key (2 min)

Run from `backend/strath-backend/`:

```bash
node -r dotenv/config scripts/test-daily-connection.mjs dotenv_config_path=.env.local
```

**Expected:** 4 green ✅ checkmarks and a "configured correctly" message.

---

## Phase 2 — Backend API routes (5 min)

Start the backend locally:

```bash
cd backend/strath-backend
npx next dev
```

Get two Bearer tokens (see "How to get tokens" below), then:

```bash
BASE_URL=http://localhost:3000 \
TOKEN_A=<user_a_token> \
TOKEN_B=<user_b_token> \
MATCH_ID=<a_real_match_id> \
node scripts/test-vibe-check-api.mjs
```

**Expected:** All 6 steps pass with 🎉 at the end.

### How to get a Bearer token

1. Open the Strathspace app on your phone/simulator
2. Go to the Metro bundler logs — find the `Authorization: Bearer <token>` in any API request (e.g. open the Matches tab)
3. Or run this in your React Native app temporarily and copy from logs:
   ```ts
   import { getAuthToken } from "@/lib/auth-helpers";
   getAuthToken().then(t => console.log("TOKEN:", t));
   ```

### How to get a Match ID

Run this SQL against your Neon DB:
```sql
SELECT id, user1_id, user2_id FROM matches LIMIT 5;
```
Or copy it from the URL when you open a chat in the app: `chat/<matchId>`.

---

## Phase 3 — Mobile UI (manual, 10 min)

Use two phones/simulators logged in as different matched users.

### 3a. Prompt appears in chat

- [ ] Open a chat between two matched users
- [ ] A "Vibe Check" banner/prompt appears above the message input
- [ ] Tapping it navigates to `app/vibe-check/[matchId].tsx`

### 3b. Call screen loads

- [ ] The pulsing mic animation plays
- [ ] The partner's first name shows in the header
- [ ] A conversation topic is shown in the topic card
- [ ] "Open Call" button is visible

### 3c. Call opens in browser

- [ ] Tapping "Open Call" opens the Daily.co room in the system browser
- [ ] The timer starts counting down from 3:00 (green)
- [ ] After returning from the browser, "End Call" button is visible

### 3d. Timer colours

- [ ] Timer is **green** above 1:00
- [ ] Timer turns **orange** between 0:30–1:00
- [ ] Timer turns **red** below 0:30
- [ ] When timer reaches 0:00 → automatically moves to decision screen

### 3e. Decision screen

- [ ] "Want to Meet 🤝" and "Not This Time 👋" buttons appear
- [ ] Tapping "Want to Meet" on User A → shows "Waiting on [name]…" spinner
- [ ] User B taps "Want to Meet" → both see mutual agree celebration
- [ ] "See [name]'s profile" button navigates to the match profile
- [ ] Tapping "Not This Time" on either → both see the "thanks for vibe checking" screen

### 3f. Edge cases

- [ ] Pressing "Cancel" before starting a call goes back to chat
- [ ] If Daily.co API key is missing → loading spinner shows "Setting up your vibe check…" and logs a clear error (not a crash)
- [ ] Opening the same match's vibe check twice returns the **same** session (idempotent)
- [ ] Two different matches each get their **own** separate session

---

## Quick smoke test (fastest path)

If you just want to verify the whole flow once quickly without two devices:

1. Run the API script (Phase 2) — this exercises the entire backend
2. Open the app, navigate to any chat, and verify the Vibe Check prompt renders
3. Tap "Open Call" and confirm the Daily.co room URL opens in the browser

That alone covers the critical path. Full Phase 3 is for pre-release verification.
