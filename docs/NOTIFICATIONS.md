# Notifications (Expo + Strathspace)

This project uses:
- **System notifications (push)** via `expo-notifications` + Expo Push service
- **In-app notifications** via the existing toast system (`ToastProvider` / `useToast`)

## What’s already wired

### Mobile
- Push registration + listeners: [hooks/use-push-notifications.ts](../hooks/use-push-notifications.ts)
- Bootstrap on app start: [app/_layout.tsx](../app/_layout.tsx)
- Backend registration call: [lib/services/notifications-service.ts](../lib/services/notifications-service.ts)

### Backend
- Save token to user: [backend/strath-backend/src/app/api/user/push-token/route.ts](../backend/strath-backend/src/app/api/user/push-token/route.ts)
- Send push helper: [backend/strath-backend/src/lib/notifications.ts](../backend/strath-backend/src/lib/notifications.ts)

## Step-by-step: get push notifications working (real installs)

### 1) Confirm you have `EXPO_PUBLIC_API_URL`
Mobile reads the API base URL from `EXPO_PUBLIC_API_URL`.

Example:
- `EXPO_PUBLIC_API_URL=https://www.strathspace.com`

### 2) Run the app on a physical device
Push tokens require a **real iOS/Android device**.

Notes:
- iOS simulator can’t receive push notifications.
- Android emulators are inconsistent; prefer a real Android device.

### 3) Ensure the Expo Project ID exists
The app fetches Expo push tokens using your EAS `projectId`.

It’s already in [app.json](../app.json) under:
- `expo.extra.eas.projectId`

### 4) Log in once (auth required)
Token registration calls `/api/user/push-token` which requires auth.

### 5) Verify the token is saved server-side
When the app starts, it:
- requests notification permission
- fetches `ExpoPushToken[...]`
- POSTs it to `/api/user/push-token`

If you want to validate quickly:
- check backend logs
- or inspect the `user.push_token` column in Postgres

### 6) Send a test push from the backend
The backend already sends pushes for events like:
- new message
- new match
- weekly drop

Those pushes include `data.type` and often `data.route` so tapping the notification opens the right screen.

## In-app notifications (when app is open)

When a push arrives while the app is in the foreground, iOS often won’t show a system banner.

To keep UX consistent, the app shows an **in-app toast** for foreground notifications using:
- `useToast()` inside `usePushNotifications()`

## Custom notification sound ("nice sound")

By default, pushes use the OS **default** sound.

To ship a custom sound in the installed app:

### A) Add a sound asset
Add a short sound file to the mobile app, for example:
- `strath-mobile/assets/sounds/strathspace_notification.wav`

Guidelines:
- Keep it short (0.5–2s)
- Prefer `.wav` or `.caf` for iOS compatibility

### B) Configure Expo to bundle the sound (recommended)
Add the Expo Notifications config plugin to [app.json](../app.json) **after the file exists**:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": ["./assets/sounds/strathspace_notification.wav"]
        }
      ]
    ]
  }
}
```

### C) Use the custom sound name in pushes
Update sends to include the sound name (filename only):

```ts
await sendPushNotification(user.pushToken, {
  title: "It’s a match 🎉",
  body: "Say hi to your new match",
  sound: "strathspace_notification.wav",
  channelId: "default",
  data: { type: "match", route: "/chat/<matchId>" }
});
```

### D) Android: match the channel sound
Android plays notification sounds **from the channel**, not per-notification.

When you switch to a custom sound, update the channel in:
- [hooks/use-push-notifications.ts](../hooks/use-push-notifications.ts)

```ts
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.MAX,
  sound: 'strathspace_notification',
});
```

Important:
- Android channel sound changes usually require either:
  - creating a **new** channel ID (recommended), or
  - the user reinstalling / clearing app notification settings

## Deep linking / opening the right screen

Recommended data payload keys:
- `type`: `match | message | call | generic`
- `route`: a string route, e.g. `/chat/<matchId>`
- `matchId`: when routing to chat

Mobile behavior:
- If `data.route` exists, the app navigates to it on tap.

## “Incoming call” notifications (important limitation)

If you need a true “incoming call” UI that can appear over the lock screen:
- iOS typically requires **CallKit**
- Android typically requires **full-screen intents**

Expo managed apps do not provide a complete CallKit-style experience out-of-the-box.

Practical approach for MVP:
- send a high-priority push with `type: "call"`
- on tap, route the user into an in-app call screen

If you later want the full native incoming-call experience, plan for a **Dev Client / prebuild** + native modules.
