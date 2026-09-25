# Rising sheet: onboarding design contract

Approved direction: **Option 1**, selected by the user on 2026-09-24.
Scope: complete mobile onboarding, from entry and account creation through profile, preferences, photos, verification, compatibility answers, and discovery handoff.
Delivery status: phased implementation tracked in [master.md](master.md).

## Authority and reference

Use [DESIGN.md](../../DESIGN.md) for app-wide tokens and this document for onboarding behavior. This contract supersedes older onboarding layout instructions that show all answer fields together or hide follow-ups behind More. Preserve existing API and eligibility rules unless explicitly changed. The user's latest request takes precedence.

![Approved Rising sheet visual direction](../onboarding-concepts/01-rising-sheet.png)

The user also approved this close-up for option rows and bottom actions:

![Approved option rows and bottom action pill](../onboarding-concepts/option-rows-action-pill.png)

Use its dark tonal rows, pink selected outline and right-side indicator, and dark bottom pill with a pink heart circle and trailing chevrons. This is visual guidance: the action remains tap-to-continue, and option labels/icons still come from the actual product catalogue.

The image communicates composition, surfaces, selection feedback, and pacing. It does not define literal copy, progress counts, scoring, privacy promises, or new features. Options 2 and 3 are archived explorations, not implementation targets.

Correct these concept-image artifacts during implementation:
- Use the existing system font and real StrathSpace branding; no invented slogan or serif wordmark.
- A subtle smoky header is sufficient; no scenic mountain/moon wallpaper is required.
- Selection feedback is not a successful server save. Never say “saved” until the API confirms.
- Do not publish answers that were saved privately before the 2026-09-25 change. Their owners may make them public by editing and saving them again.
- Four illustrated screens are moments within one answer, not four completed chapters.
- The three illustrated importance choices are not permission to collapse five stored weights.

## Experience

A person using the phone one-handed between activities should always see one clear next decision. Each answer makes the next beat arrive in place, with no hunt for controls and no growing form.

Use one persistent, raised content sheet beneath a quiet branded header. Replace its content as the user proceeds. Do not open nested operating-system modals on every answer. Real native pickers, permission prompts, and camera interfaces retain their normal behavior.

Show a compact editable summary of the previous answer where helpful. Keep Back available. Do not accumulate prior fields or a long conversation transcript. Longer content may scroll inside the sheet; the action remains reachable with keyboard and safe areas respected.

When a person types, the active text field and its caret must remain visible just above the keyboard. Scroll that field into the sheet's visible area when focus or keyboard height changes; do not leave it hidden behind the keyboard or the pinned action. This applies to optional context and other onboarding text beats.

Progress describes real chapters and saved progress. Keep the thirty-two-question requirement discoverable in the introduction/progress detail; do not disguise it with a false count or repeatedly put “Question 1 of 32” in the main heading.

Once compatibility questions begin, the thirty-two required answers are mandatory and consecutive. The first twenty are followed by the twelve more detailed questions in [the expansion set](../questionnaire-expansion-research.md). Five-answer marks update progress without opening a chapter-break screen. Do not offer Skip or Take a break. Saved answers remain available after an interruption, and a returning user with an incomplete questionnaire resumes it before entering the dating tabs. Previously skipped required questions must return to the queue until thirty-two valid answers are saved.

The 32-question expansion was implemented in code on 2026-09-25. Sensitive non-disclosure choices count as answered but contribute no matching evidence. Catalogue seeding and deployment remain separate release steps; the user owns mobile validation.

Compatibility answers and optional notes saved from this flow are public by default. Tell the user this in the flow without adding a privacy-choice beat. A profile viewer can see every answer the profile owner saved as public, even if the viewer did not answer the same question. Previously private answers remain private until the owner edits and saves them again. This change does not expose private birth dates, authentication details, or unpublished drafts.

## Visual system

| Element | Contract |
| --- | --- |
| Top chrome | Progressive blur overlay (stacked blur on iOS, theme scrim gradient on all platforms). Back, brand, and progress float above the sheet; content scrolls underneath and fades out beneath the header. |
| Canvas / sheet / controls | Existing dark tokens: #0D0B0D / #151215 / #1E1A1E |
| Accent | #E0186A selection and heart badge; #FF5C97 text accent; at most one pink-filled primary control per screen |
| Text | #F7F3F5 primary; existing muted token with verified contrast |
| Typography | System font; centered onboarding heading; 26–28px display, 15–16px body; support font scaling |
| Shape | 32px top corners on the main sheet, 16px choice rows, pill actions; reuse token values |
| Spacing | 20px outer gutter, 24px sheet inset; existing spacing scale |
| Targets | At least 48 logical pixels for controls; typical choice/action height 56, growing with content |
| Selection | Selected row uses the dark sheet tone, pink outline, and right-side radio dot or check. Unselected rows use the raised control tone. Never rely on color alone; retain accessible selected state. |
| Bottom action | Floating liquid-glass pill inset above the safe area so sheet content scrolls underneath. `GlassView` when available, otherwise blurred translucent fallback using theme glass tokens. Hairline border, soft elevation, pink circular heart (or task-specific icon) at left, centered label, paired chevrons at right. Disabled state dims the control. The whole pill is a tap target, not a required swipe. |
| Decoration | One purposeful small icon/asset where useful; no extra glass beyond the progressive header and bottom action, confetti, neon, or emoji on every row |
| Themes | Dark is the approved reference. Preserve the existing light-mode contract with equivalent contrast and hierarchy |

