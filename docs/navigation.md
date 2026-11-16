# Navigation foundations

The prototype opens directly to Archive. The shared header uses native Vue Router links for Archive, Inbox, Family, and Upload files. Destination content is deliberately labeled as a placeholder; uploads and archive data are not connected.

Routes are declared in `src/router/index.ts`, destination views live in `src/views/`, and the shared header is in `src/components/layout/`. `/archive/sample-item` is the only known, public-safe placeholder item ID; unknown IDs and other unknown routes explain the problem and link back to Archive. Future collection fixtures should replace the placeholder identifier. Item breadcrumbs and return-to-results context belong to later tickets.

The shell updates the document title and focuses the new main heading after path changes. Initial loading leaves focus alone so the skip link is the first keyboard stop. Query-only changes do not move focus, leaving room for later collection controls. Future browsing-context restoration must coordinate with this focus behavior.

Shared fields, buttons, links, and dialogs are documented in [shared controls](shared-controls.md). Navigation uses native router links with the same semantic colors, 48px action sizing, and focus treatment.

## Browser check

Start the development server (`vp run dev --host 127.0.0.1`) or build and start the preview (`vp run build` then `vp run preview --host 127.0.0.1`). In a second terminal:

```sh
PREVIEW_URL=http://127.0.0.1:5173 vp node scripts/verify-navigation.mjs
```

The default address is `http://127.0.0.1:4173`; `CHROME_PATH` overrides the default macOS Chrome executable. The dependency-free check uses an isolated temporary Chrome profile. It loads and reloads routes, checks skip-link activation, titles and route focus including Back/Forward, and checks link bounds and horizontal overflow at 1366 and 320 CSS pixels in both appearances. It also sets Chrome's actual default page zoom to 200% through Chrome settings, reloads at a 1366×768 device viewport, confirms the resulting 683 CSS-pixel viewport and DPR 2, and checks link bounds and overflow in both appearances. This is not merely 683px viewport emulation. It requires Chrome's `chrome.settingsPrivate` API and fails if unavailable. The script writes its results to `docs/navigation-evidence/navigation-verification.json`.

Also review manually: Tab from a fresh load to the skip link and activate it, navigate the primary links with the keyboard, and use browser Back/Forward. Confirm visible focus, readable labels, and navigation at 1366×768, 200% browser zoom, and 320 CSS pixels in both system appearances. This ticket does not establish the later cross-screen or scroll-restoration acceptance checks. A deployed host must serve the app shell for nested URLs; the existing Wrangler assets configuration supplies SPA fallback.

## Verification record

Lead verification passed against the production build served by `vp run preview`: all route reload, skip-link, keyboard focus, Back/Forward, layout, and actual-zoom checks in [the browser record](navigation-evidence/navigation-verification.json). The separate theme regression check also passed, including unchanged artwork pixels and action focus in both appearances. Its screenshots inject the synthetic artwork solely as a browser fixture; that image is not archive browsing content in the application.

`vp check`, `vp test` (79 tests, including 11 navigation tests and 8 shared-control tests), `vp run type-check`, and `vp run build` passed. Run `vp fmt docs/navigation-evidence/` after regenerating JSON evidence, then rerun `vp check`.
