# Authentication Flow Handoff

This document explains how the StrathSpace mobile app authenticates against the same hosted backend used by the web app. It is written as implementation guidance for another agent that needs to reproduce this setup in a different mobile project.

## Goal

The target setup is:

- A locally running Expo mobile app can log in using the already hosted backend at `https://www.strathspace.com`.
- The mobile app and web app share the same Better Auth backend, database, users, accounts, and sessions.
- The web app can continue using cookie-based auth.
- The mobile app stores auth state in device secure storage and sends `Authorization: Bearer <session-token>` for API calls.
- Losing network access must not log the mobile user out. Only an explicit server-side auth failure should clear the session.

## High-Level Architecture

There are two apps in this repo:

- Mobile Expo app: `strath-mobile/`
- Next.js backend/web app: `strath-mobile/backend/strath-backend/`

They share one hosted backend URL:

```text
https://www.strathspace.com
```

The backend owns:

- Better Auth configuration.
- OAuth provider credentials.
- Database connection.
- User, account, session, profile, and app data tables.
- API routes used by both mobile and web.

The mobile app owns:

- Native login UI.
- Better Auth Expo client configuration.
- SecureStore-backed session persistence.
- Bearer-token API requests to the hosted backend.
- Offline-safe session bootstrap and route decisions.

## Important Files

Mobile auth files:

- `lib/auth-client.ts`
- `lib/auth-helpers.ts`
- `lib/api-client.ts`
- `lib/session-cache.ts`
- `app/(auth)/login.tsx`
- `app/index.tsx`
- `app/_layout.tsx`
- `components/session-bootstrap.tsx`
- `app.json`
- `.env.local`

Backend/web auth files:

- `backend/strath-backend/src/lib/auth.ts`
- `backend/strath-backend/src/lib/auth-client.ts`
- `backend/strath-backend/src/app/api/auth/[...all]/route.ts`
- `backend/strath-backend/src/app/api/auth/apple/route.ts`
- `backend/strath-backend/src/app/api/auth/demo/route.ts`
- `backend/strath-backend/src/lib/security.ts`
- `backend/strath-backend/src/lib/auth-helpers.ts`
- `backend/strath-backend/src/lib/web-cors-origins.ts`
- `backend/strath-backend/src/app/api/user/me/route.ts`
- `backend/strath-backend/src/db/schema.ts`
- `backend/strath-backend/.env.example`

## Dependencies Needed In The Mobile App

Install the same auth/runtime pieces:

```bash
npm install better-auth @better-auth/expo expo-secure-store expo-web-browser expo-apple-authentication
```

This project also uses Expo Router, React Query, and native storage helpers, but the core auth pieces are:

- `better-auth`
- `@better-auth/expo`
- `expo-secure-store`
- `expo-web-browser`
- `expo-apple-authentication` if native Apple sign-in is required

## Mobile Environment Configuration

The mobile app points to the hosted backend with:

```env
EXPO_PUBLIC_API_URL=https://www.strathspace.com
```

Current file:

```text
strath-mobile/.env.local
```

This is the key setting that allows a local Expo app to use the deployed backend. Do not point the mobile app to `localhost` unless you also run the Next.js backend locally and configure device networking correctly. For the shared-backend setup, use the deployed URL.

## Mobile Deep Link Scheme

The app scheme must be consistent everywhere. In this project it is:

```json
{
  "expo": {
    "scheme": "strathspace"
  }
}
```

Current file:

```text
strath-mobile/app.json
```

This must match the Better Auth Expo client config:

```ts
expoClient({
  scheme: "strathspace",
  storagePrefix: "strathspace",
  storage: SecureStore,
})
```

Android intent filters are case-sensitive. Keep the scheme lowercase and do not mix `strathSpace` with `strathspace` in the new app.

## Mobile Better Auth Client

Current file:

```text
strath-mobile/lib/auth-client.ts
```

What it does:

- Creates the Better Auth React client.
- Uses `EXPO_PUBLIC_API_URL`, falling back to `https://www.strathspace.com`.
- Adds the `@better-auth/expo` client plugin.
- Persists Better Auth cookies/session data in `expo-secure-store`.
- Exports `signIn`, `signUp`, `signOut`, and `useSession`.

