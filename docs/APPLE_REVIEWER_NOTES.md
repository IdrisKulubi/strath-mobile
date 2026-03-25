# Notes for the Apple App Store Reviewer

Use this document when submitting to App Store Connect. Copy the content below into the **Notes for the Reviewer** field.

---

## How to Sign In

Strathspace offers two sign-in options:

1. **Sign in with Apple** (first button) – Uses the native Apple Sign In button. You can use your Apple ID to sign in.
2. **Continue with Google** – Uses Google OAuth.

---

## Sign in with Apple Testing

- The **Sign in with Apple** button is shown first on the login screen (per Guideline 4.8).
- It uses the native `AppleAuthenticationButton` from `expo-apple-authentication`.
- If you test Sign in with Apple, you can create a new account or link to an existing one.
- If you prefer not to use Sign in with Apple, use **Continue with Google**.

---

## AI Features & Data Sharing (Guidelines 5.1.1(i) and 5.1.2(i))

Strathspace uses **Google Gemini** for AI features (Wingman AI, voice search, weekly match suggestions). We comply with Apple's guidelines as follows:

1. **Explicit consent before any AI use**  
   Users must tap **Allow Wingman AI** before any data is sent to Google Gemini. Until they opt in, AI features are disabled.

2. **Clear disclosure**  
   The consent screen explains:
   - What data is shared (typed prompts, optional voice recordings, profile details, friend-submitted responses)
   - Who receives it (Google Gemini)
   - That users can turn AI features off later in Settings

3. **Revocation**  
   Users can turn off AI features at any time: **Profile → Settings → AI Features → Allow Wingman AI** (toggle off).

**How to test AI consent:**
- Sign in with Apple or Google.
- Go to Home, Find, Dates, or Wingman.
- If AI is not yet enabled, you'll see a consent card.
- Tap **Allow Wingman AI** to opt in.
- To revoke: **Profile → Settings → AI Features** → turn off **Allow Wingman AI**.

---

## What to Test

- **Home** – View daily matches and send date invites.
- **Profile** – View and edit profile.
- **Find** – Browse and discover profiles.
- **Dates** – View incoming invites, sent invites, confirmed matches, and history.
- **Wingman** – AI-assisted search (requires AI consent).
- **Settings** – AI Features toggle, notifications, theme, account options.

---

## Additional Notes

- The app requires an internet connection.
- Privacy Policy and Terms of Service are linked on the login screen and in Settings.
