# Strathspace Web Version - Design Document

> A Tinder/Bumble-style web application built into the existing backend (strathspace.com)

## 📋 Overview

### Project Goal
Create a web version of Strathspace that provides the core dating experience (profile creation, swiping, matching, messaging) by adding web pages directly to the existing `strath-backend` Next.js project. This creates a **monolithic full-stack app** that serves both the mobile API and the web frontend from a single deployment.

### Tech Stack
- **Framework**: Next.js 16+ (App Router) - **existing strath-backend**
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query) + Server Actions
- **Auth**: Better Auth (same as mobile, cookie-based for web)
- **Animations**: Framer Motion
- **Real-time**: Server-Sent Events or polling (for chat)
- **Deployment**: Vercel (already deployed at strathspace.com)

### Architecture
```
┌─────────────────────────────────────────────────────────────────────┐
│              UNIFIED NEXT.JS APP (strath-backend)                   │
│                    Deployed at strathspace.com                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SHARED LAYER                              │   │
│  │  - Database (Neon PostgreSQL)                                │   │
│  │  - Drizzle ORM & Schema                                      │   │
│  │  - Better Auth                                               │   │
│  │  - Utility Functions                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                         │                                           │
│         ┌───────────────┴───────────────┐                          │
│         ▼                               ▼                          │
│  ┌─────────────────┐         ┌─────────────────────────────┐      │
│  │   /api/*        │         │   Web Pages                  │      │
│  │   (REST API)    │         │   - / (landing)              │      │
│  │                 │         │   - /login, /register        │      │
│  │  Used by:       │         │   - /onboarding/*            │      │
│  │  - Mobile App   │         │   - /app/discover            │      │
│  │  - Web (fetch)  │         │   - /app/matches             │      │
│  │                 │         │   - /app/chat/[id]           │      │
│  │                 │         │   - Server Actions           │      │
│  └─────────────────┘         └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐
│   MOBILE APP        │      │   WEB BROWSER       │
│   (Expo/React      │      │                     │
│    Native)          │      │   - Desktop         │
│   - iOS             │      │   - Tablet          │
│   - Android         │      │   - Mobile Web      │
│   Calls /api/*      │      │   Direct rendering  │
└─────────────────────┘      └─────────────────────┘
```

### Key Benefits of This Architecture
1. **Single deployment** - One Vercel project, one domain
2. **Shared code** - Database queries, auth, utils used by both API and web
3. **Server Actions** - Web can use direct server functions (faster than API calls)
4. **Same domain** - No CORS issues for web, cookies work seamlessly
5. **Cost efficient** - No additional hosting costs

---

## 📁 Updated Project Structure (strath-backend)

