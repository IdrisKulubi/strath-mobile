# StrathSpace 2.0 Backend

This is the backend for the StrathSpace 2.0 mobile app, built with Next.js App Router, Neon Postgres, Drizzle ORM, and BetterAuth.

## Features

- **Authentication**: Email/Password auth via BetterAuth.
- **Database**: Postgres on Neon with Drizzle ORM.
- **Real-time**: Pusher integration for messaging and matching notifications.
- **Matching**: Smart matching algorithm based on university, interests, and activity.
- **Messaging**: Real-time chat system.
- **Admin**: Basic admin endpoints for user management and reports.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env` and fill in your credentials:
    - `DATABASE_URL`: Your Neon Postgres connection string.
    - `BETTER_AUTH_SECRET`: A random string.
    - `BETTER_AUTH_URL`: Your backend URL (e.g., http://localhost:3000).
    - `PUSHER_*`: Your Pusher credentials.

3.  **Database Setup**:
    Push the schema to your database:
    ```bash
    npx drizzle-kit push
    ```
    
    (Optional) Seed the database with dummy data:
    ```bash
    npx tsx src/scripts/seed.ts
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## API Endpoints

### Auth
- `POST /api/auth/sign-up-email`
- `POST /api/auth/sign-in-email`
- `POST /api/auth/sign-out`

### User
- `GET /api/user/me`: Get current user profile.
- `PATCH /api/user/me`: Update profile.
- `POST /api/user/upload-image`: Upload profile photos.
- `GET /api/user/:id`: Get public profile.

### Discover & Match
- `GET /api/discover`: Get user recommendations.
- `POST /api/swipe`: Swipe left (pass) or right (like).
- `GET /api/matches`: Get all matches.

### Messaging
- `GET /api/messages/:matchId`: Get chat history.
- `POST /api/messages/:matchId`: Send a message.

### Admin
- `GET /api/admin/users`: List all users.
- `GET /api/admin/reports`: List all reports.

## Project Structure

- `src/app/api`: API route handlers.
- `src/db`: Drizzle schema and config.
- `src/lib`: Utility functions (auth, db, matching, pusher, validation).
- `src/scripts`: Database scripts (seed).

## Face Verification Operations

Face verification is configured to run in async-first mode in production.

- User submit requests queue work through `POST /api/verification/face/submit`.
- The queue worker runs through `GET /api/worker/face-verification`.
- Vercel cron is configured in [vercel.json](C:\Users\Idris Kulubi\Desktop\sidequests\active\smobile\strath-mobile\backend\strath-backend\vercel.json) to call the worker directly every minute.
- `GET /api/cron/face-verification` remains available as a compatibility and recovery trigger, but it now simply drains queued jobs.
- Profile photo uploads are pre-audited into verification-ready metadata so repeated verification attempts can reuse face/readiness information.

Required environment variables:

- `CRON_SECRET`: shared secret for cron-triggered routes.
- `FACE_VERIFICATION_PROCESSING_MODE=async`: keeps submit lightweight and lets cron own processing.
- `FACE_VERIFICATION_CRON_BATCH_SIZE=20`: launch-ready compatibility batch size for the cron recovery route.
- `FACE_VERIFICATION_WORKER_BATCH_SIZE=20`: recommended launch claim size per worker run.
- `FACE_VERIFICATION_WORKER_CONCURRENCY=4`: recommended launch parallel jobs per worker.
- `FACE_VERIFICATION_COMPARISON_CONCURRENCY=2`: controls parallel profile-photo comparisons inside one session.
- `FACE_VERIFICATION_MAX_PROFILE_COMPARISONS=3`: limits how many profile photos we compare per attempt.
- `FACE_VERIFICATION_JOB_LEASE_SECONDS=120`: recommended lease window for launch traffic.
- `FACE_VERIFICATION_JOB_MAX_ATTEMPTS=5`: max retries before a job is marked failed.
- `FACE_VERIFICATION_JOB_RETRY_DELAY_SECONDS=15`: recommended base backoff between retries.
- `FACE_VERIFICATION_PHOTO_AUDIT_VERSION=profile_photo_audit_v1`: version tag for precomputed photo metadata.

For local debugging only, you can temporarily set `FACE_VERIFICATION_PROCESSING_MODE=inline` to process a submission immediately inside the request.

Admin/ops visibility:

- `GET /api/admin/verification/overview`
- Returns queue depth, worker throughput, queue wait times, photo-audit readiness metrics, ops alerts, status breakdowns, attention-required sessions, and recent processed sessions.
- Requires an admin session or admin bearer token.