Important implementation shape:

```ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "https://www.strathspace.com",
  plugins: [
    expoClient({
      scheme: "strathspace",
      storagePrefix: "strathspace",
      storage: SecureStore,
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

The `storagePrefix` matters because the helper code reads the same SecureStore keys that the Better Auth Expo plugin writes.

## Backend Better Auth Configuration

Current file:

```text
strath-mobile/backend/strath-backend/src/lib/auth.ts
```

The backend uses:

- `betterAuth`
- `drizzleAdapter`
- PostgreSQL schema from `src/db/schema.ts`
- Google provider
- Apple provider
- `@better-auth/expo` server plugin
- Trusted origins for web, mobile deep links, and Expo development URLs
- Long-lived native sessions

Important backend shape:

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    expo(),
    {
      id: "strathspace-trusted-origins",
      init: () => ({
        options: {
          trustedOrigins: TRUSTED_ORIGINS,
        },
      }),
    },
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: TRUSTED_ORIGINS,
});
```

For the other project, the hosted backend must include the target mobile app's custom scheme in trusted origins. If the other app uses a different scheme, add it to `MOBILE_TRUSTED_ORIGINS`.

Example:

```ts
const MOBILE_TRUSTED_ORIGINS = [
  "strathspace://",
  "strathspace:///",
  "strathspace://*",
  "exp://",
  "exp://localhost:8081",
  "exp://localhost:8082",
];
```

If the other app has a new scheme such as `otherapp`, add:

```ts
"otherapp://",
"otherapp:///",
"otherapp://*",
```

## Backend Auth Route

Current file:

```text
strath-mobile/backend/strath-backend/src/app/api/auth/[...all]/route.ts
```

This route exposes Better Auth's handlers through Next.js:

```ts
const { GET: baseGET, POST: basePOST } = toNextJsHandler(auth);
```

It wraps responses with CORS headers for allowed web origins. This is mainly for browser/web clients, but keep it because the same backend serves both web and mobile.

## Shared Database Tables

Current file:

```text
strath-mobile/backend/strath-backend/src/db/schema.ts
```

The important auth tables are:

- `user`
- `account`
- `session`
- `verification`

The `session` table stores `token`. Mobile API calls ultimately authenticate by matching the Bearer token against this value.

Important shape:

```ts
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});
```

## Why Mobile Uses Bearer Tokens

The web app can use cookies because it runs in the browser on the same backend domain.

The native mobile app should not rely on browser cookies for normal API calls. It stores the session in SecureStore and sends:

```http
Authorization: Bearer <session-token>
```

The backend first tries Better Auth's normal session resolution:

```ts
auth.api.getSession({ headers: req.headers })
```

If that fails, it falls back to manually checking the `Authorization` header against `session.token`.

Current file:

```text
strath-mobile/backend/strath-backend/src/lib/security.ts
```

Important implementation:

```ts
export async function getSessionWithBearerFallback(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (session) return session;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim().split(".")[0];
  if (!token) return null;

  const dbSession = await db.query.session.findFirst({
    where: eq(sessionTable.token, token),
    with: { user: true },
  });

  if (!dbSession || dbSession.expiresAt <= new Date()) return null;

  return {
    session: dbSession,
    user: dbSession.user,
  };
}
```

The `.split(".")[0]` is important. Better Auth cookie values may be signed as:

```text
<db-session-token>.<signature>
```

Mobile API calls need the raw database token.

All protected backend API routes should use `getSessionWithBearerFallback` or the wrapper in:

```text
backend/strath-backend/src/lib/auth-helpers.ts
```

Do not use only `auth.api.getSession()` on routes that mobile calls, or Bearer-token mobile requests may fail.

## SecureStore Keys Used On Mobile

Current file:

```text
strath-mobile/lib/auth-helpers.ts
```

Better Auth Expo plugin keys:

- `strathspace_cookie`
- `strathspace_session_data`

Custom native Apple/demo flow keys:

- `strathspace_session`
- `strathspace_session_token`
- `strathspace_user_id`

Profile route cache:

- `strathspace_profile_cache_v1`

The auth helper reads from all known locations so Google, Apple, and demo auth can share one downstream API flow.

Priority order:

