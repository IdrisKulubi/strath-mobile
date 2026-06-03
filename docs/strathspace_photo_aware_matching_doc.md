# StrathSpace Photo-Aware Matching Intelligence Plan

## 1. Purpose of This Document

This document explains how StrathSpace should implement a photo-aware matching layer to improve the probability that users get meaningful matches, especially during their first session after joining the app.

The goal is not to rank users by beauty or create an attractiveness score. The goal is to use profile photos ethically to improve:

- profile quality
- user trust
- recommendation relevance
- visual preference learning
- match diversity
- first-time user conversion
- mutual match probability

The system should help StrathSpace recommend profiles that are not only text-compatible, but also likely to receive a real response based on how users interact with photos and profiles.

---

## 2. Core Product Principle

The app should not ask:

> “Who is objectively attractive?”

The app should ask:

> “Which profiles is this specific user most likely to respond to, and which candidates are most likely to respond back?”

Attraction is personal. Different users respond to different styles, expressions, profile quality, and presentation. Therefore, the photo-aware matching system must be personalized, ethical, and based on real interaction behavior.

---

## 3. Important Ethical Boundary

Do not build any feature that directly rates, ranks, or labels a person’s physical attractiveness.

### Do Not Build

- attractiveness score
- beauty score
- hotness ranking
- face rating
- public profile score
- body shape ranking
- ethnicity or skin-tone matching
- personality prediction from face
- trustworthiness prediction from face
- intelligence prediction from face
- “your face matches with this face” claims

### Build Instead

- photo quality scoring
- profile completeness scoring
- visual preference learning from likes/passes
- image embedding similarity for personalization
- visual diversity balancing
- profile safety/moderation checks
- user-facing profile improvement tips

The system must be framed as:

> “We use profile photos to improve recommendations, safety, and profile quality. We do not rank people by beauty.”

---

## 4. Why Photos Matter in Matching

Photos strongly influence whether users respond to a profile. The useful psychological signals are not about judging someone’s face. They are about how a profile is presented.

Useful signals include:

- clear photo
- visible face
- good lighting
- approachable expression
- realistic profile image
- non-blurry image
- multiple photos
- consistent identity across photos
- profile feels real and safe
- user’s visual style or vibe
- whether the viewer tends to like similar presentation styles

Bad photo presentation can reduce trust and response rate even if the person is compatible.

Therefore, photo intelligence should improve recommendation quality by understanding:

1. Is the candidate profile visually usable and trustworthy?
2. Has the viewer historically liked profiles with similar visual presentation?
3. Is this recommendation too similar to what the viewer has already seen?
4. Does this candidate improve the diversity of the daily 5 profiles?

---

## 5. System Overview

The photo-aware matching system should have five layers:

```txt
Layer 1: Photo Quality Analysis
Layer 2: Photo Safety / Moderation
Layer 3: Image Embeddings
Layer 4: User Visual Preference Learning
Layer 5: Recommendation Scoring Integration
```

These layers should feed into the existing match intelligence engine.

Final matching should still include:

- compatibility
- activity
- response probability
- reciprocity probability
- push notification status
- profile quality
- photo preference
- diversity
- exposure balancing

Photos should never become the only decision factor.

Recommended weight for photo-based signals in the first MVP:

```txt
Photo Quality Score: 5% - 10%
Photo Preference Score: 5% - 10%
Photo Diversity Score: 5%
```

Total photo-related influence should initially stay below 20% of the final recommendation score.

---

## 6. Feature Scope

### MVP Scope

Build these first:

1. Photo quality analysis
2. Photo moderation/safety checks
3. Image embeddings for profile photos
4. Visual preference signals from likes and passes
5. Photo-aware ranking in daily 5 profiles
6. Profile improvement tips
7. Diversity balancing for the daily 5

### Do Not Build in MVP

Do not build:

- public visual scores
- user attractiveness rankings
- face-to-face matching claims
- advanced ML model training
- invasive biometric identity matching
- facial personality predictions
- automatic dating compatibility based only on faces

---

## 7. Recommended Product Language

Use safe and positive wording.

### Good User-Facing Language

```txt
Profiles with clear photos get better responses.
```

```txt
Add one more clear photo to improve your visibility.
```

```txt
We use your photos to improve profile quality, safety, and recommendations.
```

