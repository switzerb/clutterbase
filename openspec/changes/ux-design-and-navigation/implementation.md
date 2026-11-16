# Implementation

Approved and published to GitHub. D1–D4 are implemented and verified. D5–D13 remain not started. The remaining work is being delivered on sequential, unpushed ticket branches for review.

All thirteen issues belong to **UX Design and Navigation**, GitHub milestone 1:
https://github.com/switzerb/clutterbase/milestone/1

Each checkbox maps to exactly one published issue below. D1–D13 remain stable local identifiers; their headings link to the corresponding GitHub issues. Dependency links use the real issue numbers. Shared behavior is defined in `specs/`; approach and scope boundaries are in `design.md`.

Aim for one focused commit per ticket, including its tests and relevant documentation. The final verification ticket can deliver an acceptance-record commit without artificial code changes.

The original drafts were split without changing scope: old D2 becomes D2/D3; old D4 becomes D5/D6; old D5 becomes D7/D8; old D6 becomes D9/D10/D11. Old D1, D3, D7, and D8 remain intact as D1, D4, D12, and D13.

## 1. Branding and shared controls

- [x] 1.1 D1 — Establish branding and adaptive themes; verify documented tokens, contrast measurements, both system appearances, and baseline typography.
- [x] 1.2 D2 — Create shared interactive controls; verify keyboard/component tests, validation associations, and documented control examples.
- [x] 1.3 D3 — Create shared status and feedback components; verify accessible state examples, reduced motion, and persistent-feedback tests.

### D1 — [#3](https://github.com/switzerb/clutterbase/issues/3)

```markdown
# Establish Clutterbase branding and adaptive themes

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** None

## Summary

Give Clutterbase a minimalist, friendly identity that stays readable on a small laptop. Establish the shared visual rules future screens will use.

## Acceptance Criteria

- Light mode has a white canvas, dark readable text, and warm muted accents. Dark mode follows the same visual identity.
- Appearance follows the system, including changes while the app is open. No manual toggle is added.
- Tailwind semantic tokens cover canvas, surfaces, text, borders, accent, focus, and status colors using CSS light-dark().
- Typography is clean sans-serif, with body text at least 18px at default settings. Primary-button sizing supports a minimum 48px height.
- A simple Clutterbase wordmark and favicon replace starter branding.
- Text meets WCAG AA contrast thresholds and essential non-text controls meet 3:1 in both themes. Measured pairs are documented.
- Archive images keep their original colors.
- Token, typography, spacing, and branding usage are documented with light/dark visual examples and verification evidence.

## Assumptions / Decisions / Constraints

- Warm gray and muted evergreen are initial palette candidates; exact values are subject to visual review.
- Start with a friendly system sans-serif stack. Inter is a candidate, not an approved font requirement.
- Do not add a new component suite or manual theme preference.
- This issue belongs to GitHub milestone UX Design and Navigation.
```

### D2 — [#4](https://github.com/switzerb/clutterbase/issues/4)

```markdown
# Create accessible shared buttons and fields

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#3](https://github.com/switzerb/clutterbase/issues/3)

## Summary

Provide a small consistent set of interactive controls so browsing and contribution screens remain obvious, readable, and keyboard accessible.

## Acceptance Criteria

- Shared styles cover the buttons, links, labeled inputs, simple selects, and any dialog used by the milestone.
- Primary buttons are at least 48px high. Important actions have visible plain-language labels.
- Default, hover, focus, disabled, and error states remain distinguishable in both themes without relying on color alone.
- Controls expose accessible names, visible keyboard focus, and associated validation messages.
- Any dialog supports Escape, focus containment, and return to its trigger.
- Nonessential motion respects reduced-motion preferences.
- Component tests cover the interactions provided. Usage and control-state examples are documented alongside the controls.

## Assumptions / Decisions / Constraints

- Use the existing Tailwind and Reka UI stack; native elements are appropriate where sufficient.
- Build only what the milestone screens need, not an exhaustive design system.
- After #3, this can proceed in parallel with #6.
```

