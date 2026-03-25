# Face Verification Pre-Implementation Plan

## Goal

Add a scalable, robust face verification system that reduces catfishing, fake profiles, and basic bot abuse before users enter matchmaking.

This plan is intentionally focused on what we must decide, prepare, and align on before implementation starts.

## Current Codebase Reality

- Mobile onboarding already collects profile photos in `app/onboarding/index.tsx`.
- The app uploads images through `hooks/use-image-upload.ts`.
- The backend already supports presigned image upload through `src/app/api/upload/presigned/route.ts`.
- User onboarding completion is currently controlled by `profileCompleted`.
- Matchmaking and discovery already depend on completed profiles in places like `src/lib/matching.ts`, `src/app/api/discover/route.ts`, and `src/app/app/layout.tsx`.
- Current image storage is optimized for app media, not for private biometric verification workflows.

## Recommended Product Decision

Use a phased verification strategy:

1. Phase 1 production scope:
   Compare a guided selfie against 2-4 uploaded profile photos with Amazon Rekognition `CompareFaces`.
2. Phase 2 hardening:
   Add image quality checks, manual review, rate limits, and abuse monitoring.
3. Phase 3 escalation:
   Add Amazon Rekognition Face Liveness only if spoofing becomes a measurable problem.

This avoids overbuilding early while still leaving room for a stronger anti-spoof layer later.

## Recommended Architecture

### Core approach

- Keep all face verification decisions on the backend.
- Do not call Rekognition directly from the mobile app.
- Do not treat public profile photo URLs as trusted verification assets.
- Use a dedicated private verification asset flow separated from public profile media.
- Keep Cloudflare R2 as the storage layer for profile and verification assets, and send image bytes from the backend to Rekognition.

### Storage recommendation

- Keep normal profile photos in the current app media storage flow if needed.
- Add a dedicated private Cloudflare R2 bucket, or a private verification-only prefix in the existing bucket, for biometric verification assets.
- Store guided selfie frames and verification copies of candidate profile photos in private R2 storage.
- Set aggressive lifecycle deletion for temporary verification assets.

### Processing recommendation

- Mobile app starts a verification session.
- Backend creates a verification record and short-lived upload targets.
- User uploads guided selfie frames and identifies which profile photos are eligible for verification.
- Backend enqueues a verification job.
- A worker processes the job, runs image checks, calls Rekognition, applies decision rules, stores results, and updates user verification status.
- App polls or refreshes session status and continues only when the backend returns a final state.

### Why this is the safest scalable option

- It keeps biometric logic off the client.
- It avoids long-running Rekognition work inside user-facing request cycles.
- It makes retries, auditing, and manual review easier.
- It gives us a clean path to later add liveness, re-verification, and admin tooling.

## Key Decisions To Lock Before Coding

### 1. Verification gate policy

Decide exactly where verified status is required:

- Before entering the main app
- Before appearing in discovery
- Before sending likes or date requests
- Before being included in candidate-pair generation

Recommended:

- Let onboarding profile creation finish.
- Block entry into matchmaking and discovery until verification passes.
- Keep unverified users in a verification checkpoint screen.

### 2. Verification decision policy

Lock the first version of the rules:

- Require at least 2 matching profile photos.
- Start with an automatic pass threshold around 88-90.
- Send edge cases to `retry_required` or `manual_review`, not straight to permanent failure.
- Reject photos with no face, multiple faces, severe blur, or major obstruction.

### 3. Storage policy

Decide retention windows up front:

- Temporary selfie frames: delete quickly, for example within 24 hours.
- Verification copies of profile photos: delete after a short audit window unless required for review.
- Persist only metadata needed for operations, trust, and support.

### 4. Manual review policy

Define who can review and what they can see:

- Which internal roles can access verification results
- Whether reviewers can see raw images
- How long review assets remain accessible
- How overrides are logged

### 5. Re-verification policy

Decide when a verified user must verify again:

- Major profile photo changes
- Suspicious report volume
- Device/account risk changes
- Long dormancy followed by reactivation

## Proposed Domain Model

Do not overload `profileCompleted` for biometric trust.