```
backend/strath-backend/
├── src/
│   ├── app/
│   │   │
│   │   │── api/                    # 🔹 EXISTING - Mobile API Routes
│   │   │   ├── auth/[...all]/      # Better Auth
│   │   │   ├── user/               # User/Profile endpoints
│   │   │   ├── discover/           # Discovery endpoints
│   │   │   ├── matches/            # Matches & messages
│   │   │   ├── upload/             # S3 presigned URLs
│   │   │   └── ...
│   │   │
│   │   │── (web)/                  # 🆕 WEB PAGES (grouped route)
│   │   │   ├── layout.tsx          # Web-specific root layout
│   │   │   ├── page.tsx            # Landing page (/)
│   │   │   │
│   │   │   ├── (auth)/             # Auth pages
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── register/page.tsx
│   │   │   │   └── layout.tsx      # Auth layout (centered card)
│   │   │   │
│   │   │   ├── onboarding/         # Onboarding flow
│   │   │   │   ├── page.tsx        # Multi-step form
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   └── app/                # Main authenticated app
│   │   │       ├── layout.tsx      # Sidebar layout
│   │   │       ├── discover/page.tsx
│   │   │       ├── matches/page.tsx
│   │   │       ├── chat/[matchId]/page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       ├── profile/edit/page.tsx
│   │   │       └── settings/page.tsx
│   │   │
│   │   └── layout.tsx              # Root layout (providers)
│   │
│   ├── components/
│   │   ├── ui/                     # 🆕 shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   │
│   │   └── web/                    # 🆕 Web-specific components
│   │       ├── landing/
│   │       │   ├── hero.tsx
│   │       │   ├── features.tsx
│   │       │   └── footer.tsx
│   │       ├── auth/
│   │       │   ├── login-form.tsx
│   │       │   └── google-button.tsx
│   │       ├── discover/
│   │       │   ├── swipe-card.tsx
│   │       │   ├── card-stack.tsx
│   │       │   └── match-modal.tsx
│   │       ├── chat/
│   │       │   ├── message-list.tsx
│   │       │   ├── message-input.tsx
│   │       │   └── chat-header.tsx
│   │       ├── matches/
│   │       │   ├── match-card.tsx
│   │       │   └── matches-grid.tsx
│   │       ├── profile/
│   │       │   ├── profile-card.tsx
│   │       │   ├── photo-upload.tsx
│   │       │   └── edit-form.tsx
│   │       └── onboarding/
│   │           ├── step-basics.tsx
│   │           ├── step-photos.tsx
│   │           ├── step-interests.tsx
│   │           └── step-bio.tsx
│   │
│   ├── actions/                    # 🆕 Server Actions (web only)
│   │   ├── auth.ts                 # signIn, signUp, signOut
│   │   ├── profile.ts              # updateProfile, uploadPhoto
│   │   ├── discover.ts             # getProfiles, swipe
│   │   ├── matches.ts              # getMatches, unmatch
│   │   └── messages.ts             # sendMessage, getMessages
│   │
│   ├── db/                         # 🔹 EXISTING - Shared
│   │   └── schema.ts
│   │
│   └── lib/                        # 🔹 EXISTING - Shared
│       ├── auth.ts                 # Better Auth server
│       ├── db.ts                   # Drizzle client
│       ├── api-response.ts         # API helpers
│       └── utils.ts
│
├── public/                         # 🆕 Static assets for web
│   ├── images/
│   │   ├── hero-mockup.png
│   │   └── logo.svg
│   └── favicon.ico
│
├── styles/                         # 🆕 Global styles
│   └── globals.css                 # Tailwind + custom styles
│
├── components.json                 # 🆕 shadcn/ui config
├── tailwind.config.ts              # Update for web components
└── next.config.ts                  # May need updates
```

---

## 🔀 API vs Server Actions

### For Mobile App → Use API Routes
```typescript
// Mobile app calls REST endpoints
const response = await fetch(`${API_URL}/api/discover`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### For Web App → Use Server Actions (Preferred)
```typescript
// src/actions/discover.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function getDiscoverProfiles() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  // Direct database query - no HTTP overhead
  const profiles = await db.query.profiles.findMany({
    where: /* ... */,
    limit: 10,
  });

  return profiles;
}

export async function swipeProfile(targetUserId: string, action: "like" | "pass") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  // Insert swipe record
  await db.insert(swipes).values({
    oderId: session.user.id,
    odeeId: targetUserId,
    action,
  });

  // Check for match...
  return { matched: false };
}
```

### Using Server Actions in Components
```typescript
// src/components/web/discover/card-stack.tsx
"use client";

import { swipeProfile } from "@/actions/discover";
import { useTransition } from "react";