1. Better Auth cached `session_data`.
2. Custom Apple/demo session blob.
3. Better Auth cookie store.
4. Legacy raw token key.

The exported helpers are:

- `getStoredAuth()`
- `getAuthToken()`
- `getCurrentUserId()`
- `getCurrentUser()`
- `getAuthHeaders()`
- `isAuthenticated()`
- `clearSession()`

## Google Login Flow

Current file:

```text
strath-mobile/app/(auth)/login.tsx
```

Flow:

- User taps "Continue with Google".
- Mobile calls:

```ts
await signIn.social({
  provider: "google",
  callbackURL: "/",
});
```

- Better Auth opens the provider/browser flow.
- Provider redirects back through the backend auth route.
- Better Auth Expo plugin receives the deep link and persists session data into SecureStore.
- The app waits until `getStoredAuth()` can read a token.
- The app calls `/api/user/me` using `apiFetch`.
- The app caches the profile route.
- The app routes the user to:

- `/(tabs)` if profile is complete and allowed in.
- `/onboarding` if no profile exists.
- `/verification` if face verification is required.
- `/waitlist` if waitlisted.

Important detail:

The code does not trust the redirect result alone. It waits for SecureStore to actually contain a token:

```ts
async function waitForStoredAuth(timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await authClient.getSession();
    const stored = await getStoredAuth();
    if (stored?.token) return stored;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return null;
}
```

This avoids a common Android issue where the browser closes before the deep-link handoff has fully persisted auth state.

## Apple Login Flow

Current files:

- `strath-mobile/app/(auth)/login.tsx`
- `strath-mobile/backend/strath-backend/src/app/api/auth/apple/route.ts`

This project uses a custom native Apple flow instead of relying only on Better Auth's browser social flow.

Mobile flow:

1. User taps Apple login on iOS.
2. App calls `AppleAuthentication.signInAsync`.
3. App sends Apple credential data to:

```http
POST https://www.strathspace.com/api/auth/apple
```

Body:

```json
{
  "identityToken": "...",
  "authorizationCode": "...",
  "fullName": {},
  "email": "user@example.com",
  "user": "apple-user-id"
}
```

Backend flow:

1. Verifies the Apple identity token against Apple's public keys.
2. Confirms the token audience matches `APPLE_CLIENT_ID` or optional `APPLE_EXPO_CLIENT_ID`.
3. Finds an existing `account` row for provider `apple`, or links by email, or creates a new user.
4. Inserts a row into `session`.
5. Returns `{ user, token, isNewUser }`.

Mobile then writes:

```ts
await SecureStore.setItemAsync("strathspace_session", JSON.stringify(sessionData));
await SecureStore.setItemAsync("strathspace_session_token", data.data.token);
```

After that, the same `routeAfterAuth()` logic is used as Google.

Backend env needed:

```env
APPLE_CLIENT_ID=...
APPLE_CLIENT_SECRET=...
APPLE_EXPO_CLIENT_ID=... # optional, useful for Expo Go/native test audience differences
```

