# Implementation roadmap and release gates

## Decisions
Confirmed: Expo mobile first, all adults, preserve accounts/conversations, twenty answers then optional questions, private by default, mutual likes before chat. Only Python calculations/ranking on Railway. Legacy features are hidden, not deleted. No new paid tiers. Work on revamped without overwriting existing changes.

## Sources and interpretation
- Founder lesson: https://ed.ted.com/lessons/inside-okcupid-the-math-of-online-dating-christian-rudder
- User-supplied wikiHow excerpt: profile editing, skippable questions, browse/filter, score comparison, likes/messages. It describes multiple product eras, not a launch specification.
- https://okcupid-app.zendesk.com/hc/en-us/articles/22770910347803-Match-Questions
- https://docs.railway.com/guides/fastapi
Our thresholds, privacy defaults, catalogue and mutual-like gate are Strathspace choices. Do not claim an exact reconstruction or promise relationship success.

## Phased delivery — authoritative workflow

The user has changed delivery to **one independently tested phase at a time**. The earlier six-step sequence is superseded by the five phase documents below. Existing later-phase code is an unverified draft, not completed delivery.

Start with [the master implementation checklist](implementation-features/master.md). It is the source of truth for completion and test evidence.

1. [Foundation and scoring engine](implementation-features/phase-01-foundation-and-engine.md): prove the standalone local API and freeze contracts.
2. [Questionnaire data and APIs](implementation-features/phase-02-questionnaire-data-and-api.md): prove storage, validation and resume against an isolated database.
3. [Profile and questionnaire on the phone](implementation-features/phase-03-mobile-onboarding.md): complete and demonstrate onboarding on a phone with matching disabled.
4. [Compatible discovery on the phone](implementation-features/phase-04-discovery-and-compatibility.md): integrate staging Railway and demonstrate real scores, filters and privacy-safe comparisons.
5. [Mutual likes, messaging and controlled release](implementation-features/phase-05-connections-messaging-and-release.md): prove conversations, migration, rollback and pilot rollout.

Do not advance until the current phase's acceptance gate passes and evidence is recorded in master. Every UI phase requires a reachable phone build and a phone walkthrough before proceeding. No phase is currently accepted; seven local Python tests are the only recorded successful executable checks for the new implementation.

## Release gates
No raw answers/messages in analytics; no leaked private answers; no stale scores after edits; duplicate likes create one connection; blocked/removed pairs cannot message; no new date/payment gates; failed Railway cannot break existing conversations. Require migration rehearsal and real-device QA before production enablement. Keep flags off by default.

## Operations
Track questionnaire starts/completions, drop-off by question ID (never answer), pool size, evidence coverage, latency/errors, mutual likes and reciprocal conversations. Roll back matching or shell independently without deleting new records or applying legacy date gates to q_ connections. Existing financial/booking records remain under legacy operational support.
