# Questionnaire mobile experience

Onboarding UI update (2026-09-24): the user selected **Option 1: Rising sheet**. The [approved design contract](../onboarding-redesign/design-contract.md) supersedes the combined-screen onboarding layout described below. Own answer, partner answers, importance, visibility, and optional explanation become sequential beats. Keep existing matching/data/eligibility contracts. Track the redesign in the [onboarding master tracker](../onboarding-redesign/master.md); historical implementation status does not certify the redesign.

Delivery and verification status: [master implementation checklist](implementation-features/master.md). This document describes the design; it does not certify implementation or testing.

## Product
Adults, mobile first: profile â†’ twenty answers â†’ discover â†’ mutual like â†’ message. Existing users retain conversations while completing the questionnaire. University/course/year are optional. Preserve Strathspace system typography, restrained magenta actions, accessible light/dark tokens and native navigation.

## Navigation
Discover, Likes, Messages, Profile. Questionnaire is available from Discover and Profile. New shell has no dates, checkout, AI matchmaker, campus feed, events or opportunities. Their files and data remain legacy. New-cohort deep links cannot reopen legacy workflows. Existing operational payment processes remain intact.

## Onboarding
Authenticate using existing flows. Confirm private DOB (18+), gender, location and intentions, explicit desired genders and age range. Set city or coordinates/radius; no inferred preferences. Save profile/photos and complete existing face verification. Answer twenty questions in four groups of five with resumable progress. Each screen has own answer, multiple acceptable partner answers, importance, private/public, optional explanation, back/save/skip. Skips do not increment completion. Questions autosave only after explicit Save; retain failed drafts. Starter questions avoid sensitive topics. Explain private answers affect the aggregate score.

## Discovery
Browsable profiles, explicit filters, score/evidence counts and honest insufficient-evidence state. Detail includes photos, introduction, mutually public comparisons, like/pass/block/report. Compatibility is question-based, not a success probability. Received/sent likes are free. Mutual likes create one conversation immediately, without payment or scheduling.

## States and accessibility
Loading, empty, error/retry, offline, saved/pending and insufficient-evidence states for each resource. 48-point targets, labels and checked/selected state, text scaling, safe areas, keyboard avoidance, system back, no decorative motion. Returning users edit or delete answers; progress/cache update. Deleting below twenty pauses discovery without removing chat history.

## Legacy coexistence
Separate route group and independently gated APIs. No deletion of legacy routes. Reuse identity, upload and verification plumbing. New messaging uses existing message storage, delivery/read status and push service with q_ connection authorization. Device acceptance includes restored sessions and notification/deep-link paths.