### D3 — [#5](https://github.com/switzerb/clutterbase/issues/5)

```markdown
# Create shared status and feedback components

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#3](https://github.com/switzerb/clutterbase/issues/3), [#4](https://github.com/switzerb/clutterbase/issues/4)

## Summary

Give relatives consistent explanations of what is happening and what they can do next, without relying on color or disappearing notifications.

## Acceptance Criteria

- Reusable presentation covers status labels and loading, empty, error, and persistent demo-save feedback.
- Status uses meaningful text rather than color alone and remains readable in both themes.
- Feedback exposes appropriate accessible semantics without excessive announcements.
- Panels support explanatory text and an available next action using shared controls.
- Nonessential loading animation respects reduced-motion preferences.
- Component tests cover state content, accessible semantics, and next actions. Reproducible examples and usage are documented.

## Assumptions / Decisions / Constraints

- This supplies shared presentation; collection-specific and edit-specific states are integrated in their own tickets.
- No notifications service or exhaustive component catalog is included.
- This can proceed in parallel with #6 after #4 completes.
```

## 2. Navigation foundations

- [x] 2.1 D4 — Build the shared shell and route foundations; verify navigation, direct route loading, not-found views, document titles, and keyboard route transitions.

### D4 — [#6](https://github.com/switzerb/clutterbase/issues/6)

```markdown
# Build responsive navigation and route foundations

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#3](https://github.com/switzerb/clutterbase/issues/3)

## Summary

Make the archive the obvious starting point and give every destination a predictable place in a compact small-laptop layout.

## Acceptance Criteria

- Opening the root shows an Archive content region, not a dashboard or welcome banner.
- The shared header presents Archive, Inbox, Family, and a prominent Upload files action with a clear active destination.
- Each destination and item route has a directly navigable URL. Initial destination content may be labeled placeholders until later tickets land.
- Unknown routes and unknown item identifiers show a useful not-found state with a link to Archive.
- A skip link, main landmark, descriptive document titles, and route-focus behavior support keyboard and assistive-technology use.
- Navigation remains reachable at 1366x768, 200% zoom, and a 320px CSS viewport without page-level horizontal scrolling.
- Router tests cover root navigation, active links, missing routes, and route titles/focus where testable. Browser checks cover direct URL reloads.
- Route/view organization and the browser check procedure are documented.

## Assumptions / Decisions / Constraints

- Use the existing Vue Router and Pinia installations; no authentication or access-control behavior is included.
- After #3, this can proceed in parallel with #4 using native labeled navigation links.
- Final integrated control styling is checked after #4.
```

## 3. Archive browsing

- [ ] 3.1 D5 — Build the mock archive grid, cards, and fixtures; verify preview fallbacks, collection-state examples, card tests, and responsive layout.
- [ ] 3.2 D6 — Add mock search, filtering, and sorting with URL criteria; verify result counts, no-results recovery, ordering, and URL restoration tests.

### D5 — [#7](https://github.com/switzerb/clutterbase/issues/7)

```markdown
# Build archive cards with synthetic fixtures

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#4](https://github.com/switzerb/clutterbase/issues/4), [#5](https://github.com/switzerb/clutterbase/issues/5), [#6](https://github.com/switzerb/clutterbase/issues/6)

## Summary

Invite curiosity through a photo-album-style collection. Give letters and photos useful human hooks without making incomplete cataloging look broken.

## Acceptance Criteria

- Archive displays a responsive grid with preview, title, and available people, approximate date, and short description.
- Synthetic fixtures cover photos, multipage letters, rich and sparse details, long filenames, uncertain dates, and missing/processing/failed previews.
- Missing titles fall back to filenames. Missing optional details are omitted rather than repeated as Unknown labels.
- Each PDF is one card with an uncropped proportional first-page preview, PDF label, and page count when available.
- Loading, empty archive, and recoverable-error states can be reproduced through a documented demo mechanism.
- Cards open their dedicated item URLs. A missing preview never disables navigation.
- Fixtures have stable IDs and upload timestamps for later discovery controls.
- Tests cover card content, fallbacks, and collection-state transitions. Both-theme responsive examples and fixture usage are documented.

## Assumptions / Decisions / Constraints

- Use public-safe synthetic content and prepared preview assets; no real family documents or thumbnail generation.
- Until #9 lands, item links may use the item-route placeholder from #6.
- This can proceed in parallel with #11, #12, and #13 after its dependencies are complete.
```