Use theme/token imports, not per-screen hardcoded colors. Retain the selected visual rhythm across all phases. Reuse existing onboarding primitives after inspecting them; do not create a competing design system.

## Transition rules

- Typical beat transition: 180–220ms, ease-out, opacity and at most 12px vertical translation. Sheet enters from below once when entering the flow.
- Selected answer remains visible long enough to register before the next beat. No arbitrary dwell, typing simulation, or bounce.
- Single-choice: tap, show selected state/haptic, then advance exactly once. Back restores the previous selection and draft.
- Partner multi-select: hide the person's own answer row and previous-answer summary on this beat, while retaining their answer in the acceptable-answer payload. Show only the other catalogue options. A Select all row uses the same checkbox and selected styling as those options; tapping it again clears the additional choices. Continue remains available with no additional option selected.
- Text/date/range entry: use clear native controls and Continue after valid input. No automatic advance mid-typing.
- The optional note follows importance directly in the normal sequence; it can be left blank. Saving makes the answer and any note public.
- Save & continue is the explicit commit for a complete compatibility answer. Prevent duplicate submits. Failure keeps every draft field and offers Retry.
- Terms acceptance and system permissions require deliberate actions; an animated transition never implies consent.
- Respect reduced motion and screen-reader focus. Cancel pending advance when navigating back/unmounting; rapid taps must not skip steps.

## Whole journey

Exact route ownership and cohort ordering must be verified in Phase 1. These are experience chapters, not new API fields:

| Chapter | Included beats | Completion rule |
| --- | --- | --- |
| Welcome and account | Welcome, supported sign-in/sign-up, recovery/verification if present, terms/privacy consent | Existing authentication and consent rules |
| About you | Name if missing, private DOB/18+ eligibility, gender, location | Valid required data saved through existing contract |
| Your preferences | Explicit desired genders, age range, intentions, city or coordinates/radius | Never infer preferences from identity |
| Your profile | Photos, bio/prompt, optional university/course/year | Existing required profile/photo rules; optional fields stay optional |
| Build trust | Face verification, permissions, processing, success/retry/assistance | Actual server verification state |
| Your rhythm | Thirty-two consecutive required answers, with progress marked every five | Only successfully saved required answers count; no skip or in-app break |
| Ready to discover | Honest completion, optional review/edit, handoff | Existing server eligibility gates pass |

Do not force returning users through completed steps or remove their existing conversations. Do not revive obsolete campus/matchmaker/date-payment features as part of this redesign.

## Compatibility answer sequence

| Beat | Copy intent | Interaction |
| --- | --- | --- |
| Your answer | “How often would you like to hear from someone you’re dating?” | Tap one existing catalogue option; advance |
| Partner preference | “What would work for you in a partner?” / “Choose any other answers that would work, or continue.” | Multi-select other catalogue options or use a checkable Select all row; Continue |
| Importance | “How much does this matter?” | Tap a named choice; advance |
| Optional context and save | “Want to add a little context?” | Optional input, public-answer disclosure, visible Save & continue |

Existing saved answers restore their actual values. Legacy private answers remain private until their owners edit and save them. Old unfinished drafts resume at the closest current beat; the save action makes the result public and the copy says so beforehand.

### Importance mapping

The current component stores these five weights. Replace the bar with five clear tap rows; numeric weights are internal and must not appear in onboarding.

| Label | Stored weight | Helper intent |
| --- | --- | --- |
| Not a big deal | 0 | I’m flexible about this |
| A little important | 1 | A small preference |
| Somewhat important | 10 | I’d like us to be aligned |
| Very important | 50 | This matters a lot to me |
| Dealbreaker | 250 | This is essential for me |

Confirm backend behavior before writing the final helper for Dealbreaker; do not imply a hard filter if it is only a strong score weight. A future reduction to three choices requires an explicit scoring/migration decision, outside a visual refactor.

## Reliability and accessibility

Keep draft state separate from committed data. Persist drafts through the established safe storage approach; do not log sensitive answers. On restart, restore the last valid incomplete beat without presenting unsaved data as saved. Back/edit preserves partner answers, importance, and note unless a change makes them invalid; then explain what must be updated.

Handle loading, offline, expired session, invalid data, upload failure, permission denial, pending verification, failed save, and retry inside the same visual system. Route guards, deep links, and completion checks remain authoritative. No discovery unlock from animation completion alone.

Verify screen readers, large text, keyboard avoidance, small devices, Android Back, safe areas, reduced motion, and light/dark contrast. Meaningful state changes move focus or announce the next prompt without repeated announcements.

## Definition of visual acceptance

The user will test the mobile app directly. Codex should expose testable preview states and complete relevant static checks, then record device appearance, motion, accessibility, and interaction checks as user-owned pending validation. Do not claim a device check or capture happened when it did not. A phase's implementation may be marked Done after its code and static acceptance are complete; user device acceptance remains an explicit open item through Phase 08 or until the user reports results.

See [master tracker](master.md) for phased implementation and evidence.
