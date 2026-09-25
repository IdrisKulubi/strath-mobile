# Phase 03: Welcome, account, and consent

Status: Done (user confirmed sign-in on mobile)
Dependencies: 01, 02
Updated: 2026-09-24

Read [design contract](design-contract.md) and [master tracker](master.md) before starting. This phase is a bounded implementation task; do not proceed to the next phase automatically.

## Outcome

Apply the approved experience to entry, supported auth, and legal consent.

Deliverable: Consistent welcome/account/consent experience connected to existing auth.

## Code entry points

Paths are relative to the app repository. Confirm current callers before editing:

app/_layout.tsx; components/intro/launch-experience.tsx and first-launch/returning intro components; app/(auth)/login.tsx; app/(auth)/register.tsx; app/index.tsx; components/onboarding/WelcomeSplash.tsx; TermsAcceptance.tsx; auth-related routes identified in Phase 1.

## Checklist

- [x] Move first-launch introduction, auth entry, and post-auth profile welcome onto the shared Rising sheet. Keep Google, Apple, and the feature-flagged demo provider; `/register` continues to alias the provider entry.
- [x] Keep account entry to one provider decision. This app has no email/password form, password recovery, or OTP route to migrate.
- [x] Keep consent as a separate explicit three-checkbox action with readable Terms and Privacy links. A provider tap or intro advance does not mark these accepted.
- [x] Show inline auth/link errors and provider cancellation, retain loading states, and prevent repeated auth submissions.
- [x] Leave existing session bootstrap, profile-based redirects, onboarding route ownership, and cohort flags intact.

## Acceptance

- [x] Static route trace confirms `/login` and `/register` share provider entry, success still routes through `routeAfterAuth`, and the onboarding welcome/consent sequence remains explicit. Failure/cancellation and legal-link handlers are present. User mobile checks remain pending.
- [x] Auth handlers use a synchronous in-flight guard; no typed account fields exist in the supported provider flow.
- [x] Changed code supports theme tokens, safe areas, readable links and accessibility labels. Visual, keyboard, and screen-reader checks are user-owned pending mobile validation.

## Scope boundary

No authentication-provider replacement or consent-policy changes.

## Evidence and handoff

- Changed files/commit: `components/auth/rising-auth-entry.tsx`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `components/intro/first-launch-intro-slides.tsx`, `components/onboarding/WelcomeSplash.tsx`, `components/onboarding/TermsAcceptance.tsx`, `app/onboarding/index.tsx`, and two shared shell options. No commit created.
- Checks run and results: Targeted ESLint passed; full TypeScript check has 71 existing diagnostics and zero in Phase 03 files after correcting one new diagnostic; `git diff --check` passed.
- Screenshots/recording and device/theme: The user supplied a dark-mode sign-in screenshot on 2026-09-24. It showed empty outlined header circles, an unstyled Google action, excessive empty space, and legal text stranded at the bottom. No new device capture is claimed after the correction.
- Corrective change: Header spacers no longer draw circles; the Google/demo actions now use fixed visual containers and explicit horizontal rows; legal links sit directly under provider choices; auth failures use inline feedback without duplicate danger toasts. Targeted lint, changed-file TypeScript, and diff checks passed after the fix.
- Apple sign-in follow-up: The next user screenshot showed `Unimplemented component: <ViewManagerAdapter_ExpoAppleAuthentication>` where the native Apple button was placed. The app now renders a regular Apple sign-in control on iOS, checks `AppleAuthentication.isAvailableAsync()` when tapped, and calls the existing native Apple handler only when available. An unavailable runtime gets inline guidance instead of an unimplemented native view. Android behavior is unchanged. Targeted lint, changed-file TypeScript, and diff checks passed; a new device result is not yet available.
- Logo mark: The sign-in heading now shows `assets/images/logos/LOGO.png` in place of the pink heart badge. A new device capture is not yet available.
- Mobile acceptance: The user confirmed the sign-in is done on 2026-09-24 and authorized progression. This confirms the reported entry-screen issue is resolved for their tested path; legal links, alternate themes, screen-reader behavior, and other provider outcomes remain broader Phase 08 checks rather than claimed results here.
- Deviations from the approved contract: No email/password, recovery, or OTP UI was added because the supported app flow does not expose those routes. No new consent policy or server write was introduced.
- Next action: Phase 04, explicitly authorized by the user's request to progress.

When working, replace these placeholders with actual evidence. Synchronize this phase's status and the master row in the same task. A written plan or generated concept image is not implementation evidence.
