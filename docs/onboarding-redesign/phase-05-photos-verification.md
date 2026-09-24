# Phase 05: Profile expression, photos, and verification

Status: Done
Dependencies: 01, 02, 04
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Bring photos, bio/prompts, and verification into the same guided experience.

Deliverable: A consistent profile/media/trust chapter with resilient feedback.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

components/onboarding/PhotoMoment.tsx; profile-prompt-step.tsx; app/dating-setup.tsx; app/verification.tsx; components/verification/; hooks/use-image-upload.ts; hooks/use-face-verification.ts.

## Checklist

- [x] Create focused beats for photo selection and upload, profile bio/prompt, and optional profile context; show previews and real upload progress.
- [x] Support removal/replacement/retry using existing photo rules; retain correct order and prevent continuation while required uploads are unresolved.
- [x] Explain verification before requesting camera permissions; preserve existing capture, processing, retry, assistance, and successful states.
- [x] Handle permission denial, interrupted upload, slow processing, verification failure, and expired session without losing unrelated onboarding progress.
- [x] Respect verification reset behavior when relevant photos change and use actual server status for completion.

## Acceptance

- [x] Upload failure/retry/replacement and permissions are checked by code path; no duplicate media or false success after interruption. Device confirmation remains with the user.
- [x] Verification success, pending, retry, and assistance paths retain status-based routing and existing assistance components; no success toast for pending processing.
- [x] Keyboard, photo thumbnails, screen-reader labels, and actual device camera limitations are recorded below.

## Scope boundary

No face-verification provider, policy, or biometric-storage change.

## Evidence and handoff

- Changed files/commit: `app/dating-setup.tsx`, `app/onboarding/index.tsx`, `app/verification.tsx`, `components/onboarding/PhotoMoment.tsx`, `profile-prompt-step.tsx`, `LaunchCelebration.tsx`, `components/verification/verification-form.tsx`, `verification-shell.tsx`, `hooks/use-image-upload.ts`; no commit created.
- Checks run and results: Targeted ESLint passed; TypeScript emitted no diagnostics in changed files (repository has unrelated baseline diagnostics); `git diff --check` passed. Code-path review covered upload interruption/retry, verification status, permission denial, and explicit save.
- Screenshots/recording and device/theme: None; the user owns mobile device review. Light/dark, keyboard, font scaling, screen reader, upload interruption, and native camera permission flows still need user testing.
- Remaining blockers or unavailable checks: Native camera/permissions and visual layout cannot be confirmed statically. Reopen this phase if user mobile testing finds a defect.
- Deviations from the approved contract: None.
- Next action: Phase 06 is eligible when requested. Do not start it automatically.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