export function CardStack({ profiles }) {
  const [isPending, startTransition] = useTransition();

  const handleSwipe = (profileId: string, action: "like" | "pass") => {
    startTransition(async () => {
      const result = await swipeProfile(profileId, action);
      if (result.matched) {
        // Show match modal
      }
    });
  };

  return (/* ... */);
}
```

### Phase 1: Authentication & Onboarding
- [ ] **Landing Page**
  - [ ] Hero section with app preview
  - [ ] "Sign up" / "Log in" CTAs
  - [ ] Feature highlights
  - [ ] Footer with links

- [ ] **Authentication**
  - [ ] Google Sign In (OAuth)
  - [ ] Email/Password login
  - [ ] Session management (separate from mobile)
  - [ ] Protected routes

- [ ] **Onboarding Flow**
  - [ ] Step 1: Basic Info (Name, Birthday, Gender)
  - [ ] Step 2: Looking For (preference selection)
  - [ ] Step 3: Photo Upload (drag & drop, up to 6 photos)
  - [ ] Step 4: Interests Selection (bubble picker)
  - [ ] Step 5: Bio/Prompts
  - [ ] Step 6: Profile Preview & Confirm
  - [ ] Progress indicator

### Phase 2: Discovery (Swipe Interface)
- [ ] **Card Stack View**
  - [ ] Profile cards with photos (carousel)
  - [ ] Name, age, university, course
  - [ ] Bio preview
  - [ ] Interests tags
  - [ ] Distance indicator (optional)

- [ ] **Swipe Actions**
  - [ ] Swipe left (Pass) - keyboard: ← or X
  - [ ] Swipe right (Like) - keyboard: → or ♥
  - [ ] Drag animations (Framer Motion)
  - [ ] Button alternatives for desktop

- [ ] **Match Popup**
  - [ ] "It's a Match!" celebration modal
  - [ ] Both profile photos
  - [ ] "Send Message" or "Keep Swiping" CTAs

### Phase 3: Matches & Chat
- [ ] **Matches List**
  - [ ] Grid of matched profiles
  - [ ] New matches highlighted
  - [ ] Last message preview
  - [ ] Online status indicator
  - [ ] Unread message count

- [ ] **Chat Interface**
  - [ ] Message list (scrollable)
  - [ ] Message input with send button
  - [ ] Real-time message updates
  - [ ] Read receipts
  - [ ] Typing indicator
  - [ ] Message timestamps

- [ ] **Chat Features**
  - [ ] Text messages
  - [ ] Emoji picker
  - [ ] Image sharing (optional Phase 4)

### Phase 4: Profile Management
- [ ] **View Own Profile**
  - [ ] Profile preview (as others see it)
  - [ ] Edit button

- [ ] **Edit Profile**
  - [ ] Update photos (reorder, add, remove)
  - [ ] Edit bio
  - [ ] Update interests
  - [ ] Change preferences
  - [ ] Update prompts

- [ ] **Settings**
  - [ ] Account settings
  - [ ] Discovery preferences
  - [ ] Notification settings
  - [ ] Privacy settings
  - [ ] Logout
  - [ ] Delete account

---

## 🗂️ Page Structure

```
/                       → Landing page (unauthenticated)
/login                  → Login page
/register               → Registration page
/onboarding             → Onboarding flow
/onboarding/[step]      → Individual onboarding steps
/app                    → Main app (authenticated)
/app/discover           → Swipe interface (default)
/app/matches            → Matches list
/app/chat/[matchId]     → Chat conversation
/app/profile            → View own profile
/app/profile/edit       → Edit profile
/app/settings           → Settings page
```

---

## 🎨 UI/UX Design Guidelines

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│  Logo                              Profile │ Settings │     │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  Sidebar    │              Main Content                     │
│  - Discover │              (Cards / Chat / Profile)         │
│  - Matches  │                                               │
│  - Messages │                                               │
│  - Profile  │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

### Layout (Tablet/Mobile Web)
```
┌─────────────────────────┐
│  Logo        ≡ Menu     │
├─────────────────────────┤
│                         │
│    Main Content         │
│    (Full Width)         │
│                         │
├─────────────────────────┤
│ Home │ Match │ Chat │ Me│
└─────────────────────────┘
```

### Color Scheme (Match Mobile)
```css
:root {
  /* Primary */
  --primary: #ec4899;
  --primary-dark: #f43f5e;
  
  /* Background (Dark Mode Default) */
  --bg-primary: #0f0d23;
  --bg-card: #1a1a2e;
  --bg-surface: rgba(255, 255, 255, 0.06);
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  
  /* Accent */
  --accent-purple: #8b5cf6;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
}
```

### Swipe Card Design
- Card size: ~400px width on desktop, full width on mobile
- Photo aspect ratio: 3:4 (portrait)
- Rounded corners: 16px
- Shadow for depth
- Gradient overlay at bottom for text readability

---

## 🔌 API Endpoints (Mobile) vs Server Actions (Web)

| Feature | Mobile (API Route) | Web (Server Action) |
|---------|-------------------|---------------------|
| Get profiles | `GET /api/discover` | `getDiscoverProfiles()` |
| Swipe | `POST /api/discover/swipe` | `swipeProfile()` |
| Get matches | `GET /api/matches` | `getMatches()` |
| Send message | `POST /api/matches/[id]/messages` | `sendMessage()` |
| Update profile | `PATCH /api/user/me` | `updateProfile()` |
| Upload photo | `POST /api/upload/presigned` | `getUploadUrl()` |

### Shared Database Logic
Create shared query functions that both API routes and Server Actions can use:

```typescript
// src/lib/queries/discover.ts
import { db } from "@/lib/db";
import { profiles, swipes, blocks } from "@/db/schema";
import { and, eq, notInArray } from "drizzle-orm";