Expo config needed:

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.strathspace.mobile"
    },
    "plugins": ["expo-apple-authentication"]
  }
}
```

## Demo Login Flow

Current files:

- `strath-mobile/app/(auth)/login.tsx`
- `strath-mobile/backend/strath-backend/src/app/api/auth/demo/route.ts`

Demo login is optional and controlled by a public feature flag.

Mobile checks:

```http
GET /api/public/feature-flags
```

If enabled, it shows "Continue as Demo".

Mobile calls:

```http
POST /api/auth/demo
```

Backend:

1. Checks feature flag `demoLoginEnabled`.
2. Finds the seeded demo user.
3. Creates a new `session` row.
4. Returns the raw session token and user.

Mobile stores the demo token in the same custom SecureStore keys used by the Apple flow:

```ts
await SecureStore.setItemAsync("strathspace_session", JSON.stringify(sessionData));
await SecureStore.setItemAsync("strathspace_session_token", sessionToken);
```

The rest of the app does not care whether the token came from Google, Apple, or demo. All API calls use `getAuthToken()`.

## API Client Flow

Current file:

```text
strath-mobile/lib/api-client.ts
```

All protected mobile API calls should use `apiFetch`.

What it does:

1. Builds the URL from `EXPO_PUBLIC_API_URL`.
2. Reads the current token from SecureStore through `getAuthToken()`.
3. Adds `Authorization: Bearer <token>`.
4. Handles JSON encoding.
5. Times out requests.
6. Separates network errors from auth errors.
7. Clears session only when the backend explicitly says the token is invalid/expired.

Important use:

```ts
const response = await apiFetch<{ data?: Profile }>("/api/user/me");
```

Equivalent raw fetch:

```ts
const token = await getAuthToken();
const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/me`, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

Prefer `apiFetch` so auth behavior stays consistent.

## Auth Failure Policy

The app intentionally does not log out on every `401`.

It logs out only when the response body clearly means the session is invalid, using codes such as:

- `SESSION_EXPIRED`
- `INVALID_TOKEN`
- `UNAUTHENTICATED`
- `USER_DELETED`
- `USER_BANNED`

Network failures, timeouts, CDN issues, and unknown server errors must keep the local session intact.

Current global handler:

```text
strath-mobile/components/session-bootstrap.tsx
```

It registers `setSessionExpiredHandler`, calls `clearSession()`, shows a toast, and routes to `/(auth)/login`.

## App Startup Flow

Current file:

```text
strath-mobile/app/index.tsx
```

Startup behavior:

1. Read SecureStore using `getStoredAuth()`.
2. If no token exists, route to `/(auth)/login`.
3. If token exists, read cached profile route from `lib/session-cache.ts`.
4. If cache exists for the same user, route immediately.
5. Refresh `/api/user/me` quietly in the background.
6. If no cache exists, call `/api/user/me` once.
7. If the network is down, still trust the token and route to `/(tabs)`.
8. If the server explicitly says auth expired, clear the session through the global handler.

This is what keeps local/offline launches from kicking a valid user back to login.

## Profile Routing After Login

Current files:

- `app/(auth)/login.tsx`
- `app/index.tsx`
- `lib/session-cache.ts`
- `lib/profile-access.ts`
- `backend/strath-backend/src/app/api/user/me/route.ts`

After login, the app calls:

```http
GET /api/user/me
Authorization: Bearer <token>
```

Backend resolves the session, finds the user's profile, and returns:

- `data: null` when the user is authenticated but has no profile yet.
- `data: <profile>` when the profile exists.

Mobile then routes based on profile state.

The key rule for another agent:

Authentication only proves identity. It does not mean onboarding is complete. Always fetch the current user/profile after login and route from that server state.

## Logout Flow

Current file:

```text
strath-mobile/lib/auth-helpers.ts
```

Logout calls:

```ts
await authClient.signOut();
```

Then it deletes all known local auth keys:

- `strathspace_session`
- `strathspace_session_token`
- `strathspace_user_id`
- `strathspace_cookie`
- `strathspace_session_data`
- cached profile route

Only call `clearSession()` when:

- The user manually signs out.
- The server explicitly says the session is expired/invalid.
- The account is deleted/banned.

Do not clear session on normal network failures.

## Local Mobile App Against Hosted Backend

To reproduce the current working setup in another app:

- Set the mobile env:

```env
EXPO_PUBLIC_API_URL=https://www.strathspace.com
```

- Set the Expo scheme in the target app's `app.json`:

```json
{
  "expo": {
    "scheme": "strathspace"
  }
}
```

If the other app must use a different scheme, update the hosted backend's `trustedOrigins` first.

- Configure mobile `authClient` with the same `baseURL`, scheme, storage prefix, and SecureStore storage.

- Start the mobile app locally:

```bash
npm run start
```

- Login with Google or Apple.

- Confirm SecureStore receives a token through Better Auth Expo or the custom Apple endpoint.

- Confirm API requests include:

```http
Authorization: Bearer <raw-session-token>
```

- Confirm backend protected routes use `getSessionWithBearerFallback`.

## Backend Requirements For Sharing With Another Mobile App

If another mobile app will share this same backend, the backend must know about that app.

Checklist:

- Add the mobile deep link scheme to `MOBILE_TRUSTED_ORIGINS` in `src/lib/auth.ts`.
- Add Expo development origins if needed, such as `exp://localhost:8081`.
- Add OAuth redirect/deep-link settings in Google/Apple provider dashboards if the scheme/package/bundle changes.
- Ensure all API routes used by the mobile app use `getSessionWithBearerFallback`.
- Ensure `EXPO_PUBLIC_API_URL` in the mobile app points to the hosted backend.
- Ensure the backend deployed environment has `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, and `APPLE_CLIENT_SECRET`.
- Ensure the database schema has the Better Auth-compatible `user`, `account`, `session`, and `verification` tables.

## Google Provider Notes

The mobile app uses Better Auth social login:

```ts
signIn.social({
  provider: "google",
  callbackURL: "/",
});
```

The backend's Google credentials live in the hosted backend environment:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

If another app has a different custom scheme, package name, or bundle identifier, the Google OAuth configuration may also need to allow that redirect/deep-link flow. Keep the backend URL as the OAuth web callback host, and let the Better Auth Expo plugin handle the final app handoff.

## Apple Provider Notes

Apple has stricter audience checks. In the custom Apple endpoint, the identity token audience must match:

```env
APPLE_CLIENT_ID=...
```

Optionally also:

```env
APPLE_EXPO_CLIENT_ID=...
```

If the new app has a different iOS bundle identifier, update the Apple developer configuration and backend environment accordingly.

## Common Mistakes To Avoid

- Do not point the local mobile app to `localhost` when the goal is to use the deployed backend.
- Do not mismatch `app.json` scheme and `expoClient({ scheme })`.
- Do not change `storagePrefix` without also updating every SecureStore key in `auth-helpers.ts`.
- Do not rely on cookies for mobile API calls. Send Bearer tokens.
- Do not protect mobile-called backend routes with only `auth.api.getSession()`. Use the Bearer fallback.
- Do not clear local session on network failure.
- Do not assume login means onboarding is done. Always fetch `/api/user/me` and route from profile state.
- Do not use signed cookie values directly as database tokens without stripping the suffix after `.`.
- Do not forget to add the mobile scheme to Better Auth trusted origins.

## Minimal Implementation Plan For The Other Agent

1. Copy or recreate `lib/auth-client.ts` with Better Auth Expo plugin.
2. Copy or recreate `lib/auth-helpers.ts` with SecureStore token reading and `clearSession()`.
3. Copy or recreate `lib/api-client.ts` and route all protected API calls through it.
4. Add `SessionBootstrap` at the app root to handle explicit session expiry.
5. Add an index/bootstrap route that checks local token first, then profile cache, then `/api/user/me`.
6. Build the login screen with Google first. Add Apple only if iOS/native Apple sign-in is required.
7. Set `EXPO_PUBLIC_API_URL=https://www.strathspace.com`.
8. Match `app.json` scheme with `expoClient.scheme`.
9. Confirm backend trusted origins include the app scheme.
10. Confirm protected backend endpoints use Bearer fallback auth.