### D6 — [#8](https://github.com/switzerb/clutterbase/issues/8)

```markdown
# Add archive search filtering and sorting

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#7](https://github.com/switzerb/clutterbase/issues/7)

## Summary

Help relatives explore the mock collection using familiar discovery controls while keeping the archive material visually central.

## Acceptance Criteria

- Labeled search matches displayed mock text.
- Photo/PDF filtering and newest/oldest sorting work over the synthetic collection using fixture upload timestamps.
- Result count and a clear-all action reflect the active search and selections.
- Search, filter, and sort criteria are reflected in the collection URL and restored when that URL is opened.
- No-results feedback explains the situation and offers a working clear-criteria action.
- Tests cover combined criteria, result counts, ordering, clearing, and URL restoration.
- Discovery behavior and reproducible no-results examples are documented.

## Assumptions / Decisions / Constraints

- These are prototype controls, not the finalized production search contract.
- #14 handles scroll and return-to-results behavior across item visits.
- This can proceed in parallel with #9 and the illustrative destination tickets.
```

## 4. Item presentation

- [ ] 4.1 D7 — Build dedicated viewing-first item pages and breadcrumbs; verify responsive previews, sparse details, AI labels, and missing-item tests.
- [ ] 4.2 D8 — Add mock item-detail editing; verify save/cancel behavior, validation, demo-only feedback, and tests.

### D7 — [#9](https://github.com/switzerb/clutterbase/issues/9)

```markdown
# Create dedicated item pages and breadcrumbs

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#7](https://github.com/switzerb/clutterbase/issues/7)

## Summary

Let relatives open and enjoy material on a dedicated page, with a familiar breadcrumb and a layout that prioritizes viewing rather than forms.

## Acceptance Criteria

- Photo and letter routes show a viewing-first page with full display title, file information, preview, and available details.
- A breadcrumb identifies Archive and the current item. Archive is a working return link.
- Preview and details sit alongside one another only when readable, and stack on smaller layouts.
- Missing title uses the filename; missing preview shows a labeled fallback; incomplete details remain visually intentional.
- A mock AI suggestion is clearly labeled and separate from established metadata.
- Tests cover rendering, missing items/previews, AI labels, and breadcrumb destination. Viewing examples and preview limitations are documented.

## Assumptions / Decisions / Constraints

- PDF display uses a prepared preview, not a live PDF renderer, zoom engine, or thumbnail service.
- #10 adds the working Edit details action; no dead edit control is required in this intermediate commit.
- #14 adds browsing-context restoration to the basic Archive return link.
- This can proceed in parallel with #8 and the illustrative destination tickets.
```

### D8 — [#10](https://github.com/switzerb/clutterbase/issues/10)

```markdown
# Add illustrative editing for item details

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#9](https://github.com/switzerb/clutterbase/issues/9)

## Summary

Show how contributors can enrich a letter or photo while keeping the default item page focused on viewing.

## Acceptance Criteria

- A labeled Edit details action opens an illustrative editing section with existing mock values.
- Title, people, approximate date text, and description can be edited without defining a production data model.
- Save applies valid demo changes in memory and displays persistent feedback explaining that they reset on reload.
- Cancel discards unapplied edits and returns to viewing without changing the item.
- Empty optional details remain valid; an absent title uses the filename display fallback.
- Field errors, when applicable, are associated with the affected fields and do not lose entered text.
- Tests cover opening, saving, canceling, fallbacks, applicable validation, and demo feedback.
- Editing examples and persistence limits are documented.

## Assumptions / Decisions / Constraints

- No real persistence, person-management workflow, or AI acceptance behavior is included.
- Mock AI guesses do not silently become established metadata through editing.
- This can proceed in parallel with #14 once #9 and #14's other dependencies are complete.
```

