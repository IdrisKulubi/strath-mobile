# Profile redesign

Date: 2026-09-29. Scope: the active `/dating/profile` screen shown in the user's reference, and its profile editor. Status: implemented; native acceptance pending.

## Design decision

The user requested an easy-to-read profile with obvious editing and navigation after finishing the onboarding redesign. Preserve the shared dark/light tokens, system type, pink primary action, and existing floating tab bar. Onboarding's rising-sheet sequence is not used for returning-user editing.

The profile tab now leads with the person's photo, name, age (never their birth date), campus/city, and actual verification status. Photos, bio, and labelled details are readable directly, with Edit links opening the relevant editor section. Dating preferences, compatibility answers, and account safety have separate labelled rows. Questionnaire progress is secondary to the person's identity.

The editor has Photos / About / Details sections, one explicit save action, and a return to the saved profile. Photos support upload, replacement, upload retry, removal, and choosing the main photo. Removal keeps at least one photo. Draft edits survive section changes and failed saves; navigation prompts before discarding edits. App termination does not persist this editor's unsaved draft.

## Research applied

- [Hinge: editing and viewing a profile](https://help.hinge.co/hc/en-us/articles/360011053094-How-do-I-edit-my-profile), accessed 2026-09-29: a clear edit entry, grouped personal details, and a separate view experience. Applied as a readable owner overview and sectioned editor. This is not labelled as an exact public-profile preview.
- [Bumble: uploading profile photos](https://support.bumble.com/hc/en-us/articles/28523708029341-Uploading-profile-photos-and-videos), accessed 2026-09-29: visible photo management and deliberate removal. Applied using the app's existing upload service and six-photo API limit. Main-photo selection is explicit; no automated photo ranking was introduced.

## Data and navigation

- Read and save through `/api/v2/questionnaire/profile`, preserving its name, gender, bio, photos, university, course, and year contract. No legacy `/api/user/me` writes.
- Existing `/discovery-filters` owns preferences, age range, city, intentions, and radius. Existing `/questions?review=1`, `/verification`, and `/settings` own their respective flows.
- `/dating-profile-edit` is allowlisted in the questionnaire route gate and included in its TypeScript check.
- New/edited compatibility answers remain public; old private answers are not republished. No answer mutation occurs in the profile editor.
- Photo changes retain the server's verification reset and explain the next action. Server discovery eligibility remains authoritative.
- New `Field` options disable native text entry during save/upload and apply the API's text-length limits; existing callers retain their current behavior.

## Evidence

- [x] Changed-file ESLint passed.
- [x] Questionnaire flow regressions: 9/9 passed.
- [x] Scoped TypeScript includes the editor and reports no errors in the changed profile files. It remains blocked by pre-existing errors in `app/dating-setup.tsx`, `components/onboarding/VibeCheckGame.tsx`, and `components/ui/text.tsx` (four diagnostics).
- [x] Diff whitespace check passed.
- [x] Static review covers route allowlist, API payload, optional-field clearing, minimum photo count, save locking, upload retry, draft retention on background query failure, and server verification reset.
- [ ] Native screenshots and visual acceptance in dark/light mode.
- [ ] On-device editing, image picker/upload, save/reload, failed-save retry, discard dialog, and verification return.
- [ ] Small-screen / large-text / VoiceOver / TalkBack / keyboard / Android Back checks. Photo actions use a single column above 1.3 font scale; controls have at least 48-point targets.

No native device session or authenticated visual capture was available during implementation. Static checks do not establish visual acceptance. Next action: review the Profile tab and each editor section on device; address any findings within this scope.

## Profile row alignment fix

The 2026-09-29 native screenshot showed the icon, label, description, and chevron stacked vertically in the Make it yours and Your account rows. The shared row now has a full-width press target and a separate horizontal content container, with a fixed icon slot, flexible text, and a trailing chevron. Long descriptions may wrap inside the text column. Changed-file ESLint and diff checks pass; the scoped TypeScript check still reports only the four existing diagnostics listed above. Native recheck of these rows remains pending.
