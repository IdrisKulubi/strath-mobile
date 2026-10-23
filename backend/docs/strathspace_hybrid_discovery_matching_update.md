# StrathSpace Hybrid Discovery & AI Matching Backend Update

## Document Purpose

This document explains the updated StrathSpace matching direction for the coding agent/team.

The goal is to evolve StrathSpace from a simple candidate-pair matching system into a **hybrid discovery and AI-assisted matchmaking platform**.

This update is based on two major findings:

1. The current matching system can create candidate pairs correctly, but users are not converting into mutual matches fast enough.
2. User feedback shows that people want more control, more browsing, and more diverse match logic beyond just shared interests.

The new direction is:

> StrathSpace should combine AI-curated recommendations with user-controlled browsing, while prioritizing active, available, responsive users.

The backend should not only answer:

> “Who is compatible?”

It should answer:

> “Who is this user most likely to respond to, and who is most likely to respond back right now?”

---

# 1. Current Problem

## 1.1 Existing Issue

Users have complained that they are not getting enough matches.

Internal aggregate data showed that the existing matching engine was generating candidate pairs correctly, but the funnel was losing users before mutual matches formed.

The problem is not mainly failed database creation. The problem is:

- low response volume
- slow user replies
- inactive users being matched
- low reciprocal interest
- people not feeling in control
- users waiting to be chosen instead of choosing for themselves
- manual matchmaking becoming too hard to manage operationally

## 1.2 Manual Matching Limitation

Manual matchmaking helped the admin team create more intentional pairings, but it introduced a new operational problem.

Admins now have to:

- find good matches manually
- call or message users
- check availability
- wait for responses
- follow up when one person does not respond
- archive or cancel stale matches

This is not scalable.

Manual matching should remain available, but it should not be the main growth engine.

---

# 2. New User Feedback

The following feedback must directly shape the product update.

## 2.1 Feedback 1: Matching Should Not Only Be Based On Similarity

User feedback:

> “I feel like matching people purely on shared interest and likeness isn’t the best approach. What if I’d want someone who is different from me so that I can learn from how they work?”

This means the matching system should not only match people with the same interests, same lifestyle, or same personality signals.

Some users want:

- someone different from them
- someone from a different course
- someone with a different lifestyle
- someone who can expose them to new ways of thinking
- someone complementary, not identical

Therefore, the new backend must support **match diversity**.

## 2.2 Feedback 2: Users Want To Browse Profiles

User feedback:

> “Can you let us browse profiles? I think that’s the biggest issue. How can you find someone you are interested in? It’s like you are just waiting to be chosen and not choosing someone for yourself.”

This is a major product insight.

Users do not want StrathSpace to feel like a black box where the system chooses everything.

They want to:

- browse profiles
- choose people they are interested in
- feel in control
- explore beyond the daily match suggestions
- discover people themselves

Therefore, the app must support both:

1. **AI-curated recommendations**
2. **User-controlled browsing/explore mode**

---

# 3. Final Product Direction

The new StrathSpace matching product should have two main discovery flows.

## 3.1 Flow A: AI-Curated Matches

This is the intelligent recommendation system.

When a user opens the app, they should receive:

> “Your 5 Best Matches Today”

These profiles should be selected by the backend based on:

- compatibility
- activity
- response likelihood
- availability
- mutual probability
- match diversity
- user preference mode
- safety and profile quality

The purpose of curated matches is to increase conversion.

## 3.2 Flow B: Browse Profiles

This is the user-controlled discovery system.

Users should be able to browse a filtered pool of profiles instead of only waiting for the system to send them matches.

The purpose of browse mode is to increase user control, engagement, and perceived fairness.

## 3.3 Combined Experience

The app should feel like this:

```txt
Home / Discovery

1. Your 5 Best Matches Today
2. Browse Profiles
3. Available Now
4. Similar Vibe
5. Different From You
6. New Around You
```

The backend still protects quality and prioritizes active users, but users also get the freedom to browse.

---

