# Phase 05: Profile expression, photos, and verification

Status: Not started
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

- [ ] Create focused beats for photo selection and upload, profile bio/prompt, and optional profile context; show previews and real upload progress.
- [ ] Support removal/replacement/retry using existing photo rules; retain correct order and prevent continuation while required uploads are unresolved.
- [ ] Explain verification before requesting camera permissions; preserve existing capture, processing, retry, assistance, and successful states.
- [ ] Handle permission denial, interrupted upload, slow processing, verification failure, and expired session without losing unrelated onboarding progress.
- [ ] Respect verification reset behavior when relevant photos change and use actual server status for completion.

## Acceptance

- [ ] Upload failure/retry/replacement and permissions are checked; no duplicate media or false success after interruption.
- [ ] Verification success, pending, retry, and assistance paths route correctly.
- [ ] Keyboard, photo thumbnails, screen-reader labels, and actual device camera limitations are recorded.

## Scope boundary

No face-verification provider, policy, or biometric-storage change.

## Evidence and handoff

- Changed files/commit: None.
- Checks run and results: Not run; planning only.
- Screenshots/recording and device/theme: None.
- Remaining blockers or unavailable checks: Not assessed.
- Deviations from the approved contract: None.
- Next action: Start this phase after its dependencies are Done and the user requests it.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
