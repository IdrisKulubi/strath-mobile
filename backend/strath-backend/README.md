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
