# Discover and profile concepts

Status: Option 1 (Portrait) approved and implemented on 2026-09-29. Native visual and interaction acceptance is pending.

Generated with the built-in image generation tool. These are visual proposals, not screenshots of running code. All people, compatibility values and answer examples in the boards are fictional sample content.

## Option 1: Portrait

[Concept board](01-portrait.png). Tall photo-led Discover card, name and concise location over a readable photo scrim, separate compatibility and View profile rows. Expanded profile begins with a large photo and continues into readable biography, education and public-answer sections. Recommended for the requested immersive photo presentation.

## Option 2: Photo Journal

[Concept board](02-photo-journal.png). Shorter horizontal photo gallery with identity and summary below; more of the next profile is visible in the feed. Expanded profile uses a main photo with a thumbnail rail and clearly grouped details. Best for scanning several profiles quickly.

## Interaction specification for either option

- Discover remains a vertical list of compatible profiles. Horizontal swipes or previous/next tap controls browse the current person's photos, without liking or passing that person.
- Photo count and selected-photo indicator reflect the actual photo count. Hide navigation for a single image; provide image loading, retry and missing-photo states.
- An explicit expand control opens a full-screen photo viewer with swipe, accessible previous/next controls, pinch-to-zoom and close. Returning preserves photo index and feed position.
- A dedicated View profile row opens the full profile. Do not nest photo controls inside one large navigational pressable.
- Profile sections: identity, general location, relationship intention, bio, university/course/year when available, photos, compatibility explanation, and public answers. Hide missing optional fields rather than inventing information.
- The user's 2026-09-30 decision makes all saved answers to published questionnaire questions visible in profile details, including legacy answers marked private. Use the stored answer and optional note; never invent personality or interest claims from matching data.
- Location data currently has no separate normalized city field. The implementation limits card location text to one line and the photo header to two; the About section preserves the stored label. A future normalized-city data change can shorten it without guessing from address fragments.
- Public profile response now explicitly allows university/course/year. No unrestricted legacy profile object is exposed. Deploy the backend change for these optional details to appear; older responses still render correctly without them.
- Preserve real compatibility results and existing pass/like behavior. Do not fabricate verification, online status or distance badges.
- Keep all critical controls at least 44pt on iOS / 48dp on Android, respect safe areas and font scaling, provide accessible image descriptions and reduced motion.
- Use the existing app tokens and floating navigation; illustrations in these boards do not authorize changing the shared navigation contract. Resolve duplicate arrows in the generated View profile rows to one trailing arrow in implementation.

## Generation brief

Both prompts requested three front-on mobile screens: Discover, expanded profile top, expanded profile scrolled; dark StrathSpace colors, system typography, restrained pink Like action, fictional adult Kenyan profile, clear photo navigation and public-only detail sections. Option 1 requested tall immersive portraits and photo overlays. Option 2 requested compact landscape galleries, text below imagery and a thumbnail-led profile header. References were the user's supplied immersive dating app inspirations, interpreted within the existing project design contract.

## Implementation and validation

- Shared `ProfileGallery`: horizontal photo paging, previous/next controls on cards, selected-photo segments, photo count, loading/error/retry and missing-photo states. Photo tap opens the current gallery sheet with horizontal paging, close and downward drag dismissal; selected images synchronize with the underlying gallery. Sheet motion respects reduced motion. Pinch zoom is not implemented in the current sheet.
- `PortraitCard`: photo identity overlay, compatibility summary, intention, separate View profile control. The shared PersonCard also brings this presentation to Likes.
- Discover: compact heading/count, collapsible filter summary, existing filter editing and pagination preserved.
- Profile details: hero gallery, About/Photos/Answers shortcuts, education, compatibility explanation, all saved questionnaire answers in catalogue order, persistent header after scrolling, safe-area-aware Like/Pass footer, match messaging, report and explicit block confirmation. Report mode retains keyboard avoidance and hides the dating-action footer.
- Backend: explicit education fields in discovery/comparison/likes public profile serializers. No schema migration, scoring change, database write, or deployment performed for this redesign.
- Validation: changed mobile/backend files pass targeted ESLint; backend TypeScript passes; discovery/connections regressions pass 25/25; questionnaire UI flow tests pass 9/9. Mobile scoped TypeScript has no diagnostics in changed files; unrelated diagnostics remain in `app/dating-setup.tsx`, `components/onboarding/VibeCheckGame.tsx`, and `components/ui/text.tsx`.
- Visual verification: The user's 2026-09-30 device capture showed the profile hero and footer too tall/high, hiding the first-screen bio and tabs. The follow-up reduces only the details hero ratio, restores photo segments, removes an erroneous tab-bar reserve from the footer, and allows photo taps to open the gallery. An updated device capture is still pending. Expo web preview started locally previously, but browser automation timed out. Generated boards remain design references only.