## 5. Illustrative feature destinations

- [ ] 5.1 D9 — Illustrate Inbox with mock review lists; verify statuses, demo boundaries, keyboard operation, and screen tests.
- [ ] 5.2 D10 — Illustrate Family with mock profiles; verify person cards, associated material, responsive layout, and screen tests.
- [ ] 5.3 D11 — Illustrate Upload and per-file outcomes; verify demo boundaries, accessible controls, screen tests, and no file transfers.

### D9 — [#11](https://github.com/switzerb/clutterbase/issues/11)

```markdown
# Illustrate Inbox with mock review lists

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#4](https://github.com/switzerb/clutterbase/issues/4), [#5](https://github.com/switzerb/clutterbase/issues/5), [#6](https://github.com/switzerb/clutterbase/issues/6)

## Summary

Show how relatives will find material needing attention without implementing the review workflow.

## Acceptance Criteria

- Inbox illustrates Needs review and Reviewed material using recognizable mock titles and statuses.
- Needs review is the initial list, with a labeled way to view Reviewed examples.
- The screen clearly identifies its mock content. No control claims to complete or reopen a real review.
- The layout uses shared components, both themes, large labeled controls, and responsive stacking.
- Tests cover list selection, visible statuses, accessible labels, and demo explanations. Fixture examples and nonfunctional boundaries are documented.

## Assumptions / Decisions / Constraints

- Fixtures are synthetic and safe for the unauthenticated prototype.
- No guided queue, review persistence, or review history is included.
- This can proceed in parallel with #7, #12, and #13 after its dependencies are complete.
```

### D10 — [#12](https://github.com/switzerb/clutterbase/issues/12)

```markdown
# Illustrate Family with mock person profiles

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#4](https://github.com/switzerb/clutterbase/issues/4), [#5](https://github.com/switzerb/clutterbase/issues/5), [#6](https://github.com/switzerb/clutterbase/issues/6)

## Summary

Show a welcoming person-centered destination that fits the shared navigation without implementing genealogy features.

## Acceptance Criteria

- Family displays synthetic person cards and a simple selected-person summary.
- The summary includes biographical text and associated mock material.
- Selection and presentation work with keyboard operation, both themes, and responsive stacking.
- The screen identifies its content as a demo and does not imply connected person records.
- Tests cover card selection, summary content, accessible labels, and demo explanations.
- Fixture examples and nonfunctional boundaries are documented.

## Assumptions / Decisions / Constraints

- No relationship graph, genealogy editor, or real profile persistence is included.
- Use synthetic public-safe profiles and material references; this does not depend on archive-card implementation.
- This can proceed in parallel with #7, #11, and #13 after its dependencies are complete.
```

### D11 — [#13](https://github.com/switzerb/clutterbase/issues/13)

```markdown
# Illustrate Upload with per-file status examples

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#4](https://github.com/switzerb/clutterbase/issues/4), [#5](https://github.com/switzerb/clutterbase/issues/5), [#6](https://github.com/switzerb/clutterbase/issues/6)

## Summary

Show where uploading will happen and how independent file outcomes will look without building file transfer infrastructure.

## Acceptance Criteria

- Upload files opens an illustrative file-selection area with independent per-file status examples.
- Controls are clearly labeled, keyboard usable, and readable in both themes and narrow layouts.
- The screen explicitly explains that uploads are not connected and does not claim to save any file.
- Local selection, if enabled for the illustration, never transmits the file to a server.
- Tests cover visible outcomes, accessible labels, demo explanations, and any local selection behavior.
- Browser network inspection confirms no file transfer. The demo procedure and disconnected boundaries are documented.

## Assumptions / Decisions / Constraints

- Status examples use synthetic filenames, not the user's private documents.
- No storage, thumbnail generation, retry infrastructure, or archive-record creation is included.
- This can proceed in parallel with #7, #11, and #12 after its dependencies are complete.
```

## 6. Return-to-browsing behavior

- [ ] 6.1 D12 — Preserve collection context across item visits; verify browser Back and breadcrumbs restore criteria, order, scroll, and usable focus, with direct-visit defaults.