## Sanity Test

Use this sequence after implementation:

1. Run the mobile app locally.
2. Confirm `EXPO_PUBLIC_API_URL` logs or resolves to `https://www.strathspace.com`.
3. Tap Google login.
4. Complete provider login.
5. Confirm the app returns from browser to the app.
6. Confirm SecureStore has Better Auth session data.
7. Confirm `/api/user/me` succeeds with Bearer token.
8. Kill and reopen the app.
9. Confirm it routes from local token/cache without requiring login.
10. Turn off network and reopen the app.
11. Confirm it does not log out just because the backend is unreachable.
12. Manually sign out.
13. Confirm SecureStore keys and cached profile are cleared.

## Auth Flow Summary

```text
Mobile login button
  -> Better Auth social login or custom Apple endpoint
  -> Hosted backend validates provider identity
  -> Backend creates/loads user and session in shared DB
  -> Mobile stores session token in SecureStore
  -> Mobile calls /api/user/me with Authorization: Bearer token
  -> Backend resolves token with getSessionWithBearerFallback
  -> Mobile caches profile route
  -> App routes to onboarding, verification, waitlist, or main tabs
```

That is the core pattern to reproduce: one hosted Better Auth backend, shared DB sessions, SecureStore on mobile, Bearer fallback on backend APIs, and offline-safe mobile bootstrapping.
