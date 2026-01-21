# Apple App Store Submission Checklist for Strathspace

## 🎯 Pre-Submission Summary

**App Name:** Strathspace (or "Campus Community" if dating concerns arise)
**Category:** Social Networking (NOT Dating)
**Demo Account:** demo@strathspace.com / AppleReview2026!

---

## ✅ Step 1: Domain & Backend Configuration

### 1.1 Update Production Domain
- [ ] Ensure `strathspace.com` domain is configured and pointing to Vercel
- [ ] Update environment variables in Vercel:
  ```
  NEXT_PUBLIC_APP_URL=https://www.strathspace.com
  BETTER_AUTH_URL=https://www.strathspace.com
  ```

### 1.2 Update Mobile App API URL
- [ ] In `strath-mobile/.env` or `app.json`, set:
  ```
  EXPO_PUBLIC_API_URL=https://www.strathspace.com
  ```

### 1.3 Verify Backend is Deployed
- [ ] Run: `git push` in backend folder to trigger Vercel deployment
- [ ] Test API: Visit `https://strathspace.com/api/health` (or similar endpoint)

---

## ✅ Step 2: Demo Account Setup

**KEEP THE DEMO ACCOUNT!** Apple reviewers need it.

### 2.1 Verify Demo Login Works
- [ ] Open the app
- [ ] Tap "Demo Login (For Review)"
- [ ] Should log in as demo@strathspace.com
- [ ] Verify profile loads correctly

### 2.2 Demo Account Credentials (for App Store Connect)
```
Email: demo@strathspace.com
Password: AppleReview2026!
```

---

## ✅ Step 3: App Store Connect Setup

### 3.1 Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform:** iOS
   - **Name:** Strathspace
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** Select your bundle ID (from Xcode/EAS)
   - **SKU:** strathspace-ios-2026
   - **User Access:** Full Access

### 3.2 App Information
- [ ] **Category:** Social Networking
- [ ] **Secondary Category:** Education (optional)
- [ ] **Content Rights:** Confirm you own rights to all content
- [ ] **Age Rating:** Complete questionnaire (likely 12+ for social networking)

### 3.3 App Privacy
- [ ] Complete Privacy Policy URL: `https://strathspace.com/privacy`
- [ ] Data Collection disclosure:
  - Contact Info (email)
  - User Content (photos, messages)
  - Identifiers (user ID)
  - Usage Data

---

## ✅ Step 4: Build & Upload

### 4.1 Update app.json for Production
```json
{
  "expo": {
    "name": "Strathspace",
    "slug": "strathspace",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.strathspace.app",
      "buildNumber": "1"
    }
  }
}
```

### 4.2 Build for App Store
```bash
# Make sure you're logged in to EAS
eas login

# Build for iOS App Store
eas build --platform ios --profile production

# Or if you need to create a production profile first:
eas build:configure
```

### 4.3 Submit to App Store
```bash
# After build completes, submit
eas submit --platform ios

# Or manually upload via Transporter app
```

---

## ✅ Step 5: App Store Listing

### 5.1 Screenshots Required
- [ ] 6.7" (iPhone 15 Pro Max): 1290 x 2796px (required)
- [ ] 6.5" (iPhone 14 Plus): 1284 x 2778px
- [ ] 5.5" (iPhone 8 Plus): 1242 x 2208px

**Recommended screenshots:**
1. Login/Welcome screen
2. Explore/Events screen
3. Profile view
4. Chat conversation
5. Opportunities screen

### 5.2 App Description
```
Strathspace - Your Campus Community Hub

Connect with fellow students at Strathmore University! Strathspace brings your campus community together in one app.

🎓 CAMPUS EVENTS
Discover and join campus events, workshops, and social gatherings. Never miss out on what's happening at your university.

💼 OPPORTUNITIES
Find internships, jobs, and career opportunities shared by your campus network.

💬 CONNECT & CHAT
Meet students from different courses and years. Chat, network, and build meaningful campus connections.

👤 YOUR PROFILE
Showcase your interests, course, and what makes you unique to the campus community.

Built exclusively for Strathmore University students. Verify with your university email to join.
```

