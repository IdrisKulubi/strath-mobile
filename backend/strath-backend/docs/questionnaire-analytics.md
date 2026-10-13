# Questionnaire and matching analytics

Implemented 2026-10-01. Admin route: `/admin/metrics/questionnaire`. Available from the Metrics page and Insights sidebar. This is a separate admin feature, not a continuation of an onboarding redesign phase.

## Access and freshness

The admin layout and the server action both call `requireAdmin`. The page is dynamic, with explicit refresh and 7/30/90-day/all-time filters. No public metrics endpoint or auth bypass was introduced. Database failures display an error, not invented zero values. Missing questionnaire tables display a migration-readiness state.

## What the numbers mean

- The questionnaire funnel selects users whose `q_state.started_at` falls within the period. This timestamp is the first recorded preference/questionnaire action, not a screen view. Deleted accounts are excluded. Current answers to published `REQUIRED_QUESTION_IDS` determine progress; optional/replacement answers do not count.
- Started answering means at least one current required answer. Completed means all 32 current required answers, irrespective of historical `completed_at`. This avoids treating an older 20-answer completion as complete after the expansion.
- Inactive means incomplete with at least one saved required answer and no saved required-answer update for seven days. Zero-answer users are separate. Early/middle/late groups use the next missing question (1–10/11–20/21–32). Gaps are handled explicitly; this is not simply answer count plus one. Inactive does not mean permanently abandoned, and unsaved drafts or individual beat views are not observed.
- Funnel bars use the same setup cohort denominator. Completion percentage uses people with at least one current required answer. Empty denominators display an em dash, not a fabricated 0% conversion.
- Daily trends use Nairobi calendar days. Completion is the first retained event reaching the current 32-answer requirement, including progress events (older completion markers may remain set after expansion). Repeated saves do not count as repeated completions. All time shows a 90-day chart.
- Match counts use retained questionnaire-origin pairs with `connected_at` in the period. Pending first-like rows and imported legacy pairs are excluded. Ended matches still count as previously created. Messaging conversion counts these same pairs with a recorded message, including messages after the selected period. Message totals exclude imported legacy pairs. Like/pass/unmatch/block action counts are questionnaire endpoint events; some actions may concern imported connections. Active matches are an all-time current snapshot.
- Discovery requests, empty results, failures, viewers and p95 latency come from existing discovery events. These cover recorded outcomes, not every precondition rejection or route failure. Existing `candidate_count` is the full eligible result pool, not the displayed page or actual profile impressions.
- Current score cache metrics are an all-time snapshot restricted to this algorithm version and matching answer revisions. Unique cached profiles and unique cached pairs are different from lifetime ranking operations. Average compatibility score is descriptive, not proof of algorithm quality.

## New ranking telemetry

`questionnaire_ranking` events are written to the existing `analytics_events` table. No new database migration or release flag is required. Deployment starts collection; no historical total is invented.

Each nonempty scoring operation records the algorithm version, source (`discovery` or `comparison`), candidates considered, cache hits, successful engine scores/batches, failure status and duration. Counts include repeated operations. Scored-or-reused totals are cache hits plus successful engine scores; candidates considered can be higher when work fails. Engine batches count successful validated application batches, not internal HTTP retries.

Only aggregate counters are stored with the existing user reference; no answer values, notes, birth dates, candidate IDs or location fields are copied into telemetry. Writes are best effort and cannot fail discovery. Database failures before score evaluation or requests with no candidate pool are not ranking operations. Operational series and first-available telemetry time are explicitly labelled.

## Validation

- 22 integration tests passed: discovery regressions plus analytics SQL against isolated PGlite schemas. Covers current completion vs old completion, optional answers, missing-question gaps, inactive midpoint, deleted accounts, cohort filters, completion deduplication, legacy/pending exclusion, stale caches, engine/cache accounting, missing schema and telemetry-write failure isolation.
- Full backend TypeScript check and focused ESLint passed.
- Actual dashboard component rendered with synthetic data and inspected at desktop and 390px viewport widths; no page-level horizontal overflow. This is layout evidence, not production data validation. Screenshot: `outputs/questionnaire-analytics/dashboard-preview.png` (local artifact). The standalone layout preview does not hydrate the Recharts chart; authenticated live chart interaction remains a release check.
- No production database reads/writes, deployment, scoring-rule changes, onboarding changes or consent changes in this task.

## Release check

Deploy the backend update, open the protected admin page, verify schema readiness/feature flags, and exercise discovery once. Confirm new ranking telemetry appears and compare dashboard counts to the retained records. Verify the live chart and date filters in the authenticated admin runtime. Questionnaire answers and historical connections are already available from existing tables; ranking operation counters start after deployment.
