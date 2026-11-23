# Specs Delta

## Purpose

Provide a consistent, welcoming interface that relatives can read and operate confidently on small screens without power-user knowledge.

## ADDED Requirements

### Requirement: System-following appearance

The interface SHALL follow the system light or dark appearance without a manual theme control. Light mode SHALL use a white page background. Both modes SHALL retain readable text, muted accents, and consistent semantic colors without recoloring archive images.

#### Scenario: System appearance changes

- **WHEN** the system changes between light and dark appearance
- **THEN** backgrounds, text, borders, controls, and feedback adopt the matching theme
- **AND** photographs and document previews retain their original colors

### Requirement: Readable typography and controls

The interface SHALL use clean sans-serif typography, body text of at least 18 CSS pixels at default settings, and primary buttons at least 48 CSS pixels high. Navigation and important actions SHALL have visible text labels rather than relying on icons alone.

#### Scenario: A relative navigates the interface

- **WHEN** a relative views navigation, forms, or primary actions
- **THEN** labels describe their destinations or outcomes in plain language
- **AND** text remains readable and controls are comfortably sized

### Requirement: Responsive uncluttered layouts

The interface SHALL prioritize archive content on a 1366 by 768 CSS-pixel viewport, reflow at narrower widths and browser zoom, and avoid page-level horizontal scrolling at a 320 CSS-pixel width. Essential controls SHALL remain reachable without overlapping content.

#### Scenario: A small laptop window is zoomed

- **WHEN** the user increases browser zoom to 200 percent or narrows the window
- **THEN** content and navigation reflow without hiding actions or clipping text
- **AND** large-screen side-by-side content stacks when it no longer fits

### Requirement: Accessible interactions

Interactive controls SHALL support keyboard use, visible focus, accessible names, and appropriate semantics. Text SHALL meet WCAG AA contrast thresholds, and essential non-text controls SHALL meet 3:1 contrast. Status SHALL not depend on color alone. Nonessential motion SHALL respect reduced-motion preferences.

#### Scenario: Keyboard-only operation

- **WHEN** a user navigates links, forms, menus, and dialogs using the keyboard
- **THEN** focus is visible, operation is possible without a pointer, and dialogs manage and return focus
- **AND** no action is available only on hover

### Requirement: Understandable interface states

The prototype SHALL demonstrate distinct loading, empty, no-results, error, missing-preview, and incomplete-information states. Messages SHALL explain the situation and provide an appropriate available next action. Mock save feedback SHALL remain discoverable rather than relying only on transient notifications.

#### Scenario: A preview fails

- **WHEN** a mock archive preview is unavailable
- **THEN** a stable labeled placeholder replaces it without blocking item navigation

#### Scenario: A mock operation completes

- **WHEN** a user completes the illustrative edit action
- **THEN** the interface explains that changes are demo-only and provides visible completion feedback

### Requirement: Explicit safe prototype scope

Illustrative Inbox, Family, Upload, and editing screens SHALL identify their demo-only behavior. Public prototype content SHALL be synthetic or explicitly approved for public use. The prototype SHALL NOT transfer files, imply durable saving, or expose private family documents.

#### Scenario: A user opens Upload files

- **WHEN** a user visits the mock upload screen
- **THEN** the layout illustrates the intended experience and explains that uploads are not connected
- **AND** no selected file is sent to a server
