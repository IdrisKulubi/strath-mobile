# Design Updates & Feature Additions
Based on competitive analysis of Tinder and Bumble, the following updates are proposed to elevate StrathSpace to a professional standard.

## 1. Onboarding & Registration
**Goal:** Easy, simple, minimalistic, conversational.

- [ ] **Updates:**
    - [ ] **House Rules/Guidelines:** Show basic guidelines immediately after login (Tinder style) or as the last step (Bumble style). *Recommendation: Early in the flow to set tone.*
    - [ ] **Conversational Wording:** use active phrasing like "My first name is..." to create a conversation.
    - [ ] **Progress Indicators:** Add a progress bar to show how long the process will take.
    - [ ] **Gender Identity:** Ensure the whole spectrum of gender identities is available.
    - [ ] **Sexual Orientation:** Allow choosing up to 3 types (Men, Women, Everyone).

## 2. Profile Setup
**Goal:** Reduce friction, maximize expression.

- [ ] **Updates:**
    - [ ] **Photo Upload Flexibility:** **CRITICAL**. Must allow access to Gallery/Camera Roll, not just recent photos or camera.
    - [ ] **Passions/Interests:** Allow selecting up to 5 passions/interests tags.
    - [ ] **Contact Blocking:** Add a step to block contacts (avoid exes/family) by syncing contact list.
    - [ ] **Location Permission:** Use persuasive copy ("Tell me more") explaining benefits (seeing matches nearby) before the system prompt.
    - [ ] **Prompts:** Add text prompts (e.g., "This week has me thinking about...") to break the ice.

## 3. Match Interface (Main Deck)
**Goal:** Visual impact, quick information.

- [ ] **Updates:**
    - [ ] **Card Design:**
        - Large, high-quality photo matches.
        - Simple overlay: Name, Age, Verified Badge.
        - Scroll down for: Location, Distance, Spotify, Instagram, Passions.
    - [ ] **Interactive Tutorial:** Quick tutorial on first launch showing how to swipe/interact.
    - [ ] **Undo (Rewind):** *Consideration for premium or limited free feature.*
    - [ ] **Share Profile:** Option to share a profile with a friend for an opinion.

## 4. Chat & Interaction
**Goal:** facilitate meaningful connections, safety.

- [ ] **Updates:**
    - [ ] **Icebreakers:** Random questions or GIF openers.
    - [ ] **"My Move" (Optional):** Setting for women to start the conversation first (extra security layer).
    - [ ] **Rich Media:** Voice notes, Video/Audio calls (in-app, no phone number sharing).
    - [ ] **Safety Toolkit:** "Safety functionality" is mentioned (already partially implemented in `safety-toolkit-modal.tsx`). Ensure it covers reporting/unmatching.

## 5. Verification & Security
**Goal:** Trust.

- [ ] **Updates:**
    - [ ] **Photo Verification:** Face match technology (pose to verify) to get a "Verified" badge.
    - [ ] **Face Recognition:** To ensure users upload their own photos.

## 6. Filters (Discovery Settings)
**Goal:** Better matching efficiency.

- [ ] **Updates:**
    - [ ] **Advanced Filters:** Height, Zodiac sign, Education, etc. (Bumble style).
    - [ ] **Filter Logic:** Exclude people who don't meet criteria to save time.

## 7. Post-Interaction
**Goal:** Quality Control.

- [ ] **Updates:**
    - [ ] **Feedback:** Ask "How was the date?" or "How was the interaction?" after a match/meeting to close dead loops and improve quality.