```txt
Based on profiles you’ve liked before, we found someone with a similar vibe.
```

```txt
Different but interesting.
```

```txt
Clear profile.
```

```txt
Active today.
```

### Avoid This Language

```txt
You are more attractive than other users.
```

```txt
Your beauty score is low.
```

```txt
This person’s face matches yours.
```

```txt
We matched you because your faces are compatible.
```

```txt
This person is more beautiful.
```

---

## 8. Data Model

### 8.1 `profile_photo_analysis`

Stores photo-level analysis results.

```sql
CREATE TABLE profile_photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  photo_url TEXT NOT NULL,
  photo_hash TEXT,

  quality_score INTEGER DEFAULT 0,
  face_visible BOOLEAN DEFAULT FALSE,
  image_clear BOOLEAN DEFAULT FALSE,
  lighting_score INTEGER DEFAULT 0,
  blur_score INTEGER DEFAULT 0,
  duplicate_score INTEGER DEFAULT 0,
  has_multiple_people BOOLEAN DEFAULT FALSE,
  is_screenshot_or_meme BOOLEAN DEFAULT FALSE,
  is_object_or_landscape_only BOOLEAN DEFAULT FALSE,

  moderation_status TEXT DEFAULT 'pending',
  -- pending | approved | rejected | needs_review

  moderation_reason TEXT,

  embedding_provider TEXT,
  embedding_model TEXT,
  embedding_id UUID,

  analysis_version TEXT DEFAULT 'v1',
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8.2 `profile_photo_embeddings`

Stores image embeddings. Depending on infrastructure, embeddings can be stored directly using pgvector or externally in a vector DB.

If using pgvector:

```sql
CREATE TABLE profile_photo_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  photo_analysis_id UUID REFERENCES profile_photo_analysis(id) ON DELETE CASCADE,

  embedding VECTOR(768),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);
```

If pgvector is not ready, store the embedding in object storage or a vector database, and keep the reference in `profile_photo_analysis.embedding_id`.

### 8.3 `user_visual_preference_signals`

Stores what visual profile patterns a user tends to like or pass.

```sql
CREATE TABLE user_visual_preference_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  liked_embedding_centroid JSONB,
  passed_embedding_centroid JSONB,

  total_visual_likes INTEGER DEFAULT 0,
  total_visual_passes INTEGER DEFAULT 0,
  total_visual_views INTEGER DEFAULT 0,

  preference_confidence NUMERIC DEFAULT 0,

  last_updated_from_event_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id)
);
```

### 8.4 `profile_interaction_events`

If this table does not already exist, add it. It is needed to learn from user behavior.

```sql
CREATE TABLE profile_interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  actor_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  -- profile_view | profile_like | profile_pass | profile_skip | profile_open

  source TEXT,
  -- daily_5 | browse | admin_curated | notification | unlock_extra_profiles

  time_spent_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.5 `user_match_signals`

Add photo-related fields to the broader match signals table.

```sql
ALTER TABLE user_match_signals
ADD COLUMN IF NOT EXISTS photo_quality_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visual_preference_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_usable_profile_photo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photo_analysis_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photo_analysis_updated_at TIMESTAMP;
```

---

## 9. Services to Implement

### 9.1 Photo Intelligence Service

Create:

```txt
src/lib/services/photo-intelligence-service.ts
```

Responsibilities:

- analyze profile photos
- calculate photo quality score
- generate embeddings
- update photo analysis table
- detect weak profile photos
- return profile photo improvement tips

Functions:

```ts
analyzeProfilePhoto(input: {
  userId: string;
  profileId?: string;
  photoUrl: string;
}): Promise<PhotoAnalysisResult>;

calculatePhotoQualityScore(analysis: PhotoAnalysisResult): number;

generatePhotoEmbedding(photoUrl: string): Promise<PhotoEmbeddingResult>;

getUserPhotoQualityScore(userId: string): Promise<number>;

getPhotoImprovementTips(userId: string): Promise<string[]>;

reanalyzeUserPhotos(userId: string): Promise<void>;
```

### 9.2 Visual Preference Service

Create:

```txt
src/lib/services/visual-preference-service.ts
```

Responsibilities:

- update visual preference signals from likes/passes
- compute similarity between candidate photos and user preference patterns
- calculate photo preference score
- calculate diversity score

Functions:

```ts
updateVisualPreferenceFromInteraction(input: {
  actorUserId: string;
  targetUserId: string;
  eventType: 'profile_like' | 'profile_pass' | 'profile_view';
}): Promise<void>;

calculatePhotoPreferenceScore(input: {
  viewerUserId: string;
  candidateUserId: string;
}): Promise<number>;

calculatePhotoDiversityScore(input: {
  viewerUserId: string;
  candidateUserId: string;
  alreadySelectedCandidateIds: string[];
}): Promise<number>;

getVisualPreferenceConfidence(userId: string): Promise<number>;
```

### 9.3 Profile Interaction Service

Create or update:

```txt
src/lib/services/profile-interaction-service.ts
```

Responsibilities:

- record views
- record likes
- record passes
- update user match signals
- trigger visual preference updates

Functions:

```ts
recordProfileView(actorUserId: string, targetUserId: string, source: string): Promise<void>;
recordProfileLike(actorUserId: string, targetUserId: string, source: string): Promise<void>;
recordProfilePass(actorUserId: string, targetUserId: string, source: string): Promise<void>;
```

After every like/pass event, call:

```ts
updateVisualPreferenceFromInteraction(...)
```

### 9.4 Match Intelligence Service Update

Update existing recommendation service or create:

```txt
src/lib/services/match-intelligence-service.ts
```

Add photo-aware scoring functions:

```ts
calculateProfileQualityScore(userId: string): Promise<number>;
calculatePhotoPreferenceScore(viewerUserId: string, candidateUserId: string): Promise<number>;
calculatePhotoDiversityScore(viewerUserId: string, candidateUserId: string, selectedIds: string[]): Promise<number>;
calculateFinalMatchScore(viewerUserId: string, candidateUserId: string): Promise<MatchScoreBreakdown>;
getBestProfilesForUser(userId: string, limit?: number): Promise<Recommendation[]>;
```

---

## 10. Photo Quality Scoring

The photo quality score should measure usability, trust, and presentation quality.

### Inputs

```txt
face visible
image clear
lighting okay
not too blurry
not duplicate
not meme/screenshot
not object-only
not group-only
has multiple usable photos
moderation approved
```

### Example Score

```txt
Base: 0
+25 face visible
+20 image clear
+15 good lighting
+10 not blurry
+10 has at least 2 photos
+10 not duplicate
+10 moderation approved
-20 meme/object-only image
-15 too dark
-15 very blurry
-20 group photo with unclear main person
```

Cap between 0 and 100.

### User-facing Tips

If score is low, show:

```txt
Add a clearer first photo.
```

```txt
Use a photo where your face is visible.
```

```txt
Add at least 2 photos to improve your profile.
```

```txt
Avoid blurry or very dark photos.
```

Do not say:

```txt
Your face is not attractive.
```

---

## 11. Image Embeddings

Image embeddings are used to represent a photo numerically so that the system can compare visual patterns.

The system should use embeddings for:

- personalization
- similarity to previously liked profiles
- difference from repeatedly passed profiles
- diversity balancing
- profile clustering

The system should not expose embeddings to users.

### Provider Options

Possible options:

- OpenAI vision embeddings if available in current stack
- CLIP-based embeddings
- Replicate-hosted CLIP model
- self-hosted image embedding model later
- vector database with pgvector, Pinecone, or similar

For MVP, prefer the simplest reliable implementation.

### Important Rule

Do not store detailed biometric face geometry. Use general image embeddings for recommendation purposes only.

---

## 12. Visual Preference Learning

The system learns from real user actions.

### Events That Matter

Positive signals:

```txt
profile_like
profile_open with long time spent
mutual_match_created
chat_started
```

Negative signals:

```txt
profile_pass
very quick skip
ignored match
```

Neutral signals:

```txt
profile_view
profile_open with short time spent
```

### Learning Logic

For every user:

1. Collect embeddings of profiles they liked.
2. Compute an average liked embedding centroid.
3. Collect embeddings of profiles they passed.
4. Compute an average passed embedding centroid.
5. Calculate how close a new candidate is to the liked centroid.
6. Calculate how close a new candidate is to the passed centroid.
7. Boost candidates closer to liked patterns.
8. Penalize candidates too close to strongly passed patterns.

### Confidence Rule

Do not overuse visual preference score until enough data exists.

Example:

