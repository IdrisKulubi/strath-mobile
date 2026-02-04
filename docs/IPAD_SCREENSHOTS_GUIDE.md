# iPad Screenshots Guide for App Store Connect

> Fixing Guideline 2.3.3 - iPad screenshots must not be stretched iPhone images

## Your Setup
- **Development machine**: Windows PC
- **Mac available**: Separate Mac (for iPad simulator)

---

## Step 1: Transfer Project to Mac

### Option A: Clone from GitHub (Easiest)

On the Mac, open Terminal:
```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/smobile.git

# Navigate to project
cd smobile/strath-mobile

# Install dependencies
npm install
```

### Option B: USB Drive / Cloud Transfer

1. On Windows: Zip the `strath-mobile` folder
2. Transfer via USB drive, Google Drive, or AirDrop
3. On Mac: Unzip and open Terminal in that folder
4. Run `npm install`

### Option C: Use Expo's Cloud Build (No Code Transfer)

If your app is on Expo, you can download the build directly:
```bash
# On Mac, install EAS CLI
npm install -g eas-cli

# Login to same Expo account
eas login

# Download your latest build
eas build:list --platform ios

# Or run directly via Expo Go
```

---

## Step 2: Setup Mac Environment (One-Time)

On the Mac, run these commands in Terminal:

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Expo CLI
npm install -g expo-cli

# Install EAS CLI (for builds)
npm install -g eas-cli

# Verify Xcode is installed (required for simulator)
xcode-select --install
```

**Important**: Make sure Xcode is installed from the App Store (it's free).

---

## Step 3: Run on iPad Simulator

```bash
# Navigate to your project folder
cd /path/to/strath-mobile

# Install dependencies (if not done)
npm install

# Start Expo
npx expo start
```

When Expo starts:
1. Press `i` to open iOS simulator
2. If asked, select **iPad Pro (12.9-inch)**

Or specify directly:
```bash
npx expo start --ios --device "iPad Pro (12.9-inch)"
```

---

## Step 4: Select iPad Pro 12.9" Simulator

If the wrong simulator opens:

1. In Simulator app menu: **File → Open Simulator → iPad Pro (12.9-inch)**
2. Or via Terminal:
```bash
# List available simulators
xcrun simctl list devices available | grep iPad

# Boot iPad Pro 12.9"
xcrun simctl boot "iPad Pro (12.9-inch) (6th generation)"

# Open Simulator app
open -a Simulator
```

---

## Step 5: Take Screenshots

With your app running on the iPad simulator:

1. Navigate to each screen in your app
2. Press **Cmd + S** to save screenshot
3. Screenshots save to Desktop

### Required Screenshots (5 minimum)

| Screen | Why |
|--------|-----|
| Login | Shows "Sign in with Apple" button |
| Discover/Swipe | Main feature |
| Profile | User experience |
| Matches | Core feature |
| Chat | Messaging feature |

---

## Step 6: Transfer Screenshots Back to Windows

### Option A: AirDrop to iPhone, then transfer
### Option B: Email to yourself
### Option C: Upload directly to App Store Connect from Mac

**Recommended**: Upload directly from Mac to App Store Connect

1. Open Safari on Mac
2. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
3. Login with your Apple Developer account
4. Select your app → App Store → Screenshots
5. Select "iPad Pro (6th Gen) 12.9" Display"
6. Drag & drop screenshots from Desktop
7. Save

---

## Quick Checklist

### On Mac (one-time setup):
- [ ] Xcode installed from App Store
- [ ] Node.js installed (`brew install node`)
- [ ] Project cloned/transferred

### For screenshots:
- [ ] Run `npm install` in project folder
- [ ] Run `npx expo start`
- [ ] Open iPad Pro 12.9" simulator
- [ ] Take 5+ screenshots (Cmd + S)
- [ ] Upload to App Store Connect

---

## Alternative: Use Expo Go on Mac

If you don't want to transfer code:

1. On Mac, install **Expo Go** in the simulator
2. On Windows, run `npx expo start`
3. Copy the `exp://` URL shown
4. On Mac simulator, open Safari and paste the URL
5. App loads via Expo Go

This works if both machines are on the same network, or use tunnel:
```bash
# On Windows
npx expo start --tunnel
```

---

## Troubleshooting

### "Command not found: npx"
```bash
brew install node
```

### "Simulator not opening"
```bash
open -a Simulator
```
Then File → Open Simulator → iPad Pro 12.9"

### "App not loading"
Make sure you're in the correct folder:
```bash
cd strath-mobile
ls package.json  # Should show the file
npm install
npx expo start
```

### "Need Apple Developer account"
The simulator doesn't need a developer account. Only App Store Connect upload does.

---

## Summary

1. **Transfer project** to Mac (git clone or USB)
2. **Install dependencies**: `npm install`
3. **Start app**: `npx expo start` → press `i` → select iPad
4. **Screenshot**: Cmd + S on each screen
5. **Upload**: App Store Connect from Mac's browser

**Total time: ~45 minutes** (including setup)

