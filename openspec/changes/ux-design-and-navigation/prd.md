# Product

## Why

Clutterbase needs a welcoming, predictable foundation that invites relatives to explore family material without technical confidence. Establishing the experience now lets later features share consistent navigation, accessible controls, and readable layouts rather than inventing them independently.

## What Changes

- Replace the hello-world screen with a responsive, browsing-first archive experience using mock content.
- Establish a minimalist visual identity: white light-mode background, warm muted accents, dark readable text, and clean friendly sans-serif typography.
- Support system-following light and dark appearance without a manual toggle.
- Provide compact **Archive · Inbox · Family** navigation and a prominent **Upload files** action.
- Introduce photo-album-style cards with proportional previews, titles, optional people, approximate dates, and short descriptions.
- Open items on dedicated viewing-first pages with breadcrumbs and an **Edit details** action. Returning to Archive restores search, filters, and browsing position.
- Demonstrate Inbox, Family, Upload, and editing layouts with clearly identified mock content.
- Establish shared controls and loading, empty, error, missing-preview, and incomplete-information states.
- Validate both themes on small laptop screens, narrower windows, keyboard navigation, and browser zoom.

## Capabilities

### New Capabilities

- `interface-foundations`: Consistent appearance, accessible controls, readable responsive layouts, and interface feedback.
- `archive-navigation`: Browsing-first entry, primary destinations, dedicated item routes, breadcrumbs, and return-to-results behavior.
- `archive-browsing`: Visual archive cards, mock search/filter/sort behavior, and viewing-first item presentation.

### Modified Capabilities

None.

## Target users

Family members who mainly browse, including a contributor using a small MacBook Air who is not a power user. Contributors also need easy access to uploading and gradual cataloging without making those tasks dominate the home screen.

## Scope constraints

This milestone is a frontend prototype with synthetic public-safe content. Authentication, archive permissions, file transfer, thumbnail generation, live PDF rendering, real metadata persistence, genealogy behavior, and AI processing remain later work. PDF cards demonstrate first-page thumbnails and fallbacks; they do not generate thumbnails. Mock AI guesses remain visibly distinct from established details.

Every implementation work item will have one reviewed GitHub ticket in milestone **UX Design and Navigation** (number 1). Drafts are not published until the user approves them.