# 4. High-Level Architecture

## 4.1 Existing Main Application

Keep the current Next.js application as the main StrathSpace app.

The existing app should continue handling:

- authentication
- user profiles
- profile photos
- frontend pages
- candidate pair display
- user decisions
- mutual match creation
- admin dashboard
- payments
- chat
- notifications

## 4.2 New Python Matching Intelligence Backend

Add a separate Python backend for matching intelligence.

Recommended stack:

```txt
Python
FastAPI
Railway hosting
Neon PostgreSQL
Redis or database-backed queue
Scheduled jobs / cron
Optional AI/ML model layer later
```

This service should not replace the main app.

It should act as a specialized matching and recommendation engine.

Responsibilities:

- generate ranked recommendations
- return 5 best matches per user
- rank browse results
- calculate activity scores
- calculate response scores
- calculate diversity scores
- calculate mutual probability
- track match outcomes
- update user-level match signals
- support outreach automation later
- eventually support AI/ML self-improvement

---

# 5. Core Backend Concept

Name the new service conceptually:

> StrathSpace Match Intelligence Engine

Its four responsibilities are:

## 5.1 Recommend

Return high-quality ranked profiles for each user.

## 5.2 Prioritize

Favor users who are active, available, verified, and likely to respond.

## 5.3 Diversify

Support similar matches, complementary matches, discovery matches, and high-activity matches.

## 5.4 Learn

Use real user behavior to improve ranking over time.

---

# 6. Match Types

The recommendation engine must support multiple match types.

Add a `match_type` field to recommendation responses.

Possible values:

```ts
export type MatchType =
  | "similarity"
  | "complementary"
  | "discovery"
  | "high_activity"
  | "admin_curated";
```

## 6.1 Similarity Match

A similarity match means the users share common traits.

Examples:

- shared interests
- same university
- similar lifestyle
- similar course area
- similar social preferences

User-facing label:

> Similar vibe

Example reason:

> You both share similar interests and campus lifestyle.

## 6.2 Complementary Match

A complementary match means the users are different in potentially useful or interesting ways.

Examples:

- one is creative, one is analytical
- one is outgoing, one is calm
- different courses
- different hobbies
- different perspectives

User-facing label:

> Different but interesting

Example reason:

> You two do not share everything, but that might make the conversation more interesting.

## 6.3 Discovery Match

A discovery match pushes the user slightly outside their normal pattern.

Examples:

- different university
- different course
- different interest cluster
- profile type the user has not interacted with often

User-facing label:

> Something new

Example reason:

> This profile is outside your usual pattern, but they are active and could be worth exploring.

## 6.4 High Activity Match

A high activity match prioritizes someone because they are likely to respond quickly.

Examples:

- online recently
- responded to recent matches
- push notifications enabled
- high reply rate

User-facing label:

> Active today

Example reason:

> This person is active and likely to respond soon.

## 6.5 Admin Curated Match

Admin curated matches come from manual/admin selection.

User-facing label:

> Curated by StrathSpace

Example reason:

> Our team thinks this could be a strong match.

---

# 7. Recommendation Scoring Model

The final recommendation score should combine several sub-scores.

```txt
Final Match Score =
  Compatibility Score
+ Activity Score
+ Response Score
+ Availability Score
+ Mutual Probability Score
+ Diversity Score
+ Preference Fit Score
+ Profile Quality Score
- Ghosting Penalty
- Pass Risk Penalty
- Active Hold Penalty
```

## 7.1 Compatibility Score

Measures whether two users make sense together based on profile data.

Inputs may include:

- age range
- gender preference
- university
- course
- interests
- lifestyle fields
- personality fields if available
- profile completeness

## 7.2 Activity Score

Measures how recently and frequently a user uses the app.

Example rules:

```txt
Active in last 10 minutes: +40
Active in last 1 hour: +30
Active today: +20
Active in last 3 days: +10
Inactive for 7+ days: -30
```

Activity should be one of the strongest signals.

An active decent match is often better than an inactive perfect match.