```txt
0 - 3 likes: very low confidence
4 - 10 likes: medium confidence
10+ likes: higher confidence
```

If confidence is low, photo preference score should have very small weight.

---

## 13. Recommendation Scoring Integration

Update the final score formula.

### General User Formula

```txt
Final Match Score =
  25% Compatibility Score
+ 25% Activity Score
+ 20% Response Probability Score
+ 10% Reciprocity Score
+ 10% Profile Quality Score
+ 5% Photo Preference Score
+ 5% Diversity Score
- Penalties
```

### First-Time User Formula

For new users, prioritize active and responsive users.

```txt
Final Match Score =
  20% Compatibility Score
+ 30% Activity Score
+ 25% Response Probability Score
+ 10% Reciprocity Score
+ 10% Profile Quality Score
+ 3% Photo Preference Score
+ 2% Diversity Score
- Penalties
```

Reason:

New users need fast responses more than perfect personalization, because the system does not yet know their preferences.

### Penalties

```txt
inactive for 7+ days: strong penalty
many pending likes: exposure penalty
ignored last 3 matches: ghosting penalty
profile photo poor quality: small penalty
no usable photo: exclude from first 5 or heavily penalize
already in mutual hold: exclude
blocked/reported: exclude
```

---

## 14. Daily 5 Profile Composition

The daily 5 should not all be the same type of person.

Recommended composition:

```txt
2 high-probability profiles
1 active/fast responder profile
1 complementary/different profile
1 underexposed high-quality profile
```

For first-time users:

```txt
3 active and responsive profiles
1 highly compatible profile
1 diverse/different profile
```

This improves conversion while keeping discovery interesting.

---

## 15. First-Time User Matching Flow

When a new user completes onboarding:

1. Verify profile is complete enough.
2. Analyze uploaded photos.
3. Calculate initial photo quality score.
4. Ask match mood:
   - Similar to me
   - Different from me
   - Active today
   - Surprise me
5. Generate first 5 profiles using first-time user formula.
6. Exclude inactive and low-response users where possible.
7. Prioritize active users with push enabled.
8. Show match reason labels.
9. Track views, likes, passes, and time spent.
10. Update visual preference after each like/pass.
11. Send real notifications to liked users if push is enabled.

Goal:

```txt
Increase probability of first-session likes, responses, and mutual matches.
```

Primary metric:

```txt
Time to First Mutual Match
```

---

## 16. Match Reason Labels

Do not mention face analysis directly.

Use friendly labels:

```txt
Active today
Fast responder
Similar vibe
Different but interesting
Clear profile
Good conversation match
New here
You may like their vibe
```

Do not use labels like:

```txt
Face match
Beauty match
Attractive match
Looks compatible
```

---

## 17. APIs / Server Actions

### Photo Analysis

```txt
POST /api/photos/analyze
POST /api/photos/reanalyze
GET /api/photos/quality-score
GET /api/photos/improvement-tips
```

### Profile Interactions

```txt
POST /api/profiles/view
POST /api/profiles/like
POST /api/profiles/pass
```

### Recommendations

```txt
GET /api/recommendations/daily
GET /api/recommendations/first-session
```

### Admin

```txt
GET /api/admin/photo-quality/low-quality-profiles
GET /api/admin/photo-quality/needs-review
POST /api/admin/photo-quality/reanalyze-user
```

---

## 18. Admin Dashboard Updates

Add a simple admin section called:

```txt
Photo Quality & Match Signals
```

Show:

- users with no usable photo
- users with blurry/dark photos
- users whose profile photos need review
- users with high activity but poor photo quality
- users with good profile quality but low exposure

Admin actions:

- ask user to update photo
- manually approve/reject photo
- trigger reanalysis
- exclude from first 5 recommendations until fixed

---

## 19. Privacy and Consent

Because photos are sensitive, add clear consent language.

### Consent Copy

```txt
We use your profile photos to improve profile quality, safety, and recommendations. We do not rank users by beauty or show public attractiveness scores.
```

### User Controls

Users should be able to:

- delete photos
- update photos
- pause discovery
- hide profile
- request deletion of analysis data
- opt out of personalized photo-based recommendations if needed

### Data Protection Rules

- Do not expose photo analysis data publicly.
- Do not show internal scores to users.
- Do not use photo data for sensitive inference.
- Do not sell or share image analysis data.
- Protect embeddings and analysis records like private user data.
- Delete analysis records when the user deletes photos or account.

