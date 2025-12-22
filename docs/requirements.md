# StrathSpace 2.0 Requirements Document

## Document Purpose
This document defines the functional, technical, and non-functional requirements for the development of StrathSpace 2.0, a mobile-first social discovery app for university students. It serves as the single source of truth for product, engineering, and design teams.

## 1. Product Overview
StrathSpace 2.0 is a modern social discovery platform that helps university students connect through:
*   **Dating**
*   **Friendship**
*   **Shared interests and campus culture**

The platform prioritizes:
*   Safety
*   Fun
*   High engagement
*   Mobile-first UX
*   Privacy-aware interactions

## 2. Target Users
### Primary Users
*   University students (18–30 years)
*   Enrolled in Kenyan universities (initial rollout)
*   Mobile-first users (Android & iOS)

### User Segments
*   Students seeking dating connections
*   Students seeking friendships only
*   Students exploring campus social life

## 3. Platforms & Tech Stack
### Frontend
*   **Expo (React Native)**
*   **TypeScript**
*   Mobile-first UI (iOS & Android)
*   Shared design system across platforms

### Backend
*   **Node.js** (Next.js API routes or Express)
*   **Neon Serverless Postgres**
*   **Drizzle ORM**
*   **BetterAuth** for authentication
*   Real-time messaging (**Pusher** or equivalent)

### Infrastructure
*   Serverless deployment
*   Environment-based configuration
*   Secure API access
*   Scalable architecture

## 4. Core Features & Functional Requirements
### 4.1 Authentication & Onboarding
**Requirements:**
*   Email & password authentication
*   University email verification
*   Secure session handling
*   Password reset flow
*   Logout from all devices

**Onboarding Flow:**
*   Create account
*   Select mode: Dating or Friends
*   Set profile basics
*   Choose interests
*   Enable discover visibility

### 4.2 User Profiles
**Profile Fields:**
*   Full name, Username (unique), Age, Gender, University, Bio
*   Interests (multi-select)
*   Profile photos
*   Last active timestamp

**Requirements:**
*   Edit profile anytime
*   Upload and reorder multiple images
*   Toggle visibility in discover feed

### 4.3 Discover / Explore Feed
**Requirements:**
*   Swipe-based profile discovery
*   Smart recommendation logic:
    *   User preferences
    *   Interest overlap
    *   Same university bias
    *   Recent activity
*   Exclude blocked users and already swiped profiles
*   Infinite scrolling
*   Graceful empty states

### 4.4 Swipe & Matching
*   Like / Pass interactions
*   Mutual likes create matches
*   Instant match notification
*   Prevent duplicate swipes
*   Match persistence

### 4.5 Messaging (Chat)
*   One-on-one chat for matched users
*   Real-time message delivery (text and images)
*   Typing indicators and message timestamps
*   Read receipts (optional)

### 4.6 Friends Mode (Non-Dating)
*   Separate onboarding path
*   No swiping pressure; Interest-based discovery
*   Friend requests instead of likes
*   Playful interactions: Nudge, Wave, Send meme
*   Ability to message after connection

### 4.7 Notifications
*   **Types:** New match, New message, Friend request, System updates
*   **Requirements:** In-app notifications, Push notification ready, Mark as read, Notification history

### 4.8 Safety, Privacy & Moderation
*   Report and Block user functionality
*   Content moderation hooks
*   Profile visibility controls
*   Secure data storage and minimal data exposure

### 4.9 Admin & Moderation Panel (Backend Only)
*   View users and reports
*   Disable accounts
*   Remove abusive content
*   Monitor growth metrics

## 5. Algorithms & Logic
*   **Matching Algorithm:** Preference filtering, interest similarity scoring, activity-based ranking, and university-based weighting.
*   **Friend Discovery Logic:** Shared interests first, mutual activity patterns, and group suggestions (future-ready).

## 6. Performance Requirements
*   App launch < 2 seconds
*   Discover feed load < 1 second
*   Message delivery < 500ms
*   Smooth animations (60 FPS)
*   Efficient memory usage

## 7. Security Requirements
*   Encrypted authentication tokens
*   Secure password hashing
*   Input validation (Zod)
*   API rate limiting
*   Ownership-based data access
*   Protection against abuse & spam

## 8. Scalability & Reliability
*   Serverless backend with horizontal scaling
*   Database indexing
*   Graceful failure handling
*   Real-time reliability

## 9. Analytics & Metrics
Track: User sign-ups, DAU, Retention rate, Matches per user, Messages sent, Feature engagement.

## 10. UX & Design Principles
*   Mobile-first, Gen Z friendly
*   Minimal friction, playful interactions
*   Modern UI (Bumble + Tinder inspired)
*   Smooth transitions (GSAP-inspired motion concepts)

## 11. Compliance & Ethics
*   Age restriction (18+)
*   Data privacy best practices
*   Consent-driven interactions
*   Transparent community guidelines

## 12. Future-Ready (Out of Scope)
*   Events & meetups
*   Group chats
*   AI-powered suggestions
*   Campus-based challenges
*   Social gamification

## 13. Success Criteria
*   All core flows work end-to-end
*   Backend and mobile app are fully integrated
*   Real-time chat works reliably
*   Users can discover, match, and message
*   App is ready for App Store & Play Store submission

## 14. Ownership
*   **Product:** StrathSpace
*   **Platform:** Mobile (Expo)
*   **Audience:** University students
*   **Status:** Active Development