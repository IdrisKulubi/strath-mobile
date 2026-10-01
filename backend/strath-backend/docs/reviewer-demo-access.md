# Reviewer demo sign-in correction (2026-10-01)

## Problem and correction

The user enabled `demo_login_enabled`, but Continue as demo showed the same generic reseed error for any failure. The endpoint previously required `demo-dates-main` / `datesdemo@test.com` to have been seeded manually. It could also select an unrelated account by email alone. The old dates seed does not prepare the current 32-answer experience.

The feature-flagged endpoint now transactionally prepares the reserved reviewer account and creates a fresh 30-day bearer session. When the questionnaire shell is enabled, it prepares two clearly labelled synthetic demo profiles and all 32 published required answers. Synthetic reviewer profiles are admitted and marked with `face_verification_method=review_demo`; real-account verification/admission rules remain intact. Demo profiles are separated from real discovery and direct profile/like targets, and identifiable demo activity is excluded from questionnaire business analytics.

Provisioning is idempotent: existing answers, explanation edits, profiles and conversations are not deleted or overwritten. Missing required answers are inserted. Changed answers invalidate the demo's cache through an incremented revision. Partial failures roll back preparation and do not issue a session. Reserved identity/email collisions, admin roles and suspended/deleted accounts fail closed. Disabled demo access does not provision anything. No static token or public admin access was introduced.

The mobile handler now uses the shared API timeout/error handling, validates the response and expiry, persists all custom-session keys, and clears old stored auth only after a valid demo response. Connectivity and disabled-access errors are distinct. It no longer claims every failure requires reseeding.

## Validation and limits

- 41 backend integration tests passed across reviewer provisioning, discovery, connections and questionnaire analytics. The corrected real-account cross-cohort connection test was rerun: all 11 connection tests passed.
- Three mobile session/error tests passed.
- Backend TypeScript and focused ESLint passed. Mobile changed files have no TypeScript errors; the full mobile check retains unrelated baseline diagnostics. Focused mobile lint passed.
- No production credentials, session tokens, user data or environment contents were printed. The live endpoint/database verification was rejected by automatic approval review because it used production credentials and would create a session. No live deployment, provisioning or successful live sign-in is claimed.

## Release

Deploy the backend changes. Existing app binaries already accept the same `{ success, data: { token, user, expiresAt } }` response, so the missing-seed repair is compatible with the existing button. Mobile error/timeout/storage changes require the normal app update. With the admin demo flag enabled, the next demo POST creates/repairs only reserved synthetic reviewer records. No destructive dates-demo seeding script needs to run.

After explicit live-access approval, verify demo flag, reserved identities, endpoint status, bearer access to `/api/user/me`, current questionnaire status, demo-only discovery, and repeat sign-in. If an existing reserved reviewer identity is suspended or deleted, review that state in admin instead of automatically reviving it. Native reviewer-device validation remains pending.