### 5.3 Keywords (100 characters max)
```
campus,university,students,strathmore,events,networking,college,social,community,opportunities
```

### 5.4 What's New (for updates)
```
Initial release of Strathspace - Your Campus Community Hub!
- Discover campus events and activities
- Find opportunities and internships
- Connect with fellow students
- Chat and build your campus network
```

---

## ✅ Step 6: Review Information

### 6.1 Demo Account (REQUIRED)
In App Store Connect → App Review Information:
- [ ] Sign-In Required: **YES**
- [ ] Demo Account Username: `demo@strathspace.com`
- [ ] Demo Account Password: `AppleReview2026!`

### 6.2 Notes for Reviewer
```
Thank you for reviewing Strathspace!

DEMO ACCOUNT:
Email: demo@strathspace.com
Password: AppleReview2026!

Tap "Demo Login (For Review)" on the login screen to access the app.

ABOUT THE APP:
Strathspace is a campus community app exclusively for Strathmore University students in Kenya. It helps students:
- Discover campus events and activities
- Find internships and job opportunities
- Connect with fellow students
- Build their campus network

The app requires university email verification for regular sign-up, but the demo account allows full access for review purposes.

If you have any questions, please contact: [your-email@domain.com]
```

### 6.3 Contact Information
- [ ] First Name
- [ ] Last Name  
- [ ] Phone Number
- [ ] Email Address

---

## ✅ Step 7: Final Checks Before Submission

### Code & Functionality
- [ ] Demo login works on production API
- [ ] Google Sign-In works (or is properly hidden)
- [ ] All screens load without crashes
- [ ] Events display correctly
- [ ] Opportunities display correctly
- [ ] Chat functionality works
- [ ] Profile can be viewed and edited
- [ ] "Looking For" section is hidden (commented out)

### Content & UI
- [ ] No placeholder/Lorem ipsum text
- [ ] All images load properly
- [ ] No broken links
- [ ] App name is consistent everywhere
- [ ] Icons and splash screen are production-ready

### Legal & Privacy
- [ ] Privacy Policy is accessible at URL
- [ ] Terms of Service is accessible
- [ ] Data handling disclosures are accurate

---

## ✅ Step 8: Submit for Review

1. In App Store Connect, go to your app
2. Click on the build you want to submit
3. Fill in all required metadata
4. Add screenshots for all required sizes
5. Complete the Review Information section with demo credentials
6. Click "Submit for Review"

---

## ⏱️ Expected Timeline

- **Initial Review:** 24-48 hours (can be longer)
- **If Rejected:** Address feedback and resubmit
- **After Approval:** App goes live (or you schedule release)

---

## 🚨 Common Rejection Reasons to Avoid

1. **Guideline 4.3 - Spam:** App must have unique value (we have campus-specific features ✓)
2. **Guideline 5.1.1 - Data Collection:** Must have privacy policy (add to strathspace.com/privacy)
3. **Guideline 2.1 - Crashes:** Test thoroughly before submission
4. **Guideline 4.2 - Minimum Functionality:** Ensure all features work (events, opportunities, chat)
5. **Guideline 5.6 - Developer Code of Conduct:** Demo account must work for reviewers

---

## 📝 Post-Approval Tasks

After app is approved:
- [ ] Uncomment "Looking For" sections in profile UI
- [ ] Add dating-related features back (if desired)
- [ ] Update app description to include social/connection features
- [ ] Submit update with restored features

---

## 📞 Support Contacts

- **Apple Developer Support:** https://developer.apple.com/contact/
- **App Store Connect Help:** https://help.apple.com/app-store-connect/
- **EAS Build Issues:** https://docs.expo.dev/build/introduction/

---

Last Updated: January 21, 2026
