# Onboarding redesign: master tracker

Approved design: **Option 1: Rising sheet**.
Last updated: **2026-09-25**.
Current stage: **Catalogue seed user-confirmed (100 → 109); binary partner-choice correction implemented; user mobile retest pending.**
Implementation phases Done: **5 / 8**.
Active phase: **06: In review; 07: In progress from the requested continuation fix**.
Next eligible task: **Complete remaining Phase 07 checks and user mobile review; verify updated backend/mobile deployment**.

This is a manually maintained tracker updated by Codex during each phase task, not a background monitor or scheduled automation.

## Start here

- [Project instructions](../../AGENTS.md)
- [Approved design and interaction contract](design-contract.md)
- [Selected visual reference](../onboarding-concepts/01-rising-sheet.png)
- [App-wide design tokens and rules](../../DESIGN.md)

Scope is the whole mobile onboarding journey: welcome/account/consent, about you, partner preferences, profile/photos, verification, compatibility answers, and discovery handoff. Implementation uses one phase per task unless the user explicitly requests otherwise.

## Phase status

| Phase | Scope | Depends on | Status | Evidence / remaining work |
| --- | --- | --- | --- | --- |
| [01: Journey inventory and behavior map](phase-01-journey-audit.md) | Map every active onboarding path and existing data contract before changing UI. | None | Done | [Route/data map and acceptance matrix](journey-map.md); static code trace, direct TypeScript check and 3/3 flow tests; native captures unavailable |
| [02: Rising sheet foundation and motion](phase-02-sheet-foundation.md) | Build the shared visual and interaction primitives before migrating whole flows. | 01 | Done | Opt-in Rising sheet, choice/progress/action/feedback primitives, guarded beat controller, development preview; targeted lint and file-scoped TypeScript clean; user mobile review pending |
| [03: Welcome, account, and consent](phase-03-welcome-auth.md) | Apply the approved experience to entry, supported auth, and legal consent. | 01, 02 | Done | Corrective sign-in changes accepted by user on mobile; static checks passed; broader device matrix remains Phase 08 |
| [04: About you and partner preferences](phase-04-profile-preferences.md) | Replace dense setup forms with guided personal-detail and preference beats. | 01, 02, 03 | Done | Both setup paths use guided Phase 04 beats; explicit preferences, adult/age/radius validation, location fallback, scoped draft restore; static checks passed; user mobile review pending |
| [05: Profile expression, photos, and verification](phase-05-photos-verification.md) | Bring photos, bio/prompts, and verification into the same guided experience. | 01, 02, 04 | Done | Profile beats, upload progress/retry/replace, explicit save, verification preface and status-truthful routing; static checks passed; user mobile review pending |
| [06: Compatibility answers as guided beats](phase-06-compatibility-beats.md) | Replace the current questionnaire layout with the approved sequential Rising sheet interaction. | 01, 02, 05 | In review | Four beats, mandatory 32-answer flow, public new/edited answers, neutral sensitive responses, and independent partner choices including Yes/No/Unsure; user mobile retest pending |
| [07: Resume, milestones, review, and discovery handoff](phase-07-resume-review-handoff.md) | Make the redesigned chapters behave as one resumable journey. | 03, 04, 05, 06 | In progress | User-requested continuous questionnaire and in-progress dating-tab redirect implemented; remaining cross-route resume/review/handoff checks pending |
| [08: Accessibility, regression checks, and staged rollout](phase-08-qa-rollout.md) | Verify the whole implementation, close defects, and prepare controlled release. | 01–07 | Not started | Checklist pending; no implementation evidence |

## Status rules

- **Not started**: no implementation for this phase.
- **In progress**: work started; checklist and evidence show completed and outstanding items.
- **In review**: implementation exists but required validation or acceptance is outstanding.
- **Blocked**: a specific dependency prevents progress; name the dependency, impact, and unblock action.
- **Done**: implementation checklist and static acceptance passed, available evidence recorded, and master/phase documents agree. User-owned mobile validation is tracked separately and can reopen a phase.