export async function getDiscoverableProfiles(userId: string, limit = 10) {
  // Get blocked user IDs
  const blockedIds = await db.query.blocks.findMany({
    where: eq(blocks.blockerId, userId),
    columns: { blockedId: true },
  });

  // Get already swiped IDs
  const swipedIds = await db.query.swipes.findMany({
    where: eq(swipes.oderId, userId),
    columns: { odeeId: true },
  });

  const excludeIds = [
    userId,
    ...blockedIds.map(b => b.blockedId),
    ...swipedIds.map(s => s.odeeId),
  ];

  return db.query.profiles.findMany({
    where: notInArray(profiles.userId, excludeIds),
    limit,
  });
}
```

```typescript
// API Route uses shared logic
// src/app/api/discover/route.ts
import { getDiscoverableProfiles } from "@/lib/queries/discover";

export async function GET(req: NextRequest) {
  const session = await getSessionWithFallback(req);
  const profiles = await getDiscoverableProfiles(session.user.id);
  return successResponse({ profiles });
}
```

```typescript
// Server Action uses same shared logic
// src/actions/discover.ts
"use server";
import { getDiscoverableProfiles } from "@/lib/queries/discover";

export async function getProfiles() {
  const session = await auth.api.getSession({ headers: await headers() });
  return getDiscoverableProfiles(session.user.id);
}
```

---

## 🔐 Authentication (Web vs Mobile)

### Web Authentication (Cookie-based)
```typescript
// src/actions/auth.ts
"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function getWebSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
```

### Protected Layout for Web
```typescript
// src/app/(web)/app/layout.tsx
import { getWebSession } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }) {
  const session = await getWebSession();
  
  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const profile = await getProfile(session.user.id);
  if (!profile?.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

---

## 📁 Recommended Project Structure

The web components will be added directly to the existing `strath-backend` project. See the "Updated Project Structure" section above for the full directory layout.

---

## 🔐 Authentication Flow (Web)

### Better Auth Web Setup
Better Auth already supports web cookies. The web app will use the same auth instance but with cookie-based sessions instead of Bearer tokens.

```typescript
// Web pages use cookies (automatic)
// src/app/(web)/app/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

### Session Handling
- **Web sessions**: Stored in httpOnly cookies (secure, automatic)
- **Mobile sessions**: Stored in SecureStore, sent via Bearer token
- **Same user** can be logged in on both platforms simultaneously
- **Sessions are independent** (logging out web doesn't affect mobile)

---

## ⚡ Key Component Implementations

### Swipe Card Stack (Framer Motion)
```typescript
// components/discover/card-stack.tsx
"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";

export function SwipeCard({ profile, onSwipe }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) onSwipe("like");
    else if (info.offset.x < -100) onSwipe("pass");
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate, opacity }}
      onDragEnd={handleDragEnd}
      className="absolute w-[400px] h-[600px] bg-card rounded-2xl shadow-xl"
    >
      {/* Card content */}
    </motion.div>
  );
}
```

### Real-time Chat
- Option 1: Polling (simple, works with current backend)
- Option 2: WebSockets (requires backend addition)
- Option 3: Pusher/Ably (third-party, easy setup)

---

## 📅 Development Phases

### Phase 0: Setup (Day 1)
- [ ] Install shadcn/ui in strath-backend
- [ ] Add Tailwind config for web components
- [ ] Create `(web)` route group structure
- [ ] Add Framer Motion dependency
- [ ] Create shared query functions (`/lib/queries/`)

### Phase 1: Landing & Auth (Week 1)
- [ ] Landing page with hero, features, CTA
- [ ] Login page with Google OAuth
- [ ] Register page
- [ ] Email/password auth
- [ ] Protected route middleware
- [ ] Auth server actions

### Phase 2: Onboarding (Week 1-2)
- [ ] Multi-step onboarding form
- [ ] Step 1: Basic Info
- [ ] Step 2: Looking For
- [ ] Step 3: Photo Upload (drag & drop)
- [ ] Step 4: Interests Selection
- [ ] Step 5: Bio/Prompts
- [ ] Step 6: Profile Preview
- [ ] Server actions for profile creation

### Phase 3: Discovery (Week 2-3)
- [ ] Card stack component with Framer Motion
- [ ] Swipe gestures & keyboard shortcuts
- [ ] Like/Pass animations
- [ ] Match modal celebration
- [ ] Server actions for swiping
- [ ] Empty state when no profiles

### Phase 4: Matches & Chat (Week 3-4)
- [ ] Matches grid page
- [ ] Match card component
- [ ] Chat interface
- [ ] Message list with timestamps
- [ ] Message input with emoji
- [ ] Real-time updates (polling or SSE)
- [ ] Read receipts

### Phase 5: Profile & Settings (Week 4)
- [ ] View own profile page
- [ ] Edit profile form
- [ ] Photo management (reorder, add, delete)
- [ ] Settings page
- [ ] Block/Report functionality
- [ ] Logout
- [ ] Delete account

### Phase 6: Polish (Week 5)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Performance optimization
- [ ] Testing

---

## 🚀 Deployment

### No Additional Setup Needed!
Since the web app is part of `strath-backend`, it deploys automatically with every push. The same Vercel deployment serves:
- `strathspace.com/` → Web landing page
- `strathspace.com/app/*` → Web app pages
- `strathspace.com/api/*` → Mobile API endpoints

### Environment Variables
No new env vars needed - the web app uses the same database, auth, and S3 configuration as the mobile API.

### URL Structure
| URL | Purpose |
|-----|---------|
| `strathspace.com` | Landing page |
| `strathspace.com/login` | Web login |
| `strathspace.com/register` | Web registration |
| `strathspace.com/onboarding` | Web onboarding |
| `strathspace.com/app/discover` | Swipe interface |
| `strathspace.com/app/matches` | Matches list |
| `strathspace.com/app/chat/[id]` | Chat |
| `strathspace.com/api/*` | Mobile API (unchanged)

---

## 🛠️ Setup Commands

Run these commands in the `strath-backend` directory to set up the web app:

```bash
# Navigate to backend
cd backend/strath-backend

# Install shadcn/ui (will create components.json)
npx shadcn@latest init

# Install Framer Motion for animations
npm install framer-motion

# Install additional dependencies
npm install @tanstack/react-query lucide-react

# Add shadcn components as needed
npx shadcn@latest add button card input label
npx shadcn@latest add dialog dropdown-menu avatar
npx shadcn@latest add form select textarea tabs
npx shadcn@latest add toast skeleton badge
```

---

## ✅ Definition of Done

Each feature is complete when:
- [ ] Functionality works as expected
- [ ] Responsive on desktop, tablet, mobile web
- [ ] Loading states implemented
- [ ] Error states handled
- [ ] Matches mobile app behavior
- [ ] Tested with real API

---

## 📝 Notes

### What's NOT included in Web v1:
- Events feature
- Opportunities feature  
- Feed/Social features
- Push notifications (use email instead)
- Apple Sign In (Google only on web)
- Anonymous mode
- Video chat

### Future Enhancements (v2):
- Video chat integration
- GIF support in chat
- Voice messages
- Profile verification
- Premium features

---

## 🔗 Resources

- [Tinder Web](https://tinder.com) - Reference design
- [Bumble Web](https://bumble.com) - Reference design
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Better Auth Docs](https://better-auth.com/) - Auth setup