### Native acceptance checklist

2026-09-30 mutual-match follow-up: a successful mutual Like back from Likes or another person's profile opens a photo-led match dialog with Send a message and Keep browsing. The dating shell also checks real active connections at launch, on foreground return, every 45 seconds while active, and when a questionnaire-match push arrives. Seen match IDs are stored per account on the device to prevent repeat dialogs. On the first app launch with this feature, only the newest existing match is celebrated; older matches remain in Messages. The chat header now shows the matched person's photo and name, including while its conversation record loads. This is not a server-side read receipt; a tapped push still opens its conversation directly. Focused announcement and questionnaire-flow tests pass 11/11, changed-file ESLint passes, and diff whitespace checks pass. Scoped TypeScript retains four unrelated diagnostics in dating setup, VibeCheckGame, and shared Text. Native appearance, background return, and two-account interaction checks remain pending.

2026-09-30 Likes screenshot correction: Received cards present View profile as a bordered neutral pill and Like back as a filled pink pill, each with an icon and a 56pt touch target. Their layout and fill use direct native styles because callback styles previously rendered as bare text on device. The Discover card's View profile pill received the same styling fix. Visual acceptance on the updated mobile bundle remains pending.

2026-09-30 follow-up to the second device capture: tabs and action controls were still visibly unstyled. Replaced style callbacks with direct native style arrays on the detail tabs, Like/Pass, photo controls, gallery close and card link. The installed NativeWind interop processes inline declarations as objects; callback styles do not reliably retain these properties. Press feedback on main controls now uses explicit state. Back/More circles flank a centered photo track, About/education typography is compact, tabs have equal widths and a short active underline, and the footer has a circular Pass beside a horizontal pink Like pill. Photos opens the existing gallery sheet. Targeted ESLint passes for all four changed components; scoped TypeScript retains the same four unrelated diagnostics; diff whitespace check passes. These are code checks, not native visual acceptance. Next check: reload the updated bundle on iPhone and compare controls, tab spacing, footer and photo interaction against the supplied reference.

- [ ] Two real compatible profiles show as separate vertically stacked portrait cards.
- [ ] Swipe/tap photo navigation, one-photo controls, and full-screen close preserve the selected image and list position.
- [ ] Pinch/pan, zoom buttons, reset, and Android Back work on device.
- [ ] Long names/locations, large system text, small screens, both themes and image failures remain usable.
- [ ] Profile scrolling, section jumps and sticky header/footer leave all content reachable.
- [ ] Real education values and all saved questionnaire answers appear after updated backend deployment.
- [ ] Like/pass, mutual-match messaging, reporting with keyboard, and block confirmation receive device review.

Next action: mobile review of the implemented Option 1; deploy the updated backend when releasing the education fields.

2026-09-30 chat follow-up: The dating conversation now uses the existing `ChatHeader`, `MessageBubble`, `ChatInput`, `SafetyToolkitModal`, and `BlockReportModal` instead of bare text controls. Questionnaire block/report/unmatch endpoints back the reused safety UI. A successful send replaces its optimistic bubble with the saved server message; failed sends remove the temporary bubble and retain the draft, and rapid duplicate taps are ignored. The Messages screen reuses existing conversation cards and the archived sheet. Archive and remove are per-account device inbox choices, not server deletion; a new incoming message restores a hidden thread to the inbox. The reconciliation regression test passes, changed-file ESLint passes, and scoped TypeScript has only the four pre-existing diagnostics described above. Native visual and two-account send/safety verification remain pending.

2026-09-30 archived-sheet device correction: The archived sheet uses the app's `sheet`, `control`, foreground, and muted theme colors instead of a blue-purple surface. It opens with a 300ms eased slide and closes with a 220ms eased slide; spring motion and staggered row entrances were removed. Reduced-motion settings skip the slide. Updated device review remains pending.

2026-09-30 safety-sheet device correction: Block and report now use the app's warm `sheet` surface, `control` rows, neutral borders, and themed foreground/muted text. Block effects use quiet neutral icon circles with pink symbols; report choices use a pink outline only when selected. The parent Safety Toolkit options use the same dark rows. Existing block/report behavior remains unchanged. Targeted ESLint and diff checks pass; scoped TypeScript retains four unrelated baseline diagnostics. Updated device review remains pending.
