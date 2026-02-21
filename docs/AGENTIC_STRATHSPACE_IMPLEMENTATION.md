# StrathSpace 2.0 — Agentic Matchmaking Platform

## Complete Implementation Document

> **"Tell the app who you're looking for. It finds them."**

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Technical Stack](#2-technical-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Development Stages](#5-development-stages)
   - [Stage 1: Profile Intelligence Layer](#stage-1-profile-intelligence-layer)
   - [Stage 2: Intent Agent API](#stage-2-intent-agent-api)
   - [Stage 3: Core Agent UI](#stage-3-core-agent-ui)
   - [Stage 4: Weekly Drop System](#stage-4-weekly-drop-system)
   - [Stage 5: Match Missions](#stage-5-match-missions)
   - [Stage 6: Wingman Memory](#stage-6-wingman-memory)
   - [Stage 7: Vibe Check Voice Calls](#stage-7-vibe-check-voice-calls)
  - [Stage 8: Wingman Link (Pass-the-Phone)](#stage-8-wingman-link-pass-the-phone)
   - [Stage 9: Study Date Mode](#stage-9-study-date-mode)
   - [Stage 10: Compatibility Scoring](#stage-10-compatibility-scoring)
   - [Stage 11: Hype Me (Friend Vouches)](#stage-11-hype-me-friend-vouches)
   - [Stage 12: Blind Dates IRL](#stage-12-blind-dates-irl)
   - [Stage 13: Polish, Analytics & Launch](#stage-13-polish-analytics--launch)
6. [Cost Projections](#6-cost-projections)
7. [Risk Mitigation](#7-risk-mitigation)
8. [Success Metrics](#8-success-metrics)

---

## 1. Product Vision

### What StrathSpace IS
An **intent-driven matchmaking agent** for university students. Users describe who they're looking for in natural language (text or voice). The AI agent interprets their intent, searches real campus profiles intelligently, and returns 3–7 highly relevant matches — each with an explanation of **why** they were matched.

### What StrathSpace IS NOT
- A swipe app
- A dopamine casino
- A chatbot with profile search
- A generic dating platform

### Core Experience Loop
```
1. User describes who they want    → "someone chill, final year, gym but not obsessed"
2. Agent understands intent         → structured filters + semantic meaning
3. Agent searches 3,000+ profiles   → hard filters + vector similarity
4. Agent ranks and selects 3-7      → weighted scoring algorithm
5. Agent explains each match        → "87% aligned — both value deep conversation"
6. Users connect with confidence    → conversation starters provided
7. App pushes toward IRL meetups    → Match Missions, Blind Dates, Study Dates
8. Feedback loop improves agent     → agent learns what works for each user
```

### Key Differentiators
| Traditional Apps | StrathSpace |
|---|---|
| Swipe through 100s of faces | Describe who you want, get 3-7 |
| Random ordering, engagement-optimized | Intent-matched, outcome-optimized |
| Chat awkwardly, hope for a date | Match Missions push toward IRL meetups |
| Same experience every day | Weekly Drops create ritual + anticipation |
| Profile is static | Agent remembers, learns, adapts |
| Matching is a black box | Every match has an explanation |

---

## 2. Technical Stack

### Existing (Keeping)
| Layer | Technology | Purpose |
|---|---|---|
| Mobile App | React Native + Expo SDK 54 | Cross-platform mobile frontend |
| Routing | Expo Router v6 | File-based navigation |
| Styling | NativeWind v4 (Tailwind) | Utility-first styling |
| Backend | Next.js 16+ (Vercel) | API routes, serverless functions |
| Database | PostgreSQL (Neon Serverless) | Primary data store |
| ORM | Drizzle ORM | Type-safe database queries |
| Auth | Better Auth + Expo plugin | Email, Google, Apple sign-in |
| State | TanStack Query v5 | Server state management |
| Animations | React Native Reanimated v4 | Gesture + spring animations |
| Storage | AWS S3 + presigned URLs | Photo uploads |
| Hosting | Vercel | Backend deployment |

### New (Adding)
| Layer | Technology | Purpose | Cost |
|---|---|---|---|
| Vector Search | **pgvector** (Neon extension) | Semantic profile matching | Free (Neon built-in) |
| Embeddings | **Gemini text-embedding-004** | Profile + intent vectorization | ~$0.006/1M tokens |
| LLM (Intent) | **Gemini 2.0 Flash** | Intent parsing, structured output | ~$0.10/1M input tokens |
| LLM (Summaries) | **Gemini 2.0 Flash Lite** | Profile summaries, explanations | ~$0.04/1M input tokens |
| Voice Input | **Expo Speech** / **Whisper API** | Voice-to-text for queries | Free (on-device) / $0.006/min |
| Voice Calls | **Daily.co** | Vibe Check 3-min calls | Free tier (10K min/month) |
| Push Notifications | **Expo Push** | Weekly drops, missions, reminders | Free |
| Cron Jobs | **Vercel Cron** | Weekly drops, nightly re-ranking | Free (Vercel Pro) |
| Analytics | **PostHog** (self-host or cloud) | Funnel tracking, retention | Free tier |

### Why Gemini Over OpenAI
| Factor | Gemini 2.0 Flash | GPT-4o-mini |
|---|---|---|
| Input cost/1M tokens | $0.10 | $0.15 |
| Output cost/1M tokens | $0.40 | $0.60 |
| Structured JSON output | ✅ Native | ✅ Native |
| Embedding model cost | $0.006/1M | $0.020/1M |
| Speed | ~500ms | ~600ms |
| Free tier | Yes (60 RPM) | No |
| **Total cost at 50K queries/day** | **~$8/day** | **~$12/day** |

### Infrastructure Diagram
```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ Agent UI │  │ Matches  │  │ Wingman  │  │ Profile ││
│  │(Talk/Mic)│  │ + Missions│  │  Packs  │  │ + Hype  ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘│
│       │              │              │              │     │
│       └──────────────┴──────────────┴──────────────┘     │
│                          │                               │
│                    TanStack Query                        │
│                    (Cache Layer)                         │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTPS / Bearer Token
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  BACKEND (Next.js on Vercel)              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │                 API Routes                        │    │
│  │  /api/agent/search     → Intent pipeline          │    │
│  │  /api/agent/refine     → Refinement pipeline      │    │
│  │  /api/drops/generate   → Weekly drop cron         │    │
│  │  /api/missions/assign  → Post-match missions      │    │
│  │  /api/wingman/pack     → Wingman pack + matches    │    │
│  │  /api/vibe-check/      → Voice call sessions      │    │
│  │  /api/study-date/      → Availability broadcast   │    │
│  │  /api/hype/            → Friend vouches           │    │
│  │  /api/embeddings/sync  → Embedding management     │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                        │
│       ┌─────────┴──────────┐                             │
│       ▼                    ▼                             │
│  ┌─────────┐      ┌──────────────┐                      │
│  │ Gemini  │      │   Neon DB    │                      │
│  │  Flash  │      │ (PostgreSQL  │                      │
│  │  API    │      │ + pgvector)  │                      │
│  └─────────┘      └──────────────┘                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Daily.co │  │ Expo Push│  │ Vercel   │              │
│  │ (Voice)  │  │ (Notifs) │  │ Cron     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└──────────────────────────────────────────────────────────┘
```

---

## 3. System Architecture

### The Agent Pipeline (Core)
```
User Input (text or voice)
       │
       ▼
┌─────────────────────────────────────────┐
│ STEP 1: Voice Processing (if voice)     │
│ Expo Speech Recognition → text          │
│ Latency: ~300ms (on-device)             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ STEP 2: Intent Understanding (PARALLEL) │
│                                         │
│  A. Gemini Flash → structured JSON      │
│     {                                   │
│       gender: "female",                 │
│       year_range: [3, 4],               │
│       personality: ["calm", "focused"], │
│       lifestyle: { party: "low" },      │
│       hard_filters: true                │
│     }                                   │
│     Latency: ~500ms                     │
│                                         │
│  B. Gemini Embed → intent vector [768]  │
│     Latency: ~100ms                     │
│                                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ STEP 3: Intelligent Search              │
│                                         │
│  Single SQL query combining:            │
│  • Hard filters (gender, year, blocks)  │
│  • Vector similarity (pgvector <=>)     │
│  • Active/visible checks                │
│  Returns: Top 20 candidates             │
│  Latency: ~50ms                         │
│                                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ STEP 4: Ranking & Scoring               │
│                                         │
│  For each of 20 candidates:             │
│  score = 0.45 × semantic_similarity     │
│        + 0.25 × preference_match        │
│        + 0.15 × activity_engagement     │
│        + 0.10 × mutual_interest         │
│        + 0.05 × freshness_diversity     │
│                                         │
│  Select top 3–7                         │
│  Latency: ~10ms (in-memory)             │
│                                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ STEP 5: Explanation Generation          │
│                                         │
│  80% template-based (instant):          │
│  • "Matches your preference for [X]"    │
│  • "Similar personality: calm & mature" │
│                                         │
│  20% LLM-enriched (top 1-2 matches):   │
│  • Gemini Flash Lite → personalized     │
│  Latency: ~200ms avg                    │
│                                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ STEP 6: Response Assembly               │
│                                         │
│  {                                      │
│    matches: [{                          │
│      profile: { ... },                  │
│      score: 0.87,                       │
│      reasons: ["Both value...", ...],   │
│      conversation_starters: [           │
│        "You both love gym...",          │
│      ],                                │
│      compatibility: { ... }             │
│    }],                                  │
│    agent_message: "Found 5 people...",  │
│    refinement_hints: ["more/less X"]    │
│  }                                      │
│                                         │
│  Total Pipeline: 1.5–2.5 seconds        │
└─────────────────────────────────────────┘
```

### Data Flow Diagram
```
┌─────────────┐         ┌─────────────┐
│   Profile    │  write  │  Embedding  │
│   Update     │───────→│  Pipeline   │
│  (user edit) │         │ (Gemini API)│
└─────────────┘         └──────┬──────┘
                               │
                          embed + store
                               │
                               ▼
                   ┌───────────────────┐
                   │    Neon DB         │
                   │  ┌─────────────┐  │
                   │  │  profiles   │  │
                   │  │  + embedding│  │ ← pgvector column
                   │  │  + summary  │  │ ← text personality summary
                   │  └─────────────┘  │
                   │  ┌─────────────┐  │
                   │  │  agent_ctx  │  │ ← wingman memory per user
                   │  └─────────────┘  │
                   │  ┌─────────────┐  │
                   │  │  drops      │  │ ← weekly pre-computed matches
                   │  └─────────────┘  │
                   │  ┌─────────────┐  │
                   │  │  missions   │  │ ← post-match activities
                   │  └─────────────┘  │
                   └───────────────────┘
                            ▲
                            │ query
                            │
                   ┌────────┴───────┐
                   │  Agent Search  │
                   │  (API route)   │
                   └────────────────┘
```

---

## 4. Database Schema Changes

### New Tables & Columns

```sql
-- =============================================
-- 1. PROFILE EMBEDDING (add to existing profiles table)
-- =============================================
-- Enable pgvector extension on Neon
CREATE EXTENSION IF NOT EXISTS vector;

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN personality_summary TEXT;
ALTER TABLE profiles ADD COLUMN embedding vector(768);
ALTER TABLE profiles ADD COLUMN embedding_updated_at TIMESTAMP;

-- HNSW index for fast similarity search
CREATE INDEX profiles_embedding_idx ON profiles 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);


-- =============================================
-- 2. AGENT CONTEXT (Wingman Memory)
-- =============================================
CREATE TABLE agent_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- Accumulated preferences learned over time
    learned_preferences JSONB DEFAULT '{}',
    -- { "prefers_introverts": 0.8, "dislikes_party": 0.9, "likes_gym": 0.6 }
    
    -- History of queries (last 20)
    query_history JSONB DEFAULT '[]',
    -- [{ "query": "...", "timestamp": "...", "matched_ids": [...], "feedback": "..." }]
    
    -- Match feedback history
    match_feedback JSONB DEFAULT '[]',
    -- [{ "matched_user_id": "...", "outcome": "amazing|nice|meh|not_for_me", "date": "..." }]
    
    -- Agent conversation state
    last_agent_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id)
);

CREATE INDEX agent_context_user_idx ON agent_context(user_id);


-- =============================================
-- 3. WEEKLY DROPS
-- =============================================
CREATE TABLE weekly_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- The matches in this drop
    matched_user_ids JSONB NOT NULL DEFAULT '[]',
    match_data JSONB NOT NULL DEFAULT '[]',
    -- [{ user_id, score, reasons, starters }]
    
    -- Drop metadata
    drop_number INTEGER NOT NULL, -- Which week
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending', -- pending, delivered, opened, expired
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX drops_user_idx ON weekly_drops(user_id);
CREATE INDEX drops_status_idx ON weekly_drops(status);
CREATE INDEX drops_expires_idx ON weekly_drops(expires_at);


-- =============================================
-- 4. MATCH MISSIONS
-- =============================================
CREATE TABLE match_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Mission details
    mission_type TEXT NOT NULL,
    -- 'coffee_meetup', 'song_exchange', 'photo_challenge', 'study_date', 
    -- 'campus_walk', 'food_adventure', 'sunset_spot'
    
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL,
    
    -- Location/time suggestion
    suggested_location TEXT,
    suggested_time TEXT, -- "Before Friday", "This weekend"
    deadline TIMESTAMP NOT NULL,
    
    -- Status tracking
    user1_accepted BOOLEAN DEFAULT FALSE,
    user2_accepted BOOLEAN DEFAULT FALSE,
    user1_completed BOOLEAN DEFAULT FALSE,
    user2_completed BOOLEAN DEFAULT FALSE,
    
    status TEXT DEFAULT 'proposed',
    -- 'proposed', 'accepted', 'completed', 'expired', 'skipped'
    
    -- Post-mission
    user1_rating TEXT, -- 'amazing', 'nice', 'meh', 'not_for_me'
    user2_rating TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX missions_match_idx ON match_missions(match_id);
CREATE INDEX missions_status_idx ON match_missions(status);
CREATE INDEX missions_deadline_idx ON match_missions(deadline);


-- =============================================
-- 5. VIBE CHECKS (Voice Calls)
-- =============================================
CREATE TABLE vibe_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Call details
    room_name TEXT NOT NULL UNIQUE, -- Daily.co room identifier
    room_url TEXT,
    
    -- Participants
    user1_id TEXT NOT NULL REFERENCES "user"(id),
    user2_id TEXT NOT NULL REFERENCES "user"(id),
    
    -- Scheduling
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER, -- Max 180 (3 min)
    
    -- Post-call decisions
    user1_decision TEXT, -- 'meet', 'pass'
    user2_decision TEXT,
    both_agreed_to_meet BOOLEAN DEFAULT FALSE,
    
    -- Conversation starter provided
    suggested_topic TEXT,
    
    status TEXT DEFAULT 'pending',
    -- 'pending', 'scheduled', 'active', 'completed', 'expired', 'cancelled'
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX vibe_checks_match_idx ON vibe_checks(match_id);
CREATE INDEX vibe_checks_status_idx ON vibe_checks(status);


-- =============================================
-- 6. WINGMAN LINKS + WINGMAN PACKS (Pass-the-Phone)
-- =============================================
CREATE TABLE wingman_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    
    -- Share token
    token TEXT NOT NULL UNIQUE,
    
    -- Collection rules
    target_submissions INTEGER DEFAULT 3,
    current_submissions INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    
    status TEXT DEFAULT 'collecting',
    -- 'collecting', 'ready', 'expired'
    last_submission_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(profile_user_id, round_number)
);

CREATE INDEX wingman_links_profile_idx ON wingman_links(profile_user_id);
CREATE INDEX wingman_links_expires_idx ON wingman_links(expires_at);

CREATE TABLE wingman_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES wingman_links(id) ON DELETE CASCADE,
    
    author_name TEXT NOT NULL,
    relationship TEXT, -- optional: 'friend', 'roommate', 'coworker', etc.
    
    -- Structured inputs (keep it simple, compile later)
    three_words JSONB NOT NULL DEFAULT '[]', -- ["calm", "funny", "lowkey"]
    green_flags JSONB NOT NULL DEFAULT '[]',
    red_flag_funny TEXT,
    hype_note TEXT,
    
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX wingman_submissions_link_idx ON wingman_submissions(link_id);

CREATE TABLE wingman_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    link_id UUID NOT NULL REFERENCES wingman_links(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    
    -- Compiled summary shown in the app
    compiled_summary JSONB NOT NULL DEFAULT '{}',
    -- { top_words: [...], green_flags: [...], funniest_red_flag: "...", hype_lines: [...] }
    
    -- The prompt used to run the agent search
    wingman_prompt TEXT NOT NULL,
    
    -- Cached results for the pack (3-7 matches)
    match_data JSONB NOT NULL DEFAULT '[]',
    
    generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    opened_at TIMESTAMP,
    UNIQUE(profile_user_id, round_number)
);

CREATE INDEX wingman_packs_profile_idx ON wingman_packs(profile_user_id);


-- =============================================
-- 7. STUDY DATE MODE
-- =============================================
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
  -- Location
  location_name TEXT NOT NULL, -- "Main Library", "Strath Café"
  university TEXT NOT NULL,
    
  -- Availability
  available_until TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
    
  -- What they're studying (optional, for matching)
  subject TEXT,
  vibe TEXT, -- 'silent_focus', 'chill_chat', 'group_study'
    
  -- Preferences
  open_to_anyone BOOLEAN DEFAULT TRUE,
  preferred_gender TEXT, -- Optional filter
    
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX study_sessions_active_idx ON study_sessions(is_active, university);
CREATE INDEX study_sessions_user_idx ON study_sessions(user_id);
CREATE INDEX study_sessions_expires_idx ON study_sessions(available_until);


-- =============================================
-- 8. HYPE ME (Friend Vouches)
-- =============================================
CREATE TABLE hype_vouches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    -- Vouch author (may not be a user — external friends via link)
    author_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL, -- Display name for external writers
    
    content TEXT NOT NULL, -- The vouch text (max 200 chars)
    
    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE, -- Profile owner can hide
    is_flagged BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX hype_vouches_profile_idx ON hype_vouches(profile_user_id);

-- Invite links for external vouchers
CREATE TABLE hype_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    max_uses INTEGER DEFAULT 5,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX hype_links_token_idx ON hype_invite_links(token);


-- =============================================
-- 9. BLIND DATES
-- =============================================
CREATE TABLE blind_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user1_id TEXT NOT NULL REFERENCES "user"(id),
    user2_id TEXT NOT NULL REFERENCES "user"(id),
    match_id TEXT REFERENCES matches(id),
    
    -- Meeting details
    location TEXT NOT NULL,
    suggested_time TIMESTAMP NOT NULL,
    code_word TEXT NOT NULL, -- How they identify each other
    
    -- Status
    user1_opted_in BOOLEAN DEFAULT FALSE,
    user2_opted_in BOOLEAN DEFAULT FALSE,
    
    status TEXT DEFAULT 'proposed',
    -- 'proposed', 'confirmed', 'completed', 'cancelled', 'no_show'
    
    -- Post-date feedback
    user1_feedback TEXT, -- 'amazing', 'nice', 'meh', 'not_for_me'
    user2_feedback TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX blind_dates_users_idx ON blind_dates(user1_id, user2_id);
CREATE INDEX blind_dates_status_idx ON blind_dates(status);


-- =============================================
-- 10. ANALYTICS EVENTS (Lightweight)
-- =============================================
CREATE TABLE agent_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    -- 'agent_search', 'agent_refine', 'drop_opened', 'drop_expired',
    -- 'mission_accepted', 'mission_completed', 'vibe_check_started',
    -- 'vibe_check_agreed', 'study_date_created', 'blind_date_confirmed',
  -- 'wingman_link_created', 'wingman_submission_received',
  -- 'wingman_pack_opened', 'wingman_pack_shared', 'wingman_match_connected',
  -- 'hype_written'
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX analytics_user_idx ON agent_analytics(user_id);
CREATE INDEX analytics_event_idx ON agent_analytics(event_type);
CREATE INDEX analytics_created_idx ON agent_analytics(created_at DESC);
```

### Drizzle Schema (TypeScript)
All tables above will be defined in Drizzle ORM format in `src/db/schema.ts`, following the existing patterns with proper relations, indexes, and type exports.

---

## 5. Development Stages

### Timeline Overview
```
Week 1-2:  Stage 1 — Profile Intelligence Layer
Week 2-3:  Stage 2 — Intent Agent API  
Week 3-4:  Stage 3 — Core Agent UI
Week 4:    Stage 4 — Weekly Drop System
Week 5:    Stage 5 — Match Missions
Week 5-6:  Stage 6 — Wingman Memory
Week 6-7:  Stage 7 — Vibe Check Voice Calls
Week 7-8:  Stage 8 — Wingman Link (Pass-the-Phone)
Week 8:    Stage 9 — Study Date Mode
Week 9:    Stage 10 — Compatibility Scoring
Week 9-10: Stage 11 — Hype Me (Friend Vouches)
Week 10:   Stage 12 — Blind Dates IRL
Week 11-12: Stage 13 — Polish, Analytics & Launch
```

**Total: ~12 weeks (3 months) to full feature-complete.**
**MVP (Stages 1-4): ~4 weeks.**

---

### Stage 1: Profile Intelligence Layer
**Duration: 5-7 days**
**Priority: 🔴 CRITICAL — Everything depends on this**

#### What We're Building
- Add pgvector extension to Neon database
- Add `embedding` and `personality_summary` columns to profiles
- Build profile summarization pipeline (structured fields → natural text)
- Build embedding generation service (text → 768-dim vector)
- Backfill all existing ~3,000 profiles
- Hook into profile create/update to auto-regenerate

#### Backend Tasks

##### 1.1 Enable pgvector on Neon
```
File: Database console / migration
Action: CREATE EXTENSION IF NOT EXISTS vector;
```

##### 1.2 Schema migration
```
File: src/db/schema.ts
Action: Add personality_summary, embedding, embedding_updated_at to profiles
File: drizzle/ migration
Action: Generate + run migration
```

##### 1.3 Profile Summarizer Service
```
File: src/lib/services/profile-summarizer.ts
Purpose: Takes profile structured data → generates natural language summary
Uses: Gemini 2.0 Flash Lite (cheapest)
Input: { age, gender, yearOfStudy, interests, bio, lifestyle flags, prompts }
Output: "Third-year female student, introverted but social, loves fitness and 
         reading, avoids nightlife, values loyalty and deep conversations."
```

**LLM Prompt Template:**
```
You are a profile summarizer for a university dating app. 
Given the following profile data, write a concise 2-3 sentence personality 
summary that captures who this person is, their vibe, and what they value.
Be natural and human-sounding. Do not use bullet points.

Profile data:
{profile_json}

Personality summary:
```

##### 1.4 Embedding Service
```
File: src/lib/services/embedding-service.ts
Purpose: Takes text → returns 768-dim vector
Uses: Gemini text-embedding-004
API: POST https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent
```

##### 1.5 Backfill Script
```
File: src/scripts/backfill-embeddings.ts
Purpose: One-time script to process all 3,000 profiles
Process: 
  1. Fetch all profiles with null embedding
  2. Batch in groups of 50
  3. Generate summary → generate embedding → store
  4. Rate limit: 60 RPM (Gemini free tier) or 1000 RPM (paid)
Estimated time: ~5 minutes at paid tier, ~50 minutes at free tier
Estimated cost: ~$0.02
```

##### 1.6 Auto-Update Hook
```
File: src/app/api/user/profile/route.ts (modify existing)
Action: After profile update, trigger async re-embedding
Process: 
  1. Profile saved to DB
  2. Fire async call to regenerate summary + embedding
  3. Update embedding + embedding_updated_at
```

#### Verification Checklist
- [ ] pgvector extension enabled on Neon
- [ ] Migration adds columns successfully
- [ ] Profile summarizer generates coherent summaries
- [ ] Embeddings are 768 dimensions, stored correctly
- [ ] All 3,000 profiles backfilled
- [ ] Profile update triggers re-embedding
- [ ] HNSW index created and functional
- [ ] Similarity search returns sensible results

---

### Stage 2: Intent Agent API
**Duration: 5-7 days**
**Priority: 🔴 CRITICAL — The core agent brain**

#### What We're Building
- Intent parser (user text → structured JSON + intent embedding)
- Combined SQL + vector search query
- Ranking algorithm
- Explanation generator
- Main `/api/agent/search` endpoint
- Refinement `/api/agent/refine` endpoint

#### Backend Tasks

##### 2.1 Intent Parser Service
```
File: src/lib/services/intent-parser.ts
Purpose: User query → structured constraints + intent embedding
Uses: Gemini 2.0 Flash (JSON mode)
```

**LLM Prompt Template:**
```
You are an intent parser for a university dating app matchmaker.
The user is describing the kind of person they want to meet.

Extract structured constraints from their description.
Return ONLY valid JSON matching this schema:

{
  "gender": "male" | "female" | "any" | null,
  "year_range": [min_year, max_year] | null,
  "age_range": [min_age, max_age] | null,
  "university": "string" | null,
  "personality_traits": ["trait1", "trait2"],
  "lifestyle": {
    "party_level": "low" | "medium" | "high" | null,
    "fitness_level": "low" | "medium" | "high" | null,
    "religion_important": true | false | null,
    "smoking": "yes" | "no" | "sometimes" | null
  },
  "interests": ["interest1", "interest2"],
  "deal_breakers": ["dealbreaker1"],
  "vibe_keywords": ["keyword1", "keyword2"],
  "looking_for": "relationship" | "friends" | "study_buddy" | "casual" | null
}

Omit fields you cannot determine. Infer meaning:
- "chill" → personality: calm, relaxed; party_level: low-medium
- "focused" → personality: ambitious, disciplined
- "fun but not wild" → party_level: medium
- "gym" → fitness_level: medium-high

User query: "{user_query}"
```

##### 2.2 Search Builder
```
File: src/lib/services/agent-search.ts
Purpose: Combines structured filters + vector search in single query
```

**Core Query Logic:**
```typescript
async function agentSearch(
  userId: string,
  parsedIntent: ParsedIntent,
  intentEmbedding: number[],
  limit: number = 20
) {
  // Single query: hard filters + vector similarity
  const results = await db.execute(sql`
    SELECT 
      p.*,
      u.name, u.image, u.last_active,
      1 - (p.embedding <=> ${intentEmbedding}::vector) AS semantic_score
    FROM profiles p
    JOIN "user" u ON p.user_id = u.id
    WHERE p.is_visible = true
      AND p.profile_completed = true
      AND u.deleted_at IS NULL
      AND p.user_id != ${userId}
      -- Exclude blocked users (both directions)
      AND p.user_id NOT IN (
        SELECT blocked_id FROM blocks WHERE blocker_id = ${userId}
        UNION
        SELECT blocker_id FROM blocks WHERE blocked_id = ${userId}
      )
      -- Exclude already matched users
      AND p.user_id NOT IN (
        SELECT CASE WHEN user1_id = ${userId} THEN user2_id ELSE user1_id END
        FROM matches
        WHERE user1_id = ${userId} OR user2_id = ${userId}
      )
      -- Hard filters (only applied if specified)
      ${parsedIntent.gender ? sql`AND p.gender = ${parsedIntent.gender}` : sql``}
      ${parsedIntent.year_range ? sql`AND p.year_of_study BETWEEN ${parsedIntent.year_range[0]} AND ${parsedIntent.year_range[1]}` : sql``}
      ${parsedIntent.age_range ? sql`AND p.age BETWEEN ${parsedIntent.age_range[0]} AND ${parsedIntent.age_range[1]}` : sql``}
      ${parsedIntent.university ? sql`AND p.university = ${parsedIntent.university}` : sql``}
      -- Embedding must exist
      AND p.embedding IS NOT NULL
    ORDER BY p.embedding <=> ${intentEmbedding}::vector
    LIMIT ${limit}
  `);
  
  return results;
}
```

##### 2.3 Ranking Service
```
File: src/lib/services/ranking-service.ts
Purpose: Re-rank top 20 candidates → select 3-7
```

**Scoring Formula:**
```typescript
function calculateFinalScore(candidate, parsedIntent, userId): number {
  const semanticScore = candidate.semantic_score;                // 0-1 from pgvector
  const preferenceScore = calculatePreferenceMatch(candidate, parsedIntent); // 0-1
  const activityScore = calculateActivityScore(candidate);       // 0-1 based on last_active
  const mutualInterestScore = calculateMutualInterest(candidate, userId); // 0-1
  const freshnessScore = calculateFreshness(candidate, userId);  // 0-1 (not shown before)
  
  return (
    0.45 * semanticScore +
    0.25 * preferenceScore +
    0.15 * activityScore +
    0.10 * mutualInterestScore +
    0.05 * freshnessScore
  );
}
```

##### 2.4 Explanation Generator
```
File: src/lib/services/explanation-service.ts
Purpose: Generate human-readable match reasons
```

**Template-Based (80% of explanations):**
```typescript
const EXPLANATION_TEMPLATES = {
  high_semantic: (score) => 
    `${Math.round(score * 100)}% personality alignment with what you described`,
  year_match: (year) => 
    `Year ${year} student — matches your preference`,
  shared_interests: (interests) => 
    `You both enjoy ${interests.slice(0, 3).join(', ')}`,
  lifestyle_match: (trait, value) => 
    `${trait}: ${value} — aligns with your vibe`,
  active_user: () => 
    `Active on campus recently`,
  low_party: () => 
    `Low nightlife activity — focused and grounded`,
  high_fitness: () => 
    `Into fitness without being obsessed`,
};
```

**LLM-Enriched (Top 1-2 matches):**
```
Given these two profiles, write ONE sentence explaining why they'd be a great match.
Be warm and specific. Reference actual shared traits.

User looking for: {user_query}
Matched profile summary: {candidate_summary}

Match explanation:
```

##### 2.5 Conversation Starter Generator
```
File: src/lib/services/conversation-starters.ts
Purpose: Generate 2-3 conversation starters per match
```

These are template-based using shared interests:
```typescript
function generateStarters(userProfile, matchProfile): string[] {
  const starters = [];
  const sharedInterests = findSharedInterests(userProfile, matchProfile);
  
  if (sharedInterests.length > 0) {
    starters.push(`You both love ${sharedInterests[0]} — what got you into it?`);
  }
  if (matchProfile.course) {
    starters.push(`How's ${matchProfile.course} treating you this semester?`);
  }
  // ... more templates based on profile data
  return starters.slice(0, 3);
}
```

##### 2.6 Main API Endpoints
```
File: src/app/api/agent/search/route.ts
Method: POST
Body: { query: string, voice?: boolean }
Response: { matches: MatchResult[], agent_message: string, refinement_hints: string[] }

File: src/app/api/agent/refine/route.ts  
Method: POST
Body: { original_query: string, refinement: string, previous_match_ids: string[] }
Response: { matches: MatchResult[], agent_message: string }
```

#### Verification Checklist
- [ ] Intent parser extracts correct structured JSON from natural language
- [ ] Intent embedding generates 768-dim vector
- [ ] SQL + vector search returns relevant candidates
- [ ] Ranking produces sensible ordering
- [ ] Explanations are readable and accurate
- [ ] Conversation starters are contextual
- [ ] Refinement re-runs pipeline with adjusted intent
- [ ] End-to-end latency < 3 seconds
- [ ] Handles edge cases: empty results, profanity, non-dating queries

---

### Stage 3: Core Agent UI
**Duration: 5-7 days**
**Priority: 🔴 CRITICAL — The user-facing agent experience**

#### What We're Building
- "Talk to StrathSpace" screen (main interaction)
- Text input with mic button (voice later)
- Typing/thinking animation while agent processes
- Curated matches display (card carousel)
- Match detail view with reasons + starters
- Refinement input ("more introverted", "closer to campus")
- Integration with existing match/chat flow

#### Frontend Tasks

##### 3.1 Agent Screen
```
File: app/(tabs)/index.tsx (replace current discover/connect screen)
Purpose: The main agent interaction screen

Layout:
┌────────────────────────────┐
│       StrathSpace 🎯       │
│                            │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │   Agent Avatar/Logo  │  │
│  │                      │  │
│  │  "Hey [Name]! Tell   │  │
│  │   me who you're      │  │
│  │   looking for..."    │  │
│  │                      │  │
│  └──────────────────────┘  │
│                            │
│  Recent: "someone chill,   │
│  final year..."  [tap]     │
│                            │
│  ┌──────────────────────┐  │
│  │ Describe your ideal  │  │
│  │ match...        🎤   │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

##### 3.2 Agent Thinking State
```
File: components/agent/agent-thinking.tsx
Purpose: Animated state while agent processes (1.5-2.5s)

Visual:
- Pulsing gradient orb
- Text cycling: "Understanding you..." → "Searching campus..." → "Found some great people..."
- Spring animation on completion
```

##### 3.3 Curated Matches Display
```
File: components/agent/match-results.tsx
Purpose: Show 3-7 results as a card stack/carousel

Each card shows:
┌────────────────────────────┐
│  [Photo]           87% 🎯  │
│  Alex, 22 — Year 3         │
│                            │
│  "Both value deep convo"   │
│  "Low nightlife energy"    │
│  "Shared love of fitness"  │
│                            │
│  💬 Start with:            │
│  "You both love gym —      │
│   what's your routine?"    │
│                            │
│  [Connect]    [Skip]       │
└────────────────────────────┘
```

##### 3.4 Match Detail Overlay
```
File: components/agent/match-detail.tsx
Purpose: Full profile view with compatibility breakdown

Shows:
- Full photo gallery
- Personality summary
- Compatibility score breakdown (lifestyle, personality, interests)
- All match reasons
- 3 conversation starters
- "Connect" button → creates match + sends intro message
```

##### 3.5 Refinement Bar
```
File: components/agent/refinement-bar.tsx
Purpose: Quick refinement after seeing results

Visual:
┌────────────────────────────────┐
│ Refine: [more introverted ▾]  │
│ [closer to campus] [older ▾]  │
│ [Custom: _______________]     │
└────────────────────────────────┘

Quick chips + free text input
Triggers /api/agent/refine
```

##### 3.6 Agent Hook
```
File: hooks/use-agent.ts
Purpose: Manages agent state, queries, results

const { 
  search,           // (query: string) => void
  refine,           // (refinement: string) => void
  results,          // AgentMatch[]
  isThinking,       // boolean
  agentMessage,     // string
  refinementHints,  // string[]
  error,            // string | null
} = useAgent();
```

##### 3.7 Navigation Integration
```
File: app/(tabs)/_layout.tsx (modify)
Action: Replace "Connect" tab with "Agent" / "Find" tab
Icon: sparkles or wand
```

#### Verification Checklist
- [ ] Text input sends query to agent API
- [ ] Thinking state shows while processing
- [ ] Results display as card carousel
- [ ] Each card shows photo, score, reasons, starters
- [ ] "Connect" creates a match and navigates to chat
- [ ] "Skip" marks as passed for diversity scoring
- [ ] Refinement re-queries and updates results
- [ ] Empty state handles gracefully ("No one matched, try broadening...")
- [ ] Error state shows friendly message
- [ ] Works on iOS and Android
- [ ] Haptic feedback on key interactions

---

### Stage 4: Weekly Drop System
**Duration: 3-4 days**
**Priority: 🟡 HIGH — Primary retention mechanism**

#### What We're Building
- Cron job that generates weekly matches for all active users
- Push notification delivery system
- "Your Matches" drop UI with countdown timer
- 48-hour expiry on drop matches
- Drop history view

#### Backend Tasks

##### 4.1 Drop Generation Cron
```
File: src/app/api/cron/weekly-drop/route.ts
Schedule: Every Sunday at 7:00 PM EAT (Africa/Nairobi)
Process:
  1. Fetch all active users (last_active within 14 days)
  2. For each user, run the agent pipeline with their learned preferences
     (or default: "find me compatible people")
  3. Store results in weekly_drops table
  4. Send push notification via Expo Push
  5. Set expires_at = NOW() + 48 hours
```

##### 4.2 Drop API
```
File: src/app/api/drops/current/route.ts
Method: GET
Returns: Current week's drop (if not expired)

File: src/app/api/drops/history/route.ts
Method: GET
Returns: Past drops with outcomes
```

#### Frontend Tasks

##### 4.3 Drop Notification Handler
```
File: components/agent/drop-notification.tsx
Purpose: In-app notification when drop arrives
Visual: Slide-down banner → "Your weekly matches are here! 🎯"
```

##### 4.4 Drop Screen
```
File: components/agent/weekly-drop.tsx
Purpose: Special presentation for weekly drop matches

Visual:
┌────────────────────────────┐
│   Your Weekly Drop 🎯      │
│   Expires in 36h 14m       │
│                            │
│   ┌────┐ ┌────┐ ┌────┐   │
│   │ 😊 │ │ 😊 │ │ 😊 │   │  (face cards, tap to expand)
│   │Alex│ │Sam │ │Jo  │   │
│   │87% │ │82% │ │79% │   │
│   └────┘ └────┘ └────┘   │
│                            │
│   + 2 more matches         │
│                            │
│   Don't like these?        │
│   [Talk to StrathSpace]    │
└────────────────────────────┘
```

#### Verification Checklist
- [ ] Cron runs reliably every Sunday at 7 PM EAT
- [ ] Drop generates 3-7 matches per user
- [ ] Push notification delivered
- [ ] Drop UI shows countdown timer
- [ ] Matches expire after 48 hours
- [ ] Users can still do on-demand agent searches
- [ ] Drop history is accessible

---

### Stage 5: Match Missions
**Duration: 3-4 days**
**Priority: 🟡 HIGH — Drives IRL meetups**

#### What We're Building
- Mission assignment after match creation
- Mission templates (context-aware)
- Mission acceptance/completion tracking
- Post-mission feedback
- Mission notifications + reminders

#### Backend Tasks

##### 5.1 Mission Template Engine
```
File: src/lib/services/mission-service.ts
Purpose: Select + personalize missions based on shared interests

Templates:
┌─────────────────┬───────────────────────────────────────────────┬──────┐
│ Type            │ Description                                   │ Days │
├─────────────────┼───────────────────────────────────────────────┼──────┤
│ coffee_meetup   │ Grab coffee at [campus café] before [day]     │ 3    │
│ song_exchange   │ Share one song each, meet to listen together  │ 2    │
│ photo_challenge │ Both photograph favorite campus spot, compare │ 3    │
│ study_date      │ Study together at [library] for 1 hour        │ 4    │
│ campus_walk     │ Walk from [A] to [B], no phones allowed       │ 3    │
│ food_adventure  │ Try a new meal together at [dining]           │ 5    │
│ sunset_spot     │ Watch the sunset from [campus view]           │ 3    │
│ quiz_challenge  │ Quiz each other on interests before meeting   │ 2    │
└─────────────────┴───────────────────────────────────────────────┴──────┘

Selection logic:
- Shared interest in music → song_exchange
- Both study a lot → study_date
- Both like outdoors → campus_walk or sunset_spot
- Default → coffee_meetup (always works)
```

##### 5.2 Mission API
```
File: src/app/api/missions/route.ts
GET → Get missions for user's matches
POST → Accept/complete a mission
PATCH → Rate post-mission
```

##### 5.3 Auto-Assignment Hook
Modify match creation logic: when a new match is created, auto-assign a mission.

#### Frontend Tasks

##### 5.4 Mission Card Component
```
File: components/matches/mission-card.tsx
Purpose: Shows mission on the match screen

Visual:
┌────────────────────────────────────┐
│ ☕ Coffee Meetup                   │
│                                    │
│ Grab coffee at Strath Café         │
│ before Friday                      │
│                                    │
│ ⏰ 2 days left                     │
│                                    │
│ [Accept Mission]  [Suggest Other]  │
└────────────────────────────────────┘
```

##### 5.5 Post-Mission Feedback
```
File: components/matches/mission-feedback.tsx
Visual: Bottom sheet after deadline with emoji ratings
```

#### Verification Checklist
- [ ] Mission auto-assigned on match creation
- [ ] Mission type selected based on shared interests
- [ ] Both users can accept
- [ ] Deadline countdown visible
- [ ] Reminder notification 12h before deadline
- [ ] Post-mission feedback collected
- [ ] Feedback feeds into agent_context for future matching

---

### Stage 6: Wingman Memory
**Duration: 3-4 days**
**Priority: 🟡 HIGH — Makes the agent feel alive**

#### What We're Building
- Persistent agent context per user
- Query history tracking
- Match outcome feedback integration
- Proactive agent messages based on history
- Preference learning over time

#### Backend Tasks

##### 6.1 Agent Context Service
```
File: src/lib/services/agent-context.ts
Purpose: Manage the wingman's memory

Functions:
- getContext(userId) → AgentContext
- updateAfterSearch(userId, query, matchIds)
- updateAfterFeedback(userId, matchedUserId, outcome)
- getLearnedPreferences(userId) → Preferences
- generateProactiveMessage(userId) → string | null
```

##### 6.2 Context Integration
Modify the agent search pipeline:
```
Before search:
  1. Load agent_context for user
  2. Append learned preferences to LLM prompt
  3. Include "previously shown" users for diversity

After search:
  1. Save query to history
  2. Update learned preferences based on selections

After match feedback:
  1. Update match_feedback array
  2. Recalculate preference weights
```

##### 6.3 Proactive Messages
```
Examples:
- "Last time you said calm and focused. Still your vibe, or changed?"
- "You matched with 3 introverts last month — exploring that?"
- "You haven't searched in a week. Want me to find someone new?"
```

#### Frontend Tasks

##### 6.4 Agent Greeting
Modify the agent screen to show personalized greetings:
```
New user: "Hey! Tell me who you're looking for..."
Returning: "Welcome back! Last time you liked calm introverts. Same vibe?"
After feedback: "You said Alex was great — want more people like them?"
```

##### 6.5 History Screen
```
File: components/agent/search-history.tsx
Purpose: View past queries and results
Visual: Timeline of past searches with outcomes
```

#### Verification Checklist
- [ ] Agent context persists across sessions
- [ ] Query history saved (last 20)
- [ ] Match feedback updates preferences
- [ ] Proactive messages feel natural, not creepy
- [ ] Learned preferences improve match quality
- [ ] User can reset wingman memory

---

### Stage 7: Vibe Check Voice Calls
**Duration: 5-7 days**
**Priority: 🟢 MEDIUM — Wow factor, technically complex**

#### What We're Building
- 3-minute anonymous voice calls between matched users
- Pre-call: photos hidden, only show first name
- Timer countdown during call
- Post-call: mutual "meet" / "pass" decision
- If both "meet": reveal full profiles
- Daily.co integration for WebRTC

#### Technology

##### Daily.co
- **Free tier**: 10,000 participant-minutes/month
- At 3 min/call, that's ~3,300 calls/month
- Beyond that: $0.004/participant-minute (~$0.024/call)
- Client SDK: `@daily-co/react-native-daily-js` (works with Expo)

#### Backend Tasks

##### 7.1 Daily.co Room Manager
```
File: src/lib/services/daily-service.ts
Purpose: Create/manage Daily.co rooms for vibe checks

Functions:
- createVibeCheckRoom(matchId) → { roomName, roomUrl, token1, token2 }
- endRoom(roomName)

Room config:
- max_participants: 2
- enable_chat: false
- enable_screenshare: false
- exp: now + 5 minutes (3 min call + 2 min buffer)
```

##### 7.2 Vibe Check API
```
File: src/app/api/vibe-check/route.ts
POST /api/vibe-check/create → Create room for a match
POST /api/vibe-check/join → Get token to join
POST /api/vibe-check/decision → Submit meet/pass
GET /api/vibe-check/result → Check if both decided
```

#### Frontend Tasks

##### 7.3 Vibe Check Initiation
```
File: components/matches/vibe-check-prompt.tsx
Visual: "Ready for a 3-min voice date? 🎤"
```

##### 7.4 Voice Call Screen
```
File: app/vibe-check/[matchId].tsx
Purpose: Full-screen voice call experience

Layout:
┌────────────────────────────┐
│                            │
│        ⏰ 2:47             │  ← Countdown timer
│                            │
│     🎤 Voice Only          │
│                            │
│     [Alex — Year 3]        │  ← Name only, no photo
│                            │
│   Suggested topic:         │
│   "What's your ideal       │
│    Sunday morning?"        │
│                            │
│      [End Call 📵]          │
└────────────────────────────┘
```

##### 7.5 Post-Call Decision
```
File: components/matches/vibe-check-decision.tsx
Visual:
┌────────────────────────────┐
│    How was the vibe? 🎤     │
│                            │
│   [🤝 Want to Meet]        │
│                            │
│   [👋 Not this time]       │
│                            │
│   Both must agree to       │
│   reveal profiles          │
└────────────────────────────┘
```

#### Verification Checklist
- [ ] Daily.co rooms created successfully
- [ ] Both users can join with audio only
- [ ] 3-minute timer enforced (auto-end)
- [ ] No visual data leaked during call
- [ ] Post-call decision UI is clear
- [ ] Mutual "meet" reveals profiles
- [ ] Room auto-cleaned up after call
- [ ] Works on both iOS and Android
- [ ] Handles poor connectivity gracefully


---

### Stage 8: Wingman Link (Pass-the-Phone)
**Duration: 3-4 days**
**Priority: 🟡 HIGH — Viral loop + useful matchmaking signal**

#### What We're Building
- A share link that lets **3 friends** describe you (no app required)
- A "Wingman Pack" result that compiles friend answers into:
  - a **shareable Wingman Card** (screenshot bait)
  - a **Wingman Prompt** the agent uses to find better matches
  - a curated list of **3–7 Wingman Matches**
- A dedicated tab experience that replaces the old Pulse/Explore feed
- A lightweight retention loop: **Wingman Rounds** (Round 1, Round 2, ...)
  - Each round is a fresh link → fresh friend inputs → fresh matches
  - The app nudges you when you're close (2/3) and when the pack is ready
  - After ~30 days, a refresh prompt encourages starting a new round

> **Why this is viral**: friends are part of the creation step.
> The link gets forwarded naturally, and the final Wingman Card is designed to be shared.

#### Backend Tasks

##### 8.1 Wingman Service
```
File: src/lib/services/wingman-service.ts
Purpose: Create links, accept submissions, compile packs, generate Wingman Matches

Functions:
- startNewRound(profileUserId) → { roundNumber, token, expiresAt }
- getStatus(profileUserId) → { roundNumber, target, current, expiresAt, status }
- submitResponse(token, payload) → { ok }
- buildPack(profileUserId, roundNumber) → { compiledSummary, wingmanPrompt, matches }
- getPack(profileUserId, roundNumber?) → WingmanPack
- getPackHistory(profileUserId, limit = 5) → WingmanPack[]
```

##### 8.2 Wingman API
```
File: src/app/api/wingman/link/route.ts
POST → Starts a new Wingman round and returns link (token)

File: src/app/api/wingman/status/route.ts
GET → Returns current round status { round_number, target_submissions, current_submissions, expires_at, status }

File: src/app/api/wingman/pack/route.ts
GET → Returns latest Wingman Pack + 3-7 Wingman Matches

File: src/app/api/wingman/history/route.ts
GET → Returns last 3-5 Wingman Packs (for "previous rounds")

File: src/app/api/wingman/submit/route.ts (public, token-gated)
POST → Friend submits Wingman answers (no auth required)
```

##### 8.3 Progress Notifications
Trigger push notifications at the moments that make users return:
- On each submission: "Wingman update: 2/3 friends replied"
- On completion: "✨ Your Wingman Pack is ready"

Optional (simple) reminder:
- If a link is still collecting after 24h: "One friend left to unlock your pack"

Implementation note:
- These are server-triggered after `submitResponse()` and can be sent via Expo Push.

##### 8.4 Pack Compilation (No Over-Engineering)
Keep compilation deterministic and transparent:
- Count the most common "three words" across friends
- Merge + dedupe green flags
- Pick the funniest red flag (or the first non-empty)
- Build one short Wingman Prompt string and run the existing agent search pipeline

Example prompt:
"Find someone compatible with me. My friends describe me as calm, funny, lowkey. I prefer grounded vibes, low drama, and people who can hold a real conversation."

#### Frontend Tasks

##### 8.5 Wingman Tab Screen
```
File: app/(tabs)/explore.tsx (replace with Wingman)
Purpose: The viral home screen + pack results

State A — No link yet:
┌────────────────────────────────────┐
│  Wingman 😮‍💨                      │
│                                    │
│  Let your friends describe you.    │
│  Then I’ll find matches from it.   │
│                                    │
│  [Generate Wingman Link]           │
│  "Send to 3 friends"               │
└────────────────────────────────────┘

State B — Collecting (1/3, 2/3):
┌────────────────────────────────────┐
│  Wingman Link                       │
│  Progress: 2/3                      │
│                                    │
│  [Copy Link]   [WhatsApp]           │
│                                    │
│  Friend 1 ✅                         │
│  Friend 2 ✅                         │
│  Friend 3 ⏳                         │
└────────────────────────────────────┘

State C — Pack Ready:
┌────────────────────────────────────┐
│  Your Wingman Pack is ready ✨      │
│  [Open Wingman Pack]               │
└────────────────────────────────────┘

State D — Keep it alive (weeks later):
┌────────────────────────────────────┐
│  Last updated: 19 days ago          │
│  Want fresh matches from friends?   │
│  [Start Round 2]                    │
│                                    │
│  Previous Packs:                    │
│  • Round 1 (Opened)                 │
│  • Round 0 (Archived)               │
└────────────────────────────────────┘
```

##### 8.6 Wingman Pack Screen (In-tab)
```
Purpose: Show the Wingman Card + Wingman Matches

Section 1: Wingman Card
- "They described you as: calm • funny • lowkey"
- Green flags: 2-3 lines
- Red flag (funny): 1 line
- CTA: [Share my Wingman Card]

Section 2: Wingman Matches
- 3–7 curated matches
- Each match shows: score + 2 reasons linked to friend inputs
- CTA: [Connect]

Footer:
- [Start a New Round] (generates a new link + new pack)
```

##### 8.7 Public Friend Submission Page
```
File: src/app/wingman/[token]/page.tsx (web page on backend)
Purpose: Mobile web form for friends to submit quickly

Fields (fast):
- Your name
- Describe them in 3 words
- 1-2 green flags
- 1 funny red flag
- Short hype note (optional)
```

##### 8.8 Wingman Hook
```
File: hooks/use-wingman.ts

const {
  link,
  status,
  pack,
  generateLink,
  refreshStatus,
  openPack,
  shareWingmanCard,
  connectFromPack,
  isLoading,
} = useWingman();
```

#### Verification Checklist
- [ ] User can generate a Wingman link and share via WhatsApp
- [ ] Friends can submit without the app (token-gated public form)
- [ ] Progress updates in real time (0/3 → 3/3)
- [ ] Pack only unlocks once target submissions reached
- [ ] Wingman Card compiles friend inputs correctly
- [ ] Wingman Matches are generated from the compiled prompt
- [ ] Share flow works (card is screenshot-friendly)
- [ ] User can start a new round after opening the pack (Round 2, Round 3...)
- [ ] Pack history is accessible (last 3-5 rounds)
- [ ] Push notifications fire on 1/3, 2/3, and Pack Ready
- [ ] Refresh prompt appears when last pack is stale (e.g., > 30 days)
- [ ] Reports/flagging for abusive submissions exists

---

### Stage 9: Study Date Mode
**Duration: 2-3 days**
**Priority: 🟢 MEDIUM — Low-pressure daily engagement**

#### What We're Building
- Toggle: "I'm studying at [location], open to company"
- Nearby students view (same university)
- Agent suggestions: "3 compatible people are also studying nearby"
- Auto-expire when time runs out

#### Backend Tasks

##### 9.1 Study Session API
```
File: src/app/api/study-date/route.ts
POST → Broadcast availability
GET → Get active study sessions near user
DELETE → End session
```

#### Frontend Tasks

##### 9.2 Study Mode Toggle
```
File: components/study-date/study-toggle.tsx
Purpose: Quick toggle on profile or explore screen

Visual:
┌────────────────────────────────────┐
│ 📚 Study Date Mode                 │
│                                    │
│ I'm at: [Main Library     ▾]      │
│ Until:  [6:00 PM          ▾]      │
│ Vibe:   [Chill chat OK    ▾]      │
│                                    │
│ [Go Live] ← broadcasts to campus  │
└────────────────────────────────────┘
```

##### 9.3 Nearby Students View
```
File: components/study-date/nearby-students.tsx
Visual: List of people studying nearby with mini profiles + "Join" button
```

#### Verification Checklist
- [ ] User can broadcast study availability
- [ ] Other users see nearby active sessions
- [ ] Sessions auto-expire at set time
- [ ] Agent can surface compatible study buddies
- [ ] "Join" sends a friendly connection request

---

### Stage 10: Compatibility Scoring
**Duration: 2-3 days**
**Priority: 🟢 MEDIUM — Engagement + conversation fuel**

#### What We're Building
- Deep compatibility breakdown after matching
- Category scores: lifestyle, personality, interests, schedule
- Strengths and friction points
- Visual score card

#### Backend Tasks

##### 10.1 Compatibility Calculator
```
File: src/lib/services/compatibility-service.ts
Purpose: Generate detailed compatibility breakdown between two users

Scoring categories:
- Lifestyle (party, fitness, smoking, religion alignment)
- Personality (semantic similarity of personality summaries)
- Interests (Jaccard similarity of interest arrays)
- Schedule (year of study proximity, activity patterns)
- Values (looking_for alignment, deal-breaker check)

Output:
{
  overall: 87,
  categories: {
    lifestyle: 91,
    personality: 85,
    interests: 78,
    schedule: 94,
  },
  strongest_bond: "You both value deep conversation over partying",
  potential_friction: "You're a morning person, they're a night owl"
}
```

##### 10.2 Compatibility API
```
File: src/app/api/matches/[matchId]/compatibility/route.ts
GET → Returns full compatibility breakdown for a match
```

#### Frontend Tasks

##### 10.3 Compatibility Card
```
File: components/matches/compatibility-card.tsx
Visual:
┌────────────────────────────────────┐
│ You & Alex: 87% Compatible        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Lifestyle    ██████████░  91%      │
│ Personality  █████████░░  85%      │
│ Interests    ████████░░░  78%      │
│ Schedule     ██████████░  94%      │
│                                    │
│ 🔑 Strongest: Both value deep     │
│    conversation over partying      │
│ ⚡ Friction: Morning vs night owl  │
└────────────────────────────────────┘
```

#### Verification Checklist
- [ ] Scores calculated accurately from profile data
- [ ] Category breakdowns are meaningful
- [ ] Strengths/friction points are insightful
- [ ] Visual bar chart renders correctly
- [ ] Accessible from match detail screen

---

### Stage 11: Hype Me (Friend Vouches)
**Duration: 3-4 days**
**Priority: 🟢 MEDIUM — Social proof + virality**

#### What We're Building
- Users generate invite links for friends to write vouches
- Friends (even non-users) can write 200-char hype notes
- Vouches appear on profile
- Profile owner can approve/hide vouches

#### Backend Tasks

##### 11.1 Hype API
```
File: src/app/api/hype/route.ts
POST /invite → Generate invite link (token-based)
GET /vouches/:userId → Get approved vouches for a profile

File: src/app/api/hype/write/route.ts (public, token-gated)
POST → Write a vouch via invite link (no auth needed for external writers)

File: src/app/api/hype/moderate/route.ts
PATCH → Approve/hide a vouch
```

##### 11.2 Invite Link System
- Generate unique token
- Max 5 uses per link
- Expire after 7 days
- Works via deep link or web fallback

#### Frontend Tasks

##### 11.3 Hype Request Screen
```
File: components/profile/hype-request.tsx
Visual:
┌────────────────────────────────────┐
│ Get Hyped Up! 🔥                   │
│                                    │
│ Ask friends to vouch for you.      │
│ They don't need the app.           │
│                                    │
│ Share link: [Copy] [WhatsApp]      │
│                                    │
│ Your vouches (3):                  │
│ ┌──────────────────────────────┐   │
│ │ "Funniest person I know,     │   │
│ │  terrible at cooking tho 💀" │   │
│ │              — A friend      │   │
│ └──────────────────────────────┘   │
│ [✅ Show] [❌ Hide]                │
└────────────────────────────────────┘
```

##### 11.4 Profile Vouch Display
```
File: components/profile/hype-section.tsx
Purpose: Display vouches on user's profile (visible to matches/discoveries)
```

##### 11.5 External Vouch Writer Page
```
File: src/app/hype/write/[token]/page.tsx (web page on backend)
Purpose: Simple mobile web form for non-app friends to write vouches
```

#### Verification Checklist
- [ ] Invite link generates correctly
- [ ] External friends can write vouches without downloading app
- [ ] Vouches appear on profile
- [ ] Owner can approve/hide
- [ ] Max uses enforced
- [ ] Link expiry works

---

### Stage 12: Blind Dates IRL
**Duration: 3-4 days**
**Priority: 🟢 MEDIUM — The viral feature**

#### What We're Building
- Opt-in system for matched users
- App picks campus location + time
- Both users get a code word to identify each other
- Post-date feedback collection

#### Backend Tasks

##### 12.1 Blind Date Service
```
File: src/lib/services/blind-date-service.ts
Purpose: Create and manage blind dates

Campus locations dictionary:
- Strath Cafeteria
- Main Library entrance
- Student Center lawn
- Chapel gardens

Code word generator:
- Random adjective + noun: "Purple Giraffe", "Cosmic Mango"

Time slot picker:
- Weekday afternoon (2-5 PM)
- Weekend morning (10 AM - 12 PM)
```

##### 12.2 Blind Date API
```
File: src/app/api/blind-date/route.ts
POST → Propose blind date for a match
PATCH → Accept/decline
POST /complete → Submit feedback
```

#### Frontend Tasks

##### 12.3 Blind Date Proposal
```
File: components/matches/blind-date-proposal.tsx
Visual:
┌────────────────────────────────────┐
│ 🎲 Blind Date Challenge!           │
│                                    │
│ 📍 Strath Cafeteria                │
│ 📅 Thursday, 3:00 PM              │
│ 🔑 Code word: "Cosmic Mango"      │
│                                    │
│ Look for someone who says          │
│ the code word!                     │
│                                    │
│ [I'm In! 🎉]     [Not Now]        │
└────────────────────────────────────┘
```

##### 12.4 Post-Date Feedback
```
File: components/matches/date-feedback.tsx
Visual: Simple emoji-based rating + optional text
```

#### Verification Checklist
- [ ] Both users must opt in
- [ ] Location/time/code word assigned
- [ ] Reminder notification day-of
- [ ] Code word is random and fun
- [ ] Feedback collected and stored
- [ ] Feedback improves agent's future matching

---

### Stage 13: Polish, Analytics & Launch
**Duration: 5-7 days**
**Priority: 🟡 HIGH — Ship it right**

#### What We're Building
- Analytics event tracking throughout app
- Performance optimization
- Error handling hardening
- Push notification tuning
- App Store / Play Store preparation
- Final QA pass

#### Tasks

##### 13.1 Analytics Events
```
File: src/lib/services/analytics-service.ts
Key events to track:
- agent_search (query, result_count, latency)
- agent_refine (refinement, result_count)
- agent_connect (matched_user_id, from_drop or on_demand)
- drop_opened (drop_id, time_since_delivery)
- drop_expired (drop_id, matches_connected)
- mission_accepted (mission_type)
- mission_completed (mission_type, rating)
- vibe_check_started
- vibe_check_agreed_to_meet
- study_date_created
- blind_date_confirmed
- wingman_link_created
- wingman_submission_received
- wingman_pack_opened
- wingman_pack_shared
- wingman_match_connected
- hype_written
```

##### 13.2 Performance Targets
| Metric | Target |
|---|---|
| Agent search end-to-end | < 3 seconds |
| Feed load | < 1 second |
| App cold start | < 2 seconds |
| Weekly drop generation (cron) | < 10 minutes for 10K users |
| Push notification delivery | < 5 seconds |

##### 13.3 Caching Strategy (TanStack Query)
| Data | Stale Time | Cache Time |
|---|---|---|
| Agent results | 0 (always fresh) | 5 min |
| Weekly drop | 30 sec | 10 min |
| Wingman pack | 30 sec | 10 min |
| Match compatibility | 5 min | 30 min |
| Study sessions | 15 sec | 2 min |
| Hype vouches | 5 min | 30 min |
| Profile data | 5 min | 30 min |

##### 13.4 Error Boundaries
- Agent timeout → "Took longer than expected, try again?"
- LLM failure → Fallback to structured-only search (no semantic)
- Voice API down → "Voice isn't working, type instead"
- Empty results → "No one matched exactly. Here's who came close."

##### 13.5 Launch Checklist
- [ ] All 13 stages complete
- [ ] iOS + Android tested on real devices
- [ ] Neon DB indexes optimized (EXPLAIN ANALYZE)
- [ ] Rate limiting on API routes
- [ ] Gemini API key rotated and in production env
- [ ] Daily.co production credentials set
- [ ] Push notification certificates valid
- [ ] App Store screenshots + description updated
- [ ] Privacy policy updated (AI matching disclosure)
- [ ] Onboarding flow updated for new agent experience
- [ ] Old swipe UI removed or hidden
- [ ] Existing users' profiles backfilled with embeddings
- [ ] Weekly drop cron scheduled
- [ ] Analytics dashboard live

---

## 6. Cost Projections

### At 3,000 Users (Launch)
| Item | Monthly Cost |
|---|---|
| Neon DB (Pro) | $19 |
| Vercel (Pro) | $20 |
| Gemini API (intent + embed + summaries) | ~$15 |
| Daily.co (voice calls) | $0 (free tier) |
| Expo Push | $0 (free) |
| AWS S3 (photos) | ~$5 |
| **Total** | **~$59/month** |

### At 10,000 Users
| Item | Monthly Cost |
|---|---|
| Neon DB (Pro) | $19 |
| Vercel (Pro) | $20 |
| Gemini API | ~$195 |
| Daily.co | ~$30 |
| Expo Push | $0 |
| AWS S3 | ~$15 |
| **Total** | **~$279/month** |

### At 50,000 Users
| Item | Monthly Cost |
|---|---|
| Neon DB (Scale) | $69 |
| Vercel (Pro) | $20 |
| Gemini API | ~$975 |
| Daily.co | ~$150 |
| Expo Push | $0 |
| AWS S3 | ~$60 |
| **Total** | **~$1,274/month** |

### Cost Per User
| Scale | Cost/User/Month |
|---|---|
| 3,000 users | $0.020 |
| 10,000 users | $0.028 |
| 50,000 users | $0.025 |

---

## 7. Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|---|---|
| Gemini API outage | Fallback to structured-only search (no semantic) |
| LLM returns bad JSON | Strict JSON mode + zod validation + retry once |
| pgvector slow at scale | HNSW index with tuned parameters, pre-filter with SQL |
| Daily.co free tier exhausted | Budget alert at 80%, auto-pause non-critical calls |
| Embedding drift (profiles update) | Nightly re-embedding cron for stale profiles (>7 days) |
| Neon cold starts | Connection pooling, keep-alive queries |

### Product Risks
| Risk | Mitigation |
|---|---|
| Users don't trust AI matching | Explainability layer (match reasons), transparency |
| Low engagement after novelty | Weekly drops, missions, wingman packs for social pulls |
| Matches never meet IRL | Missions have deadlines, blind dates have code words |
| Toxic/inappropriate queries | Content moderation on input, keyword filters |
| "Not enough people" at launch | Lower thresholds, broader matching, show "close matches" |
| Users game the system | Rate limit queries (10/day), detect spam patterns |

### Privacy/Legal Risks
| Risk | Mitigation |
|---|---|
| AI profiling concerns | Clear disclosure in onboarding + privacy policy |
| Data leaks via semantic data | Embeddings are not human-readable, summaries internal only |
| Voice call recording fears | No recording — Daily.co rooms configured with recording disabled |
| GDPR/data rights | User can delete all data including embeddings and agent context |

---

## 8. Success Metrics

### North Star Metric
**Real-life meetups per week** (tracked via mission completions + blind date confirmations)

### Leading Indicators
| Metric | Week 1 Target | Month 1 Target |
|---|---|---|
| Agent searches per day | 500 | 2,000 |
| Matches connected per day | 50 | 200 |
| Weekly drop open rate | 70% | 60% |
| Mission acceptance rate | 40% | 35% |
| Mission completion rate | 20% | 25% |
| Vibe check calls per day | — | 30 |
| Wingman packs opened per day | 50 | 300 |
| Study date broadcasts per day | — | 15 |
| 7-day retention | 50% | 45% |
| 30-day retention | — | 30% |

### Quality Indicators
| Metric | Target |
|---|---|
| Agent search latency (p95) | < 3 seconds |
| Match feedback "amazing" + "nice" | > 60% |
| Vibe check "meet" rate (mutual) | > 40% |
| Wingman completion rate (links that reach 3 friends) | > 35% |
| Hype vouches per active profile | > 1.5 avg |

---

## Summary

```
TOTAL DEVELOPMENT TIME:  ~12 weeks (3 months)
MVP (Stages 1-4):       ~4 weeks
LAUNCH COST:             ~$59/month at 3K users
TECH ADDITIONS:          pgvector + Gemini API + Daily.co
NEW API ROUTES:          ~15 endpoints
NEW DB TABLES:           10 tables
NEW SCREENS:             ~8 screens
NEW COMPONENTS:          ~25 components
```

**The entire system is a pipeline, not a monolith.**
Each stage is independently testable, deployable, and valuable.
Stage 1-3 alone transforms the app. Everything else amplifies it.

---

*Document created: February 2026*
*StrathSpace — The app that listens.*
