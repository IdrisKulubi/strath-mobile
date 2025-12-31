# Discovery Plan: StrathSpace

The Discovery section is the heartbeat of StrathSpace. It helps Gen Z university students find people, vibes, and moments — not just profiles.

## Core Discovery Features

### 1. Vibe-Based Discovery Feed
Instead of a generic swipe feed, users discover people based on current vibes:
*   🎧 **Music Heads**
*   ☕ **Late Night Thinkers**
*   🎮 **Gamers**
*   💼 **Founders / Hustlers**
*   🧠 **Quiet + Curious**
*   🌍 **New to Campus**

**Vibes are:**
*   Selected during onboarding.
*   Updated dynamically based on behavior (likes, nudges, rooms joined).

### 2. Interest Rooms (Social Spaces)
Users can enter lightweight interest-based rooms:
*   **Examples:** Indie Music @ Strath, Startup Ideas, Photography Walks, Gym Accountability.
*   **Inside a room:** See active users, drop reactions/nudges, or join mini prompts ("Hot take?", "Drop a song").

### 3. Nearby Energy (Soft Location Awareness)
Privacy-first proximity:
*   “People active on campus now”
*   “People online tonight”
*   “People around your faculty”
*   **Privacy:** No precise distance or live tracking.

### 4. Icebreaker Cards
Discovery shows conversation starters:
*   “Unpopular opinion?”
*   “Best food spot near campus?”
*   “What’s your current obsession?”
*   **Responses:** Text, Emoji, or Meme-style reactions.

### 5. Soft Actions (No Pressure)
Lowering anxiety via playful engagement:
*   👋 Wave
*   🎵 Drop a song
*   😂 React to a prompt
*   🔥 Nudge

### 6. Discovery Challenges (Gamified)
Short-term quests with rewards (Badges, Profile boosts):
*   “Find 3 people who love the same artist”
*   “Match with someone from a different faculty”

---

## AI Logic for Vibe Matching
StrathSpace uses lightweight, explainable AI — no black-box dating algorithm.

### Inputs
*   Selected interests & vibes.
*   Room participation.
*   Interaction type (nudges > likes > scrolls).
*   Time-of-day behavior & response patterns.

### Vibe Vector System
Each user has a dynamic **Vibe Vector**:

```json
{
  "music": 0.8,
  "social_energy": 0.6,
  "introversion": 0.3,
  "creativity": 0.7,
  "spontaneity": 0.5
}
```

### Matching Logic (Discovery Ranking)
1.  **Vibe similarity:** Not just exact matches.
2.  **Complementary traits:** e.g., Calm + Expressive.
3.  **Freshness:** Prioritizing new faces.
4.  **Mutual activity windows.**

---

## Discovery Page — Wireframe Structure

### 1. Header
*   Greeting: “What’s your vibe today?”
*   Quick vibe switcher (chips)
*   Profile avatar (top-right)

### 2. Vibe Selector (Horizontal Scroll)
*   Pill-style buttons: `🎧 Music` | `☕ Chill` | `🎮 Games` | `💼 Hustle` | `🌙 Late Night`
*   *Action:* Changing vibe instantly refreshes feed.

### 3. Main Discovery Feed (Vertical Cards)
*   Profile photo/avatar + Name + Faculty.
*   1–2 vibe tags.
*   One icebreaker prompt.
*   **Soft action buttons:** 👋 Wave, 🎵 Song, 😂 React, 🔥 Nudge.

### 4. Rooms Preview Section
*   Horizontal carousel showing Room Name, Active Count, and "Join" CTA.

### 5. Challenges Strip
*   Small banner: “Today’s Challenge” + Progress indicator.

### 6. Bottom Navigation
*   Discover | Rooms | Create/Nudge | Messages | Profile