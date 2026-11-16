# System Design

## Research / Background

See `prd.md` for the product motivation and `specs/` for observable behavior.

- `src/main.ts` already registers Pinia and Vue Router; no framework installation is needed.
- `src/router/index.ts` creates a history-mode router with no routes. `src/App.vue` is a hello-world page with a Reka dialog.
- `src/style.css` only imports Tailwind. `vite.config.ts` already enables Tailwind v4 and Vue.
- `package.json` provides Vue, Reka UI, Pinia, Vue Router, Vue Test Utils, and Vite+ testing. No additional component suite is needed.
- `src/__tests__/App.spec.ts` tests the starter screen and dialog. Replace starter expectations as the corresponding UI changes, retaining focus and keyboard coverage where relevant.
- The frontend is not authenticated. It must not embed the user's real archive documents or private metadata.

This design is necessary because theming, routing, components, and browsing state cross several modules.

## Assumptions / Decisions / Dependencies

### Styling and identity

Use Tailwind v4 semantic `@theme` color tokens backed by CSS `light-dark()`, with `color-scheme: light dark` on the root. Define canvas, surface, foreground, muted text, border, accent, focus, and semantic status tokens. Components use token utilities rather than scattered literal colors or repeated dark variants.

White is the light canvas; warm gray and muted evergreen are starting palette candidates, not frozen hex values. Select accessible pairs through the theme ticket. Keep documents and photos unfiltered. A simple Clutterbase text wordmark and matching small favicon are enough; no illustration or logo-design project.

Use a friendly system sans-serif stack initially, avoiding a font download dependency. Inter was discussed as a candidate, not confirmed; a different sans-serif can be selected during visual review without changing scope. Start with an 18px body size, 48px primary buttons, restrained spacing, and a compact header. Avoid oversized banners and permanent wide sidebars.

Alternative: a pre-styled library would introduce competing styling conventions; keep the existing Reka primitives and style only the small set the screens use.

### Components and Vue structure

Keep route views in `src/views`, shared layout in `src/components/layout`, reusable controls in `src/components/ui`, and archive-specific components in `src/components/archive`. These are proposed conventions, not existing directories.

Provide styled buttons/links, labeled inputs, a simple select, status labels, feedback panels, and a dialog only where needed. Use native semantics where sufficient and Reka for interactions needing focus management. Include inline validation and persistent save/demo feedback. Document component and token usage with the relevant ticket; do not build an exhaustive component catalog.

Keep local form state in its view. Use a small Pinia store only for cross-route collection context. Do not create speculative service abstractions or backend clients.

### Navigation and collection context

Proposed routes: `/` for Archive, `/inbox`, `/family`, `/upload`, and `/archive/:id` for items, plus a not-found route. The shared shell provides active navigation, a skip link, a main landmark, page titles, and route focus handling.

Represent search, file-type filter, and sort in query parameters so browser history and direct collection URLs behave predictably. Store scroll position and the originating collection URL for item return within the browsing session. Restore only after the result layout has rendered; give previews reserved dimensions to reduce layout shift. Breadcrumb navigation uses this context, falling back to `/` for direct item visits. Restore collection focus without forcing a jump to the top. Cross-session restoration is not promised in this milestone.

Alternative: keeping all criteria only in a store would obscure browser history and shared links. A modal item view would make direct navigation and small-screen document reading less predictable.

### Mock collection and item screens

Use typed, deterministic synthetic fixtures with stable IDs and locally available safe preview assets. Include photos, portrait PDF pages, rich and sparse metadata, long filenames, uncertain dates, missing/processing/failed thumbnails, a multipage PDF, and a separate AI suggestion. Do not generate thumbnails or fetch private archive material.

Archive is a responsive grid, not a dashboard. Implement small client-side search over displayed mock text, a photo/PDF filter, and newest/oldest sorting using explicit fixture upload timestamps. These are prototype controls, not a commitment to production search semantics. Display result count and a clear-all action.

The dedicated item view uses a prepared image to illustrate the PDF viewer area, not an embedded live PDF renderer. It shows the full title, details, breadcrumb, file information, and Edit details. A responsive inline editing section demonstrates title, people, approximate date text, and description without defining the eventual database model. Demo edits may update in-memory state but must say they reset on reload and are not saved to an archive.

### Illustrative destinations and state coverage

Inbox illustrates Needs review and Reviewed lists. Family illustrates person cards and a simple selected-person summary, not a graph or genealogy editor. Upload illustrates a file-selection area and per-file status examples; no transfers occur. Use visible demo explanations and no fake working production controls.

Make state examples reproducible through a documented development/demo mechanism. Include a collection loading state, empty archive, no results, recoverable error, missing-preview fallbacks, inline validation, and demo save feedback. Avoid real requests or artificial delays just to demonstrate these states.

### Verification and work tracking

Each ticket owns its component tests and documentation. Use the existing Vue Test Utils/Vite+ setup for routing, cards, filtering, fallbacks, and demo editing behavior. Scroll, native browser history, focus, contrast, and media preferences also require browser checks; jsdom tests alone do not establish them.

Final integration checks cover 1366x768, 200% browser zoom, 320 CSS-pixel reflow, both system appearances, keyboard-only use, and reduced motion. Record manual evidence and run `vp check`, `vp test`, `vp run type-check`, `vp run build`, and a `vp run preview` smoke check. No new browser-test dependency is required by this plan.

The implementation artifact contains one tracked task and one draft issue body per ticket. All drafts target GitHub milestone 1; local draft IDs become issue links only after approval. The final verification ticket checks cross-screen integration rather than deferring earlier tickets' tests.

## Risks / Trade-offs

- [Large controls consume a small viewport] → Keep header and spacing compact; test with long titles and zoom, not only ideal screenshots.
- [Muted colors lose contrast in one theme] → Measure text, focus, borders, and status pairs in both themes.
- [Prototype mistaken for a private working archive] → Use only synthetic content and explicit demo labels; no connected storage, auth, uploads, or AI.
- [Browser scroll restoration conflicts with route focus] → Test Back and breadcrumb independently and wait for stable result layout before restoring.
- [Mock PDF previews conceal future renderer constraints] → Document the prepared-image boundary and defer actual rendering and thumbnail infrastructure to Upload and browse.
- [System-only theme limits manual choice] → Follow the agreed system preference; a manual override remains optional later.

## Migration plan

No database or data migration. Replace the starter frontend incrementally in dependency order, with tests and documentation landing alongside each slice. Before any hosted release, verify nested URL loading and absence of private content. If needed, roll back only the milestone's frontend commits; no stored archive data is affected.

## Open questions

- Exact accessible color values and final sans-serif selection can be refined during visual review within the theme ticket.
- The user's real documents may inform a later private review, but are not needed or authorized for public prototype assets.