---

## 20. Moderation and Safety

Photo analysis should also help prevent low-quality or unsafe profiles.

Checks:

- explicit/inappropriate content
- object-only images
- meme images
- celebrity/fake-looking images
- repeated duplicate uploads
- group photo only
- face not visible
- very blurry/dark images

Photo moderation status:

```txt
pending
approved
needs_review
rejected
```

Only approved or acceptable photos should be used in first-session recommendations.

---

## 21. Implementation Phases

### Phase 1: Foundation

Build:

- `profile_photo_analysis` table
- photo quality scoring
- basic moderation status
- profile improvement tips
- admin low-quality photo view

Do not implement embeddings yet if time is limited.

### Phase 2: Embeddings

Build:

- image embedding generation
- embedding storage
- embedding reference in photo analysis
- simple similarity calculation

### Phase 3: Visual Preference Learning

Build:

- update preferences from likes/passes
- liked centroid
- passed centroid
- confidence score
- photo preference score

### Phase 4: Recommendation Integration

Build:

- add photo quality score to final ranking
- add photo preference score
- add diversity score
- first-time user recommendation formula
- daily 5 composition rules

### Phase 5: Monitoring and Tuning

Build:

- analytics dashboard
- compare conversion before/after photo-aware scoring
- tune weights
- review fairness and user complaints

---

## 22. Metrics to Track

### Profile Quality Metrics

```txt
percentage of users with usable photo
average photo quality score
profiles needing review
profiles with multiple photos
```

### Matching Metrics

```txt
first 5 like rate
first 5 pass rate
first 5 mutual match rate
time to first mutual match
response rate on photo-aware recommendations
```

### Visual Preference Metrics

```txt
photo preference confidence
recommendations liked because of visual similarity
recommendations passed despite high compatibility
diversity score of daily 5
```

### Safety Metrics

```txt
rejected photos
reported profiles
fake-looking profiles
moderation review count
```

---

## 23. Testing Plan

### A/B Test 1: Photo Quality Boost

Group A:

```txt
Current algorithm
```

Group B:

```txt
Current algorithm + photo quality score
```

Measure:

```txt
like rate
response rate
mutual match rate
```

### A/B Test 2: Photo Preference Score

Group A:

```txt
No visual preference score
```

Group B:

```txt
Small visual preference score included
```

Measure:

```txt
first 5 likes
mutuals
passes
session length
```

### A/B Test 3: Diversity Composition

Group A:

```txt
Top 5 highest scores only
```

Group B:

```txt
Daily 5 composition rule
```

Measure:

```txt
like spread
response rate
user satisfaction
mutual match rate
```

---

## 24. Example Recommendation Response

```json
{
  "userId": "user_123",
  "recommendations": [
    {
      "candidateUserId": "user_456",
      "finalScore": 88,
      "scoreBreakdown": {
        "compatibilityScore": 74,
        "activityScore": 95,
        "responseScore": 82,
        "reciprocityScore": 70,
        "profileQualityScore": 90,
        "photoPreferenceScore": 63,
        "diversityScore": 55
      },
      "labels": ["Active today", "Clear profile", "Similar vibe"],
      "reason": "Active today, strong profile quality, and similar to profiles you have liked before."
    }
  ]
}
```

---

## 25. Development Notes for Coding Agent

1. Keep the first implementation rule-based.
2. Do not introduce heavy ML training at first.
3. Use photo quality and basic embeddings before advanced models.
4. Keep photo score weights small initially.
5. Never expose internal scores to users.
6. Never create attractiveness ratings.
7. Make all photo-based labels safe and positive.
8. Ensure user deletes remove photo analysis data.
9. Add admin visibility for photo quality issues.
10. Track conversion metrics before and after launch.

---

## 26. Final Expected Outcome

After implementation, StrathSpace should be able to recommend first-session and daily profiles that are:

- active
- responsive
- compatible
- visually well-presented
- aligned with the user’s observed preferences
- diverse enough to keep discovery interesting
- less likely to be ignored
- more likely to create mutual matches

The product should feel smarter without making users feel judged.

The final direction is:

> Photo-aware matching, not face-rating matching.

This is the safest and most useful way to use profile pictures to improve match quality.
