# Google Play Store Submission Checklist for StrathSpace

## 🎯 Pre-Submission Summary
**App Name:** StrathSpace
**Package Name:** `com.strathspace.mobile`
**Category:** Social

---

## ✅ Step 1: Android Configuration in app.json
- [ ] Add `package` name to `android` section in `app.json`.
  ```json
  "android": {
    "package": "com.strathspace.mobile",
    "versionCode": 1,
    ...
  }
  ```
- [ ] Verify `adaptiveIcon` settings are correct.

---

## ✅ Step 2: Digital Asset Links (Optional but Recommended)
- [ ] Create `assetlinks.json` for App Links support.
- [ ] Place it at `https://www.strathspace.com/.well-known/assetlinks.json`.

---

## ✅ Step 3: Google Play Console Setup
1. Go to [Google Play Console](https://play.google.com/console).
2. Create a new app:
   - **App Name:** StrathSpace
   - **Default Language:** English (United States)
   - **App or Game:** App
   - **Free or Paid:** Free
3. **Set up your app (Finish all tasks):**
   - [ ] Privacy Policy: `https://www.strathspace.com/privacy`
   - [ ] App Access: Use the demo account (`demo@strathspace.com` / `AppleReview2026!`)
   - [ ] Content Rating: Complete the questionnaire.
   - [ ] Target Audience and Content: Select age-appropriate audience (13+ or 18+).
   - [ ] News Apps: Select "No".
   - [ ] COVID-19 tracing and status apps: Select "My app is not a publicly available COVID-19 tracing or status app".
   - [ ] Data Safety: Disclose what data you collect (Email, User ID, Photos, Messages).
   - [ ] Government Apps: Select "No".

---

## ✅ Step 4: Internal/Closed Testing
Google now requires most new accounts to run a **Closed Test** with at least 20 testers for 14 days before applying for Production.
- [ ] Set up a Closed testing track.
- [ ] Add 20 tester emails.
- [ ] Maintain the test for 14 consecutive days.

---

## ✅ Step 5: Build & Upload (EAS)
```bash
# Build Android App Bundle (AAB)
eas build --platform android --profile production
```
- [ ] After build, download the `.aab` file.
- [ ] Upload the `.aab` to the Google Play Console track.

---

## ✅ Step 6: Store Listing
- [ ] **Short Description:** (80 chars)
  `The campus community hub for Strathmore University students. Connect and grow.`
- [ ] **Full Description:** (Copy from Apple checklist)
- [ ] **Graphics:**
  - [ ] App Icon (512x512 PNG)
  - [ ] Feature Graphic (1024x500 PNG)
  - [ ] Phone Screenshots (At least 4)
  - [ ] Tablet Screenshots (Optional)

---

## ✅ Step 7: Final Submission
- [ ] Review and rollout release to Internal/Closed testing.
- [ ] Request Production access (after 14-day test period).

---
*Last Updated: January 23, 2026*