Add explicit verification data, ideally in separate tables plus a small summary on `profiles`.

### Suggested profile-level fields

- `faceVerificationStatus`: `not_started | pending_capture | processing | verified | retry_required | manual_review | failed | blocked`
- `faceVerifiedAt`
- `faceVerificationMethod`: `rekognition_comparefaces_v1`
- `faceVerificationVersion`
- `faceVerificationRequired`
- `faceVerificationRetryCount`

### Suggested session table

Create a dedicated `face_verification_sessions` table with:

- `id`
- `userId`
- `status`
- `attemptNumber`
- `selfieAssetKeys`
- `profileAssetKeys`
- `thresholdConfigVersion`
- `decisionSummary`
- `failureReasons`
- `startedAt`
- `completedAt`
- `expiresAt`

### Suggested result table

Create a `face_verification_results` or event table for auditability:

- `sessionId`
- `sourceAssetKey`
- `targetAssetKey`
- `similarity`
- `faceConfidence`
- `qualityFlags`
- `facesDetected`
- `decision`
- `rawProviderResponseRedacted`

This keeps analytics and support history clean without making the profile row too heavy.

## API Surface To Design First

Define the contract before any UI work starts.

### Suggested endpoints

- `POST /api/verification/face/session`
  Creates a session and returns upload instructions.
- `POST /api/verification/face/upload-targets`
  Returns signed upload targets for selfie frames and any server-approved assets.
- `POST /api/verification/face/submit`
  Marks capture complete and queues processing.
- `GET /api/verification/face/session/:id`
  Returns the current verification state for polling.
- `POST /api/verification/face/retry`
  Starts another attempt if retry budget allows.
- `POST /api/admin/verification/:sessionId/review`
  Manual review action for admins only.

### API design rules

- All endpoints must be idempotent where possible.
- Every session must belong to one user and one attempt number.
- Never trust client-supplied verification decisions.
- The client should only send asset references approved by the backend.

## Mobile App Planning Work

Before implementation, agree on the UX flow:

1. User uploads profile photos as usual.
2. User is routed to a new face verification checkpoint.
3. The UI guides the user through a short selfie capture flow.
4. The app shows `processing`, `retry`, or `verified`.
5. The app only unlocks tabs or matchmaking after verification passes.

### UX decisions to finalize

- Whether verification is mandatory on day one
- Whether users can save onboarding progress before verifying
- Whether guided selfie capture uses one frame or multiple prompts
- What retry messaging says
- How accessibility and low-light fallback is handled
- What happens on low bandwidth or upload failure

## Backend And Infra Planning Work

### New service boundary

Do not bury all verification logic inside the existing profile update route.

Plan a dedicated verification service module:

- `src/lib/services/face-verification-service.ts`
- `src/lib/services/face-verification-policy.ts`
- `src/lib/services/face-verification-storage.ts`
- `src/lib/services/face-verification-audit.ts`

### Worker strategy

Choose one of these before coding:

- Preferred: queue + worker model using SQS and a worker process
- Acceptable MVP: background job pattern using existing infrastructure if durability is guaranteed

Recommendation:

- Use SQS for verification jobs because this workflow is asynchronous, retry-sensitive, and operationally important.
- Use the current Next.js API only to create sessions and queue jobs.

### Secrets and configuration

Prepare these environment variables:

- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`
- `CLOUDFLARE_R2_PUBLIC_URL`
- `AWS_REKOGNITION_REGION`
- `FACE_VERIFICATION_R2_PREFIX`
- threshold and retry settings

### Security hardening

- Encrypt verification assets at rest.
- Use private bucket policies only.
- Enforce strict MIME/type validation and max file size.
- Strip or ignore client EXIF metadata where possible.
- Add rate limits per user, device, and IP.
- Add abuse flags for repeated failures and suspicious retries.

## Matching And Access Control Impact

Before implementation, map every place that currently trusts `profileCompleted`.

### Required gate updates

- Mobile app route access after onboarding
- Web app route access in `src/app/app/layout.tsx`
- Discovery in `src/app/api/discover/route.ts`
- Matching queries in `src/lib/matching.ts`
- Candidate-pair generation services
- Any feed or visibility logic that should exclude unverified users

### Recommended rule

Move from:

- `profileCompleted === true`

To:

- `profileCompleted === true`
- `faceVerificationStatus === verified`
- `discoveryPaused === false`

This should be introduced through shared helper functions so the rule stays consistent across APIs.

## Privacy, Legal, And Trust Work

This is mandatory before implementation, not after.

### Update user-facing documents

- Terms of service
- Privacy policy
- In-app consent copy
- Support/review process copy

### Explicitly define

- Why face data is being used
- What is stored and for how long
- Whether raw biometric images are retained
- Who can review flagged cases
- How users appeal or retry

## Observability And Operations Plan

Treat this as a trust-and-safety system, not just a feature.

### Metrics to define before coding

- verification started
- verification submitted
- verification passed
- verification retry_required
- verification failed
- verification manual_review
- average processing time
- retry count per user
- false positive and false negative support cases

### Logging rules

- Log session IDs, decision outcomes, and reason codes
- Do not log raw face images or sensitive payloads
- Redact provider responses before long-term storage

### Alerts

- Rekognition failure spike
- queue backlog spike
- upload failure spike
- pass-rate anomaly
- manual-review backlog growth

## Testing Plan To Prepare First

Build the test strategy before implementation begins.

### Test datasets

Prepare internal non-production test cases for:

- same-person high quality photos
- same-person poor lighting
- different-person attack
- multiple-faces photo
- no-face photo
- blurry photo
- repeated retry abuse

### Test layers

- unit tests for decision policy
- integration tests for session lifecycle
- contract tests for upload and polling APIs
- staging tests with real Rekognition calls
- operational tests for retries and queue failure recovery

## Rollout Plan

### Phase 0: design and readiness

- Finalize policies, schema, APIs, storage, and UX
- Update privacy and legal copy
- Create admin/review requirements
- Prepare observability and incident runbooks

### Phase 1: internal implementation

- Build session model and backend APIs
- Build worker and Rekognition integration
- Add mobile verification checkpoint
- Gate discovery and matchmaking

### Phase 2: internal testing

- Team-only testing
- threshold tuning
- edge-case analysis
- retry flow validation

### Phase 3: limited release

- Enable for a small percentage of new users
- monitor pass rate, retry rate, support load, and latency
- adjust thresholds and UX copy

### Phase 4: default-on rollout

- make verification mandatory for new matchmaking access
- add admin review tooling
- define re-verification triggers

### Phase 5: anti-spoof escalation if needed

- add Face Liveness only if attack patterns justify the extra cost and complexity

## Concrete Repo Changes That Will Eventually Be Needed

Not for implementation yet, but these are the main touchpoints:

- `app/onboarding/index.tsx`
- `hooks/use-image-upload.ts`
- new mobile verification UI components and routes
- `src/db/schema.ts`
- `src/lib/validation.ts`
- new `src/app/api/verification/*` routes
- new verification service modules
- `src/app/api/discover/route.ts`
- `src/lib/matching.ts`
- `src/lib/services/candidate-pairs-service.ts`
- `src/app/app/layout.tsx`
- onboarding and privacy copy on both mobile and web

## Definition Of Ready

Do not start implementation until these are true:

1. Verification status model is approved.
2. Storage design for biometric assets is approved.
3. Session and result schema are approved.
4. API contract is agreed.
5. Matchmaking gate rules are agreed.
6. Privacy and retention policy are written.
7. Manual review and support policy are defined.
8. Metrics, logs, and alert requirements are defined.
9. Rollout and rollback plans are documented.
10. Threshold tuning approach is agreed.

## Recommended First Implementation Slice Once Ready

When this plan is approved, the safest first build slice is:

1. Add schema and status fields.
2. Create verification session APIs.
3. Add private R2 verification asset upload flow.
4. Add async worker with CompareFaces.
5. Add onboarding checkpoint UI.
6. Gate discovery and candidate generation on verified status.
7. Add metrics and admin visibility.

This gives StrathSpace a clean trust gate without entangling face verification inside the existing profile-save flow.