Do not infer Done from existing components, earlier questionnaire work, generated mockups, or a passing compile alone. Reopen a Done phase if later changes invalidate its acceptance. Track partial progress through checklist items rather than invented percentages.

## Completed preparation

- [x] User selected Option 1.
- [x] Selected concept saved in the repository.
- [x] Persistent project instructions created.
- [x] Written visual/interaction contract created.
- [x] Eight phase plans with dependencies and acceptance criteria created.
- [x] Master tracker created.
- [x] Full static journey/cohort audit verified (Phase 01); live cohort and device routing checks remain in Phase 07/08.
- [x] Production UI implementation begun (shared opt-in primitives; no route migration yet).
- [ ] End-to-end device validation completed.
- [ ] Release executed and verified.

Documentation completion is separate from implementation completion.

## Known findings and open work

| Finding | Treatment | Owner |
| --- | --- | --- |
| Existing older onboarding and newer dating-setup/questionnaire entry paths coexist | Trace actual cohort routing; do not assume all users follow both | 01 |
| Existing importance weights are 0, 1, 10, 50, 250; image shows three rows | Five named tap choices now retain exact values; device review remains | User, 08 |
| More previously contained profile visibility and optional explanation | Privacy choice was removed by user decision; optional context remains a normal Rising beat | 06 |
| Previously saved private answers | Keep private until their owners edit and save again; do not run a mass publication migration | 06 |
| Image contains invented privacy/save copy | Written contract and verified server behavior win | All |
| Existing staged/uncommitted changes already touch design and questionnaire code | Preserve them; inspect diffs before each implementation task | All |
| Native device, screen-reader, camera, and motion evidence not yet collected | User will test the mobile app; keep pending checks visible and never claim unrun checks passed | User, 08 |
| Auth uses Google/Apple and a flagged demo route; register aliases login | Keep supported provider flow and link terms/privacy in Phase 03 | 03 |
| Auth entry and consent are now Rising sheet screens; account creation still precedes explicit onboarding consent as in the original flow | Validate product/legal sequence on device and retain existing policy until a separate decision | User, 08 |
| Shell-enabled users may be redirected from legacy onboarding/waitlist because the global gate's allowlist omits those paths | Verify on device before sending traffic to the new journey | 07, 08 |
| Questionnaire flags stage the questionnaire cohort, not the new visual design for legacy onboarding | Phase 02 preview stays isolated; decide a reversible UI rollout before route migration | 02, 03, 08 |
| Legacy details and questionnaire setup use user-scoped drafts; Phase 06 question drafts now also retain beat and explicit choice state | Verify route-level resume and handoff on device without treating drafts as saved | 07 |
| Phase 05 stores uploaded photo URLs and prompt drafts in the legacy user-scoped draft; setup draft already stored photo URLs | Verify full route restoration on device in Phase 07 | 07 |
| Questionnaire setup now presents bio, photos, optional education, and save as separate beats | Two-write API save order preserved; verify layout and camera on device | User, 08 |
| Native baseline captures unavailable; whole-repo lint has 175 existing errors and 52 warnings | User owns device review; isolate new lint issues from baseline | User, 08 |

These findings are tracked for later phases and user-owned device testing.

## How each task updates this tracker

1. Read project instructions, design contract, this tracker, and the target phase.
2. Confirm dependency statuses; inspect current code and uncommitted changes.
3. Mark that phase In progress; complete only its scoped work.
4. Tick only delivered checklist items; add changed paths, check results, device/capture links, and deviations in the phase document.
5. Set Done only if acceptance is satisfied; otherwise use In progress, In review, or Blocked and explain what remains.
6. Update this table, phase count, active phase, next task, open issues, and session log.
7. Report completed work and the next phase. Do not automatically begin it.

Routine choices within an authorized phase do not require renewed permission. The phase boundary keeps separate tasks manageable; an explicit request for multiple phases overrides that default.

## Session log

