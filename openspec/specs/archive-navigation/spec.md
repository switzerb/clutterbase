# archive-navigation Specification

## Purpose

Help relatives move predictably between archive browsing, review, family profiles, and individual material without losing their place.

## Requirements

### Requirement: Browsing-first home

The application SHALL open directly to the archive collection rather than a dashboard or welcome panel. Its compact shared navigation SHALL expose Archive, Inbox, and Family, show the current destination, and provide a prominent Upload files action.

#### Scenario: Opening the application

- **WHEN** a user opens the application root
- **THEN** the archive collection is the main content
- **AND** Archive, Inbox, Family, and Upload files are visibly available

### Requirement: Dedicated destinations and items

Each primary destination and each mock archive item SHALL have a directly navigable URL. Items SHALL open on dedicated pages rather than modal overlays. Unknown routes and missing item identifiers SHALL provide an understandable not-found view with a route back to Archive.

#### Scenario: Opening an item link directly

- **WHEN** a user opens a valid mock item URL in a new tab or reloads it
- **THEN** the corresponding dedicated item page renders

#### Scenario: Opening a missing item

- **WHEN** a user opens an unknown item identifier
- **THEN** the interface explains that the item was not found and offers Archive navigation

### Requirement: Item breadcrumbs

Item pages SHALL display a breadcrumb beginning with Archive and ending with the item's display title. The Archive breadcrumb SHALL provide a return to browsing.

#### Scenario: Viewing a letter

- **WHEN** a user opens a letter titled Grandma's first letter from college
- **THEN** the breadcrumb identifies Archive and Grandma's first letter from college
- **AND** Archive is an actionable link

### Requirement: Browsing context restoration

After opening an item from Archive, returning through browser Back or the Archive breadcrumb SHALL restore the previous search, filters, sort order, and scroll position within that browsing session. Direct item visits without prior browsing context SHALL return to the default collection.

#### Scenario: Returning to filtered results

- **WHEN** a user searches, filters, sorts, scrolls, opens an item, and returns through Back or the breadcrumb
- **THEN** the previous query, selections, result order, and scroll position are restored

### Requirement: Accessible route transitions

Route changes SHALL update the document title and expose the new page's main heading to keyboard and assistive-technology users. Restoration to browsing SHALL avoid unexpectedly moving the user away from their restored place.

#### Scenario: Navigating to Family using the keyboard

- **WHEN** a user activates the Family navigation link
- **THEN** the document title identifies Family and the new main content is discoverable without traversing the entire header again
