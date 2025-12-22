# StrathSpace 2.0 Feature Specification

## Document Purpose
This document defines all user-facing and system features required for StrathSpace 2.0 to be considered feature-complete for public mobile launch.

## 1. Core Feature Categories
- Authentication & Accounts
- User Profiles
- Discover & Matching
- Messaging (Chat)
- Friends Mode (Non-Dating)
- Notifications
- Safety, Privacy & Moderation
- Admin & Insights
- Performance & Reliability
- Growth & Engagement

## 2. Authentication & Account Features
### 2.1 Account Creation
- Email & password signup
- University email verification
- Username uniqueness validation
- Age restriction (18+)
- Secure password hashing

### 2.2 Login & Sessions
- Secure login
- Persistent sessions
- Logout (single device & all devices)
- Session expiry handling

### 2.3 Account Recovery
- Password reset via email
- Invalid/expired token handling

## 3. User Profile Features
### 3.1 Profile Creation
- Name
- Username
- Age
- Gender
- University
- Short bio
- Interests (multi-select)
- Profile images (up to defined limit)

### 3.2 Profile Editing
- Edit bio & interests
- Reorder profile photos
- Replace/delete photos
- Toggle profile visibility

### 3.3 Profile Viewing
- Full-screen profile view
- Scrollable photo gallery
- Profile detail sheet (like Tinder)
- View mutual interests

## 4. Discover & Matching Features
### 4.1 Discover Feed
- Swipeable profile cards
- Smart ordering (algorithm-based)
- Infinite loading
- Empty state handling

### 4.2 Swipe Actions
- Like (right swipe)
- Pass (left swipe)
- Prevent reswiping same profile
- Optimistic UI updates

### 4.3 Matching Logic
- Mutual likes create matches
- Instant match feedback
- Match persistence in database

## 5. Messaging (Chat) Features
### 5.1 One-on-One Chat
- Text messaging
- Real-time delivery
- Message timestamps
- Message status (sent, delivered)

### 5.2 Chat UI
- Chat list view
- Conversation view
- Message bubbles (sender/receiver)
- Auto-scroll on new messages

### 5.3 Chat Controls
- Block user from chat
- Report user from chat
- Unmatch (optional)

## 6. Friends Mode (Non-Dating)
### 6.1 Friends-Only Onboarding
- Skip dating setup
- Interest-first profile creation
- Casual profile format

### 6.2 Friend Discovery
- Interest-based suggestions
- No swiping pressure
- Feed-style browsing

### 6.3 Friend Requests
- Send request
- Accept / reject request
- Mutual acceptance unlocks chat

### 6.4 Playful Interactions
- Nudge
- Wave
- React with emoji
- Send meme (future-ready)

## 7. Notifications
### 7.1 In-App Notifications
- New match
- New message
- Friend request
- System announcements

### 7.2 Notification Management
- Read/unread states
- Notification history
- Clear notifications

## 8. Safety, Privacy & Moderation
### 8.1 User Controls
- Block user
- Report user
- Hide profile from discover

### 8.2 Privacy
- Limited profile visibility
- Data minimization
- Secure media access

### 8.3 Moderation Tools
- Report reason selection
- Abuse flagging
- Admin review hooks

## 9. Admin & Insights (Internal)
### 9.1 User Management
- View users
- Disable accounts
- View reported profiles

### 9.2 Platform Insights
- Total users
- Active users
- Matches created
- Messages sent
- Growth trends

## 10. Performance & Reliability Features
- Fast app launch
- Smooth swipe animations
- Efficient image loading
- Offline-safe states
- Error boundaries

## 11. Growth & Engagement Features
### 11.1 Engagement Mechanics
- Profile view counts
- Match feedback animations
- Empty feed encouragement

### 11.2 Viral Growth Hooks
- Share profile link
- Invite friends
- Referral-ready architecture

## 12. Non-Functional Features
- Mobile-first UX
- High responsiveness
- Scalable backend
- Secure APIs
- Maintainable codebase

## 13. Out of Scope (Planned Later)
- Live video / speed dating
- Group chats
- Events & meetups
- AI matching assistant
- Monetization features

## 14. Definition of “Feature Complete”
StrathSpace 2.0 is feature-complete when:
- Users can sign up, discover, match, and chat
- Friends-only mode works end-to-end
- Safety & moderation features are live
- Admin tools exist for monitoring
- App is ready for App Store & Play Store submission