## 7.3 Response Score

Measures whether a user usually responds to matches.

Inputs:

- response rate
- average response time
- no-response count
- ignored matches
- previous open_to_meet decisions
- previous pass decisions

Example rules:

```txt
High response rate: boost
Fast response time: boost
Ignored last 3 matches: penalty
Passes almost everyone: penalty
Often open_to_meet: boost
```

## 7.4 Availability Score

Measures whether the user is currently open to receiving matches.

Inputs:

- available now
- available today
- open this weekend
- match preference mode
- discovery paused state
- quiet hours

## 7.5 Mutual Probability Score

The system should not only predict whether User A likes User B.

It should also estimate whether User B is likely to like User A.

Suggested approach:

```txt
A_likes_B_score = probability user A responds positively to user B
B_likes_A_score = probability user B responds positively to user A
Mutual Probability Score = A_likes_B_score * B_likes_A_score
```

This is key to increasing mutual matches.

## 7.6 Diversity Score

This prevents the system from only showing similar profiles.

It should reward useful difference when the user has chosen:

- Different from me
- Surprise me
- Discovery mode

Possible diversity factors:

- different course
- different interest cluster
- different university
- different hobbies
- different personality/lifestyle fields

Important:

Diversity should not mean random low-quality profiles.

A diverse recommendation must still pass quality, safety, activity, and response filters.

## 7.7 Preference Fit Score

The user can choose what kind of matches they want today.

Options:

```txt
Similar to me
Different from me
Surprise me
Active people only
Serious matches
```

The selected preference should change the scoring weights.

Example:

```txt
If mode = Similar to me:
  increase compatibility/similarity weight

If mode = Different from me:
  increase diversity/complementary weight

If mode = Active people only:
  increase activity and response weights

If mode = Serious matches:
  increase response, availability, and mutual probability weights

If mode = Surprise me:
  mix similarity, complementary, and discovery results
```

## 7.8 Profile Quality Score

Measures whether a profile is likely to attract responses.

Inputs:

- number of photos
- profile completion
- bio presence
- verified/admitted status
- visible profile
- non-paused discovery

## 7.9 Ghosting Penalty

Penalize users who repeatedly do not respond.

Example:

```txt
No response to 1 recent match: -5
No response to 3 recent matches: -20
No response to 5 recent matches: -40
```

## 7.10 Pass Risk Penalty

If a user passes on almost everyone, reduce how often they are shown until they show fresh intent.

This avoids wasting good candidates on low-intent users.

## 7.11 Active Hold Penalty

Users who are already in a strong mutual flow should be excluded or heavily deprioritized.

Examples:

Exclude or deprioritize users with mutual statuses such as:

```txt
mutual
call_pending
being_arranged
upcoming
completed_pending_feedback
```

Released statuses:

```txt
cancelled
expired
completed after feedback/grace period
```

---

# 8. New User Preference Feature

Add a lightweight preference selector in the app.

Question:

> What kind of matches do you want today?

Options:

```txt
Similar to me
Different from me
Surprise me
Active people only
Serious matches
```

## 8.1 Storage

Create a table or profile-level setting.

Recommended table:

```sql
CREATE TABLE user_match_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  preference_mode TEXT NOT NULL DEFAULT 'surprise_me',
  available_now BOOLEAN NOT NULL DEFAULT false,
  available_today BOOLEAN NOT NULL DEFAULT false,
  open_to_calls BOOLEAN NOT NULL DEFAULT false,
  preferred_age_min INT,
  preferred_age_max INT,
  preferred_universities TEXT[],
  preferred_contact_window TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Possible `preference_mode` values:

```txt
similar_to_me
different_from_me
surprise_me
active_only
serious_matches
```

## 8.2 Backend Usage

The recommendation engine must read this preference before ranking results.

Example:

```txt
User selects “Different from me”
↓
Backend increases diversity/complementary scoring
↓
Recommendations include more different-course/different-interest profiles
```

---

# 9. Browse Profiles Feature

## 9.1 Purpose

Browse mode lets users actively discover people instead of waiting to be selected.

This directly solves the user complaint:

> “It’s like you are just waiting to be chosen and not choosing someone for yourself.”

## 9.2 Browse Page Rules

The browse pool should only include users who pass quality and safety checks.

A browsable user should generally satisfy:

```txt
user.deleted_at IS NULL
profile exists
profile is complete
profile is visible
profile discovery is not paused
profile is admitted or verified where required
not already blocked/reported by viewer
not the viewer themselves
not already in an active candidate pair with viewer
not already in a mutual hold with viewer
```

## 9.3 Browse Filters

Browse page should support filters such as:

```txt
University
Course
Age range
Recently active
Verified profiles
Similar to me
Different from me
New profiles
Available today
```

## 9.4 Browse Ranking

Even in browse mode, results should not be random.

Default browse ranking should favor:

1. active users
2. verified/complete profiles
3. users with good response score
4. users that fit selected filters
5. users not overexposed recently

## 9.5 Browse API

Add endpoint:

```http
GET /browse/:userId
```

Query params:

```txt
university
course
age_min
age_max
active_recently
verified_only
mode=similar|different|new|available
limit
cursor
```

Example response:

```json
{
  "userId": "user_123",
  "mode": "different",
  "results": [
    {
      "candidateUserId": "user_456",
      "rankScore": 87,
      "matchType": "complementary",
      "reason": "Different course, active today, strong profile quality",
      "activityStatus": "active_today",
      "profilePreview": {
        "firstName": "Mary",
        "age": 21,
        "university": "Strathmore University",
        "course": "Finance",
        "photos": []
      }
    }
  ],
  "nextCursor": "cursor_value"
}
```

---

# 10. Five Best Profiles Feature

## 10.1 Purpose

When a user opens the app, they should get a curated set of profiles.

Label:

> Your 5 Best Matches Today

## 10.2 Rules

The backend should return up to 5 profiles.

The 5 should ideally be mixed, not all one type.

Suggested mix:

```txt
2 similarity matches
1 complementary match
1 high activity match
1 discovery/surprise match
```

If the user has selected a preference mode, adjust the mix.

Examples:

```txt
Mode: Similar to me
- 4 similarity
- 1 high activity

Mode: Different from me
- 3 complementary
- 1 discovery
- 1 high activity

Mode: Active people only
- 5 high activity/fast responder matches