| Date | Scope | Result | Validation | Next action |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Design selection and planning | Option 1 recorded; guidance, contract, and eight phase documents prepared | Local links validated in 14 documents; all 8 phase statuses match Not started; git diff --check passed; no app tests or UI implementation claimed | User can request Phase 01 |
| 2026-09-24 | Phase 01 journey audit | All active route families, data contracts, flags, saves, and next-phase owners mapped in `journey-map.md` | Questionnaire typecheck passed; flow tests 3/3; repository lint baseline 175 errors/52 warnings; native captures unavailable | Phase 02 Rising sheet foundation |
| 2026-09-24 | Phase 02 Rising sheet foundation | Shared opt-in presentation and interactive development preview implemented; production routes remain on standard presentation | Targeted lint passed; no TypeScript diagnostics in changed Phase 02 files; full check retains 77 unrelated diagnostics; user owns device review | Phase 03 when requested; reopen Phase 02 for user-reported issues |
| 2026-09-24 | Phase 03 welcome, account, and consent | First-launch intro, auth provider entry, post-auth welcome, and explicit consent moved to Rising sheet; existing auth services and redirects retained | Targeted lint passed; zero Phase 03 TypeScript diagnostics (71 unrelated repository diagnostics); diff check passed; mobile checks user-owned | Phase 04 when requested; reopen Phase 03 for user-reported issues |
| 2026-09-24 | Phase 03 user screenshot correction | Fixed empty header circles, provider button layout, excess spacing, and detached legal links; consolidated auth errors inline | User screenshot documented the failure; targeted lint, changed-file TypeScript, and diff checks passed after the correction; no retest claimed | User mobile retest; keep Phase 03 In review until confirmed |
| 2026-09-24 | Phase 03 Apple sign-in follow-up | User screenshot showed an unimplemented native Apple button view; replaced it with a standard control that gates the existing Apple handler on native availability | Targeted lint, changed-file TypeScript, and diff checks passed; no device sign-in claim | User mobile retest; Phase 03 remains In review |
| 2026-09-24 | Phase 03 acceptance and Phase 04 start | User confirmed sign-in is done and authorized progression | User-confirmed mobile sign-in path; Phase 03 Done | Implement Phase 04 |
| 2026-09-24 | Phase 04 about you and preferences | Guided beats added to both setup paths; scoped SecureStore drafts, adult and range validation, and city fallback preserve existing payloads | Targeted lint passed; zero Phase 04 TypeScript diagnostics (71 unrelated); 5/5 focused tests; diff check passed; device review user-owned | Phase 05 when requested; reopen Phase 04 for user-reported issues |
| 2026-09-24 | Phase 05 profile expression, photos, and verification | Split setup profile into four beats; migrated legacy photos/prompt and save to Rising; added upload progress, retry, replace, scoped resume; added verification explanation and status-truthful completion | Targeted lint passed; no changed-file TypeScript diagnostics; diff check passed; native checks user-owned | Phase 06 when requested; reopen Phase 05 for user-reported mobile issues |
| 2026-09-24 | Phase 06 compatibility answers | Replaced stacked answer form with five Rising beats, exact tap weights, explicit visibility/context, reversible partner select-all, guarded save/skip/delete, and beat-aware drafts | 8/8 flow tests and targeted lint passed; no Phase 06 TypeScript diagnostics; three unrelated scoped baseline errors remain; device review user-owned | Phase 07 when requested; reopen Phase 06 for user-reported mobile issues |
| 2026-09-24 | Phase 06 keyboard follow-up | User screenshot showed optional context hidden by the iOS keyboard; shared Rising sheet now scrolls the focused field above the keyboard and pinned action; design guidance updated | Targeted lint passed; no changed-file TypeScript diagnostics; mobile retest user-owned | User retests typing on device; Phase 07 remains next |
| 2026-09-24 | Rising control reference adopted | User approved dark option rows and the dark heart-and-chevron bottom pill; shared Rising choice/button components and persistent guidance updated; reference image saved in the repository | Targeted lint passed; no changed-file TypeScript diagnostics; device appearance review user-owned | Use these controls throughout remaining onboarding; Phase 07 remains next |
| 2026-09-24 | Phase 06 screenshot correction | User screenshot showed loose option labels, a detached heart/chevrons, and a clipped previous-answer card. Rising rows and action now use direct native styles; the action has its own explicit row layout; each beat resets scroll position by remounting its scroll view | Targeted ESLint and diff check passed; no changed-file TypeScript diagnostics, while whole-project TypeScript retains unrelated errors; device result is pending | User retests Phase 06 appearance on mobile; proceed to Phase 07 after acceptance |
| 2026-09-24 | Mandatory questionnaire continuation | User removed chapter breaks, skipping, and taking a break. Question saves now advance directly; earlier skips return to the queue; incomplete accounts with saved answers return to questions from dating tabs | 7/7 focused flow tests and targeted ESLint passed; no changed-file TypeScript diagnostics, while scoped TypeScript retains three unrelated errors; diff check passed; mobile retest pending | User checks the 5/20 transition and completion on device |
| 2026-09-25 | Public compatibility answers | Removed privacy-choice beat; new/edited answers save as public; profile comparison shows all of a person's public answers; existing private answers remain private until edited | 7/7 mobile flow, 8/8 answer API, and 11/11 discovery/comparison tests passed; targeted mobile and backend ESLint passed; scoped mobile TypeScript retains three unrelated errors; user-owned device retest pending | User checks four-beat flow and profile answers on device |
| 2026-09-25 | Partner-choice clarity | Removed own answer row and summary on partner beat; replaced Anyone works for me with a Select all checkbox row matching other options; payload still includes own answer, including restored older data | 7/7 focused flow tests and targeted ESLint passed; scoped TypeScript retains three unrelated errors; diff check passed; user-owned mobile retest pending | User checks the partner-choice screen on device |
| 2026-09-25 | Questionnaire expansion research | Researched long-term compatibility topics and drafted a [12-question expansion](../questionnaire-expansion-research.md) covering children, marriage, faith, politics, alcohol, nicotine, relationship structure, money, family, and household roles; live 20-answer gate remains unchanged | Compared existing 100-question catalogue and current matching/onboarding contracts with primary relationship studies; proposal and source links recorded | Review question wording and sensitive-response behavior, then implement the 32-question journey as a separate build task |
| 2026-09-25 | Enable 32 required answers | Added nine immutable catalogue versions and reused three existing questions; required exact 32 IDs for completion/discovery; existing 20-answer users resume at question 21; neutral disclosures are excluded from scoring; mobile copy and progress updated | Mobile flow 8/8, backend questionnaire 9/9, discovery 13/13, connections 10/10; targeted lint and backend TypeScript passed; mobile scoped TypeScript retains three unrelated baseline errors; database seed and user device test pending | Seed catalogue to 109 published questions before deployment, then user checks the 20→21 transition and completion on device |
| 2026-09-25 | Binary partner-choice screenshot fix | Yes/No partner beats now display both options with the own answer checked and fixed; redundant Select all is removed when there is only one additional option. User also confirmed the catalogue seed went from 100 to 109 published questions. | 9/9 focused flow tests, targeted lint, and diff check passed; user owns native retest | User checks the children question's No → partner-choice beat on device |
| 2026-09-25 | Independent partner preferences | The user clarified that their own No about children must not preselect or fix No for a partner. Every substantive partner option, including Yes, No, and Unsure, is selectable; new answers start unchecked and require at least one selection. Old unfinished drafts return to the partner beat for an explicit choice. | 9/9 focused flow tests, targeted lint, and diff check passed; scoped TypeScript has the same three unrelated baseline errors; device retest is user-owned | User checks the children question's No → partner-choice beat on device |

Append one row per implementation task, including partial work and remaining checks.

## Release status

Not scheduled or executed. Phase 08 prepares and verifies the release procedure. Record environment, version/commit, release time, smoke checks, and rollback reference here only after an actual authorized release.

## Example follow-up requests

- “Implement Phase 1 of the onboarding redesign and update the tracker.”
- “Continue with the next onboarding phase.”
- “Show what is done and what remains in the onboarding redesign.”
- “Fix the issue in Phase 6 and update its verification evidence.”
