-- Seed the `payments_enabled` master switch.
--
-- Defaulting to `false` so the mobile app continues using the legacy
-- post-call → admin scheduling flow until we flip this ON per the rollout
-- plan in docs/payment.md §10.
INSERT INTO "app_feature_flags" ("key", "enabled", "description")
VALUES (
    'payments_enabled',
    false,
    'Master switch for the KES 200 Date Coordination Fee. OFF = every date bypasses the paywall. ON = both users must pay via RevenueCat before we arrange the date.'
)
ON CONFLICT ("key") DO NOTHING;