Mode: Surprise me
- balanced mix
```

## 10.3 API

Add endpoint:

```http
GET /recommendations/:userId/daily
```

Example response:

```json
{
  "userId": "user_123",
  "generatedAt": "2026-05-10T10:00:00Z",
  "preferenceMode": "surprise_me",
  "recommendations": [
    {
      "candidateUserId": "user_456",
      "finalScore": 91,
      "matchType": "similarity",
      "compatibilityScore": 82,
      "activityScore": 95,
      "responseScore": 88,
      "diversityScore": 40,
      "mutualProbabilityScore": 78,
      "reason": "Similar vibe, active today, and likely to respond quickly"
    },
    {
      "candidateUserId": "user_789",
      "finalScore": 86,
      "matchType": "complementary",
      "compatibilityScore": 68,
      "activityScore": 92,
      "responseScore": 84,
      "diversityScore": 88,
      "mutualProbabilityScore": 72,
      "reason": "Different interests, but strong activity and profile quality"
    }
  ]
}
```

---

# 11. User Match Signals Table

Create a table that stores user-level signals for ranking.

```sql
CREATE TABLE user_match_signals (
  user_id UUID PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,

  last_active_at TIMESTAMP,
  active_score NUMERIC DEFAULT 0,

  profile_views_count INT DEFAULT 0,
  likes_given_count INT DEFAULT 0,
  passes_given_count INT DEFAULT 0,
  matches_received_count INT DEFAULT 0,

  response_rate NUMERIC DEFAULT 0,
  average_response_time_minutes NUMERIC,
  mutual_match_rate NUMERIC DEFAULT 0,
  no_response_count INT DEFAULT 0,

  open_to_meet_count INT DEFAULT 0,
  pass_count INT DEFAULT 0,
  maybe_count INT DEFAULT 0,

  call_acceptance_rate NUMERIC DEFAULT 0,
  match_quality_score NUMERIC DEFAULT 0,

  ghosting_penalty NUMERIC DEFAULT 0,
  pass_risk_penalty NUMERIC DEFAULT 0,

  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 11.1 Updating Signals

Update this table whenever:

- user opens the app
- user views a profile
- user likes a profile
- user passes a profile
- user ignores a candidate pair
- user responds to a candidate pair
- mutual match is created
- call is accepted/rejected
- date is arranged/completed
- user gives feedback

---

# 12. Recommendation Event Logging

The system needs to learn from what it shows.

Create a table:

```sql
CREATE TABLE recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  candidate_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  source TEXT NOT NULL,
  match_type TEXT,
  final_score NUMERIC,
  compatibility_score NUMERIC,
  activity_score NUMERIC,
  response_score NUMERIC,
  diversity_score NUMERIC,
  mutual_probability_score NUMERIC,

  shown_at TIMESTAMP NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMP,
  decision TEXT,
  decided_at TIMESTAMP,

  created_candidate_pair_id UUID,

  metadata JSONB DEFAULT '{}'::jsonb
);
```

Possible `source` values:

```txt
daily_recommendations
browse
admin_curated
available_now
```

Possible `decision` values:

```txt
viewed
open_to_meet
maybe
passed
ignored
```

This table is essential for future AI learning.

---

# 13. Candidate Pair Integration

The existing `candidate_pairs` table should remain the core pair-tracking table.

When a user expresses interest from recommendations or browse mode:

1. Check if a candidate pair already exists between the two users.
2. If not, create a candidate pair.
3. Set the viewer decision based on the action.
4. Keep the other user pending.
5. Notify the other user.
6. If both users show interest, create/update `mutual_matches`.

## 13.1 Important Rule

Recommendations and browse results should not automatically create candidate pairs just because they are shown.

Candidate pairs should be created when there is meaningful action, such as:

- user likes
- user says open_to_meet
- admin sends curated match

This prevents the database from being filled with passive impressions.

---

# 14. Availability Mode

Add an availability prompt.

Examples:

```txt
Are you open to matches today?
- Yes, show me people today
- Maybe later
- Pause for now
```

Optional advanced version:

```txt
When are you available?
- Now
- Tonight
- This weekend
- Not currently
```

## 14.1 Why This Matters

The biggest issue is not lack of users.

The issue is matching people who are not available at the same time.

Availability mode helps the backend prioritize people who are actually ready.

## 14.2 Suggested Table

Can be part of `user_match_preferences`, or separate.

If separate:

```sql
CREATE TABLE user_availability_status (
  user_id UUID PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unknown',
  available_until TIMESTAMP,
  preferred_window TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Possible statuses:

```txt
available_now
available_today
available_weekend
not_available
unknown
```

---

# 15. Admin Dashboard Updates

The admin dashboard should move from manual searching to intelligent supervision.

Add sections:

## 15.1 Top Likely Mutuals Today

Shows pair suggestions with high mutual probability.

Columns:

```txt
User A
User B
Final score
Mutual probability
Activity status
Match type
Reason
Action: Create curated match
```

## 15.2 Available Now Pool

Shows users who recently selected available now/today.

Columns:

```txt
Name
Gender
University
Last active
Response rate
Open matches
Action
```

## 15.3 Stuck Matches

Shows pairs where one side responded but the other has not.

Columns:

```txt
Interested user
Pending user
Time pending
Pending user's activity status
Recommended action
```

Recommended actions:

```txt
Send reminder
Send WhatsApp/SMS
Call if opted in
Cancel pair
```

## 15.4 Low Response Users

Shows users who keep ignoring matches.

Purpose:

- reduce their ranking
- ask them to update preferences
- pause them from active matching if necessary

## 15.5 Match Diversity Analytics

Track which match types perform best.

Example metrics:

```txt
Similarity match response rate
Complementary match response rate
Discovery match response rate
High activity match response rate
Admin curated match response rate
```

---

# 16. Outreach Automation Layer

Outreach should come after smart ranking.

Do not start with voice calls as the main solution.

Use a staged outreach flow:

```txt
1. Push notification
2. In-app reminder
3. WhatsApp/SMS if important and allowed
4. Voice call only if high-value and opted in
5. Human admin intervention only for serious/stuck matches
```

## 16.1 Outreach Events Table

```sql
CREATE TABLE match_outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID REFERENCES candidate_pairs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  response TEXT,
  attempts INT DEFAULT 0,

  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  responded_at TIMESTAMP,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Possible channels:

```txt
push
in_app
sms
whatsapp
voice
admin_call
```

Possible statuses:

```txt
queued
sent
delivered
answered
failed
skipped
cancelled
```

Possible responses:

```txt
yes
later
no
no_answer
```

---

# 17. Voice Agent Positioning

Voice agent can be useful, but it should be an escalation layer, not the first feature.

## 17.1 When To Trigger Voice Call

Only trigger voice calls if:

```txt
user opted into match calls
match score is high
one user has already shown interest
pending user has not responded after a short window
pending user was recently active
admin or system marks the match as high-value
quiet hours are respected
```

## 17.2 Voice Call Script

The first version should be simple and scripted.

Example:

```txt
Hi, this is StrathSpace. You have a curated match waiting in the app.
Are you available to check it now?
Say yes to receive the match link, say later for a reminder, or say no to skip.
```

The agent should not reveal sensitive profile details on the call.

The goal is to collect availability/intent, not to describe the full match.

## 17.3 Voice Response Handling

If user says yes:

```txt
send push/deep link
mark outreach response = yes
boost user response score
```

If user says later:

```txt
schedule reminder
mark response = later
```

If user says no:

```txt
close or skip pair
mark response = no
```

If no answer:

```txt
retry at most once
then stop
slightly reduce response score
```

---

# 18. Python FastAPI Endpoints

## 18.1 Health

```http
GET /health
```

Returns service health.

## 18.2 Daily Recommendations

```http
GET /recommendations/{user_id}/daily
```

Returns 5 best profiles.

## 18.3 Browse Profiles

```http
GET /browse/{user_id}
```

Returns browse/explore profile results.

## 18.4 Update Preference

```http
POST /preferences/{user_id}
```

Body:

```json
{
  "preferenceMode": "different_from_me",
  "availableNow": true,
  "availableToday": true,
  "openToCalls": false
}
```

## 18.5 Track Recommendation Event

```http
POST /events/recommendation
```

Body:

```json
{
  "viewerUserId": "user_123",
  "candidateUserId": "user_456",
  "source": "daily_recommendations",
  "matchType": "complementary",
  "event": "viewed"
}
```

## 18.6 Track Decision

```http
POST /events/decision
```

Body:

```json
{
  "viewerUserId": "user_123",
  "candidateUserId": "user_456",
  "decision": "open_to_meet",
  "source": "browse"
}
```

This endpoint should trigger candidate pair creation/update through either:

1. direct database write using shared service logic, or
2. calling the existing Next.js server action/API route.

Recommended: keep core candidate-pair mutation rules in the existing app initially to avoid duplicate logic.

## 18.7 Admin Suggested Pairs

```http
GET /admin/suggested-pairs
```

Returns top likely mutual pairs for admin review.

---

# 19. Next.js Integration

## 19.1 Frontend Pages To Update

Recommended pages/components:

```txt
Discovery/Home page
Explore/Browse page
Profile cards
Match preference selector
Admin matchmaking dashboard
Match activity page
```

## 19.2 Data Flow

```txt
User opens app
↓
Next.js calls Python /recommendations/{userId}/daily
↓
Python ranks candidates from Neon data
↓
Python returns 5 profiles + scores + reasons
↓
Next.js displays profile cards
↓
User acts: open_to_meet / maybe / pass
↓
Next.js updates candidate_pairs
↓
Python logs recommendation/decision event
↓
user_match_signals updated
↓
Future recommendations improve
```

## 19.3 Browse Flow

```txt
User opens Browse
↓
Selects filter/mode
↓
Next.js calls Python /browse/{userId}
↓
Python returns ranked profile results
↓
User chooses someone
↓
Candidate pair is created/updated
↓
Signals are updated
```

---

# 20. Self-Improving AI Roadmap

Do not start with complex ML.

Build in stages.

## Stage 1: Rules-Based Intelligence

Use clear weights.

Example:

```txt
activity_score weight: 30%
response_score weight: 25%
compatibility_score weight: 20%
mutual_probability weight: 15%
diversity/preference weight: 10%
```

This is easy to debug and ship quickly.

## Stage 2: AI-Assisted Match Reasons

Use an LLM to generate nicer match reasons from structured features.

Example:

```txt
Input:
- both active today
- different courses
- shared interest in entrepreneurship
- high response scores

Output:
"You two have different academic backgrounds but a shared interest in entrepreneurship, which could make the conversation interesting."
```

Important:

Do not use AI to expose private/sensitive hidden data.

## Stage 3: Predictive Ranking Model

Once enough data exists, train a model to predict:

```txt
probability of view
probability of open_to_meet
probability of mutual
probability of chat started
probability of date/payment completion
```

## Stage 4: Continuous Learning

The system adjusts ranking weights based on real outcomes.

Important events:

```txt
profile shown
profile viewed
open_to_meet
maybe
pass
ignored
mutual created
chat started
call accepted
date arranged
payment made
date completed
feedback submitted
```

---

# 21. Safety, Privacy, and Trust Rules

## 21.1 Do Not Overexpose Users

Avoid showing the same user too many times.

Add exposure limits.

Example:

```txt
Do not show the same profile to the same viewer more than X times per week unless the viewer interacts.
```

## 21.2 Respect Hidden/Paused Profiles

Never show users who are:

```txt
hidden
paused
soft-deleted
incomplete
blocked/reported
```

## 21.3 Do Not Reveal Sensitive Scoring

User-facing reasons should be friendly.

Do not show:

```txt
"This person has high response probability"
"This person passes fewer people"
"This user is lonely/available"
```

Instead show:

```txt
"Active today"
"Similar vibe"
"Different but interesting"
"Curated for you"
```

## 21.4 Voice Calls Must Be Opt-In

Only call users who have allowed match calls.

Add quiet hours.

Do not reveal detailed profile information over phone.

---

# 22. MVP Implementation Plan

## Phase 1: Foundation

Build:

```txt
Python FastAPI service
Database connection to Neon
Health endpoint
User signal calculation service
Daily recommendation endpoint
Basic scoring engine
```

Deliverable:

```txt
GET /recommendations/{userId}/daily returns 5 ranked profiles
```

## Phase 2: Match Diversity

Build:

```txt
match_type support
similarity scoring
complementary scoring
discovery scoring
match reasons
preference mode support
```

Deliverable:

```txt
Recommendations include matchType and reason
```

## Phase 3: Browse Mode

Build:

```txt
Browse page
Browse API
Filters
Ranked browse results
Decision handling
```

Deliverable:

```txt
Users can browse profiles and choose people themselves
```

## Phase 4: Signal Learning

Build:

```txt
user_match_signals table
recommendation_events table
signal update jobs
response rate calculation
activity score calculation
```

Deliverable:

```txt
System ranking improves from user behavior
```

## Phase 5: Admin Intelligence

Build:

```txt
Top likely mutuals today
Available now users
Stuck matches
Low response users
Match type analytics
```

Deliverable:

```txt
Admins supervise instead of manually searching everything
```

## Phase 6: Outreach Automation

Build:

```txt
push reminder workflow
in-app reminders
optional WhatsApp/SMS later
voice call only for opted-in high-value matches
```

Deliverable:

```txt
Stuck matches get automated follow-up
```

---

# 23. Success Metrics

Track these metrics before and after rollout.

## 23.1 Core Funnel Metrics

```txt
Profiles shown
Profiles viewed
Open_to_meet decisions
Pass decisions
Maybe decisions
Pairs with any response
Pairs with both responses
Mutual matches created
Average response time
Expired with no response
Expired with one interest and one pending
```

## 23.2 Recommendation Metrics

```txt
Daily recommendation view rate
Daily recommendation action rate
Browse profile action rate
Similarity match mutual rate
Complementary match mutual rate
Discovery match mutual rate
High activity match mutual rate
```

## 23.3 User Control Metrics

```txt
Browse usage rate
Filter usage rate
Preference mode selection rate
Repeat browse sessions
```

## 23.4 Admin Metrics

```txt
Manual calls reduced
Stuck matches resolved
Admin curated match conversion
Time from match shown to response
Time from interest to mutual
```

---

# 24. Important Implementation Notes For The Coding Agent

## 24.1 Do Not Break Existing Matching

The current candidate pair and mutual match flow should remain intact.

The new backend should improve ranking and discovery, not replace the proven core pair lifecycle immediately.

## 24.2 Use Existing Tables Where Possible

Use existing:

```txt
user
profiles
candidate_pairs
candidate_pair_history
mutual_matches
```

Add new tables only for:

```txt
user_match_signals
user_match_preferences
recommendation_events
match_outreach_events
user_availability_status if needed
```

## 24.3 Keep Recommendation Separate From Decision

Showing a profile is not the same as creating a candidate pair.

Only create/update candidate pairs when the user takes action.

## 24.4 Prioritize Active Users

Activity must be a major scoring factor.

This is one of the biggest fixes for the low-response problem.

## 24.5 Support Both Similar And Different Matches

Do not hardcode shared interests as the only matching strategy.

The backend must support:

```txt
similarity
complementary
discovery
high_activity
admin_curated
```

## 24.6 Start Rules-Based

Do not over-engineer ML in the first version.

Start with transparent scoring weights.

Then improve with data.

---

# 25. Final Product Vision

The new StrathSpace experience should feel like this:

> “The app understands who I might like, shows me active people, gives me a few strong recommendations, but also lets me browse and choose for myself.”

This solves both sides of the problem:

## Conversion Problem

Solved by:

- activity scoring
- response scoring
- availability mode
- mutual probability ranking
- outreach automation

## User Control Problem

Solved by:

- browse mode
- filters
- preference modes
- different/similar/surprise match options

## Product Differentiation

StrathSpace becomes more than a swipe app.

It becomes:

> A smart campus matchmaking platform that learns who is active, who responds, who matches well, and what kind of discovery each user wants.

---

# 26. First Build Checklist

The coding agent should start with this checklist.

```txt
[ ] Create Python FastAPI service
[ ] Connect to Neon PostgreSQL
[ ] Add /health endpoint
[ ] Create user_match_signals table
[ ] Create user_match_preferences table
[ ] Create recommendation_events table
[ ] Build scoring module
[ ] Implement activity_score
[ ] Implement response_score
[ ] Implement compatibility_score wrapper
[ ] Implement diversity_score
[ ] Implement preference_mode weighting
[ ] Implement GET /recommendations/{userId}/daily
[ ] Return 5 profiles with matchType and reason
[ ] Build browse ranking function
[ ] Implement GET /browse/{userId}
[ ] Add frontend preference selector
[ ] Add frontend 5 best matches section
[ ] Add frontend browse page
[ ] Log profile shown/viewed/decision events
[ ] Update signals after decisions
[ ] Add admin suggested pairs view
[ ] Add stuck matches view
[ ] Add outreach table later
[ ] Add voice call escalation only after opt-in and high-value match logic exists
```

---

# End of Document
