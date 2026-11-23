# Specs Delta

## Purpose

Invite relatives to explore photographs and letters through recognizable previews and meaningful details while supporting incomplete cataloging.

## ADDED Requirements

### Requirement: Visual collection cards

The collection SHALL present a responsive photo-album-style grid. Each card SHALL provide a preview or placeholder, a display title, and optional people, approximate date, and short description. Missing optional fields SHALL be omitted rather than replaced with repeated Unknown labels.

#### Scenario: Browsing rich and sparse records

- **WHEN** the collection includes a described letter and a newly uploaded item
- **THEN** the letter displays its available hooks and the new item remains recognizable using its filename and preview
- **AND** long titles wrap or truncate without breaking the layout, with the full title available on the item page

### Requirement: Proportional PDF previews

PDF cards SHALL represent one complete file with a first-page preview that preserves page proportions without cropping document content. They SHALL show a PDF label and page count when known. Processing and failed previews SHALL have labeled fallbacks that do not block opening the item.

#### Scenario: A multipage letter appears in the collection

- **WHEN** a mock three-page PDF has a prepared first-page preview
- **THEN** one card represents the file and displays PDF and its page count
- **AND** the preview does not crop the page

### Requirement: Mock collection discovery

The prototype SHALL provide labeled search, file-type filtering, sorting, and a way to clear active criteria over mock content. Result counts and a no-results message SHALL reflect active criteria without hiding the means to clear them.

#### Scenario: A search has no matches

- **WHEN** the user enters criteria that match no mock items
- **THEN** an understandable no-results message and clear-criteria action are displayed
- **AND** clearing criteria restores the collection

### Requirement: Viewing-first item pages

Item pages SHALL prioritize the image or document preview and readable details over editing controls. They SHALL provide a labeled Edit details action, display document and details together only when both remain readable, and stack them on narrower layouts.

#### Scenario: Opening a document on a small screen

- **WHEN** the item page lacks space for a readable preview and details side by side
- **THEN** both remain available in a stacked layout without page-level horizontal scrolling
- **AND** editing is available through Edit details rather than a permanently exposed form

### Requirement: Editable information demonstration

The prototype SHALL demonstrate editing titles, people, approximate date text, and descriptions using mock values. The initial display-title fallback SHALL be the filename. Demonstration edits SHALL NOT imply implemented persistence or finalized person/date data models.

#### Scenario: Editing a sparsely described letter

- **WHEN** a user activates Edit details for a mock letter
- **THEN** the available fields show existing mock values and permit illustrative edits
- **AND** the interface explains that changes are demo-only

### Requirement: Distinct AI suggestions

Mock AI-derived suggestions SHALL be visibly labeled as AI suggestions and distinguishable from established catalog details. They SHALL NOT silently appear as accepted people, dates, titles, or descriptions.

#### Scenario: Viewing an unaccepted date guess

- **WHEN** a mock item includes an AI-suggested date
- **THEN** the suggestion is explicitly labeled and remains separate from established item details
