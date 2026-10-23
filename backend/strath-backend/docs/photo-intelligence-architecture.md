# Photo Intelligence Architecture

## Service boundaries

| Responsibility | Owner |
| --- | --- |
| Auth, profile APIs, recommendations, ranking, admin | Next.js backend (`strath-backend`) |
| Photo quality, moderation flags, tips, DB writes | `photo-intelligence-service.ts` (TypeScript) |
| Visual preference centroids from likes/passes | `visual-preference-service.ts` (TypeScript) |
| Profile interaction event logging | `profile-interaction-service.ts` (TypeScript) |
| CLIP embeddings and batch image re-analysis | Python worker on Railway (`services/photo-intelligence-worker`) |

The mobile app never calls the Python service directly. The Next backend enqueues or invokes it with a shared secret.

## Data flow

1. User uploads photos → R2 → `syncProfilePhotoAssetsForUser` → `reanalyzeUserPhotos`.
2. TypeScript analyzes each photo (Sharp + Rekognition faces/moderation) → `profile_photo_analysis`.
3. Optional: backend calls Python `/embed` → `profile_photo_embeddings`.
4. Likes/passes → `profile_interaction_events` → visual preference update.
5. Daily recommendations read cached `user_match_signals.photo_quality_score` and bounded photo preference scores.

## Ethical constraints

- No attractiveness or beauty scores.
- Photo signals capped below 20% of final recommendation weight.
- Embeddings used only for personalization and diversity, not public display.

## Environment

- `PHOTO_INTELLIGENCE_SERVICE_URL` — Railway Python base URL
- `PHOTO_INTELLIGENCE_SERVICE_SECRET` — shared bearer token for internal calls