### D12 — [#14](https://github.com/switzerb/clutterbase/issues/14)

```markdown
# Preserve browsing context across item navigation

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** [#8](https://github.com/switzerb/clutterbase/issues/8), [#9](https://github.com/switzerb/clutterbase/issues/9)

## Summary

Keep relatives from losing their place when they open a photo or letter and return to exploring.

## Acceptance Criteria

- Search, filter, sort order, and scroll position are restored after opening an item and using browser Back.
- The Archive breadcrumb restores that same collection context.
- Restoration waits for stable results and previews so the viewport does not jump to the wrong place.
- Keyboard focus remains usable without unexpectedly scrolling away from the restored position.
- A direct item visit without prior collection context returns to the default Archive.
- Browser Forward and repeated item visits do not apply stale context to an unrelated collection URL.
- Automated tests cover stored-context and URL decisions. Browser evidence covers actual Back, Forward, breadcrumb, scroll, and focus behavior.
- Restoration scope and a reproducible navigation test sequence are documented.

## Assumptions / Decisions / Constraints

- Restoration is within the current browsing session; cross-session persistence is not required.
- This can proceed in parallel with #10 and the illustrative destination tickets once #8 and #9 are complete.
```

## 7. Cross-screen acceptance

- [ ] 7.1 D13 — Verify integrated milestone usability and quality gates; deliver browser evidence for both themes and supported layouts, plus passing check, test, type-check, build, and preview smoke checks.

### D13 — [#15](https://github.com/switzerb/clutterbase/issues/15)

```markdown
# Verify milestone usability across supported layouts

**Status:** Not Started
**Type:** Task
**Priority:** Medium
**Dependencies:** [#3](https://github.com/switzerb/clutterbase/issues/3), [#4](https://github.com/switzerb/clutterbase/issues/4), [#5](https://github.com/switzerb/clutterbase/issues/5), [#6](https://github.com/switzerb/clutterbase/issues/6), [#7](https://github.com/switzerb/clutterbase/issues/7), [#8](https://github.com/switzerb/clutterbase/issues/8), [#9](https://github.com/switzerb/clutterbase/issues/9), [#10](https://github.com/switzerb/clutterbase/issues/10), [#11](https://github.com/switzerb/clutterbase/issues/11), [#12](https://github.com/switzerb/clutterbase/issues/12), [#13](https://github.com/switzerb/clutterbase/issues/13), [#14](https://github.com/switzerb/clutterbase/issues/14)

## Summary

Verify that the completed foundation works as one coherent experience on the intended small laptop, not just as isolated components.

## Done When

- An Archive → item → Archive journey and visits to Inbox, Family, and Upload work in light and dark system appearance.
- The main screens are checked at 1366x768, 200% browser zoom, and a 320px CSS viewport with no clipped actions or page-level horizontal scrolling.
- Keyboard-only use, route focus, breadcrumbs, browser history, reduced motion, contrast, and readable long/sparse content are checked across screens.
- Loading, empty, no-results, error, thumbnail fallback, validation, and demo-save examples are reachable using the documented procedure.
- Network/content inspection confirms no private family material is included and no mock upload sends a file.
- vp check, vp test, vp run type-check, and vp run build pass. A vp run preview smoke check covers direct item URLs and navigation.
- A concise acceptance record includes browser/version, viewport, theme, results, and relevant screenshots or observations.
- Any unresolved failure is recorded against its owning ticket or proposed as a reviewable follow-up rather than silently declared complete.

## Assumptions / Decisions / Constraints

- Earlier tickets own their tests and documentation; this is cross-screen integration verification.
- These checks do not claim that authentication, uploads, real PDF rendering, or archive persistence exist.
- The acceptance record is this ticket's commit deliverable; no artificial code changes are required.
```

## Workflow follow-up

- Review, approval, publication to milestone 1, and dependency linking are complete.
- Begin implementation only after a separate user request.
- After implementation and acceptance, archive the OpenSpec change and verify the resulting durable specs.
