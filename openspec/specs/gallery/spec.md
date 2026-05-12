# Gallery

## Purpose

The primary browsing interface for the archive. Displays items as a thumbnail grid with filter and sort controls. Provides an item detail page for viewing and editing all metadata, linked people, tags, and related items.

## Requirements

### Requirement: Items are displayed in a browsable grid gallery
The system SHALL display items as a grid of thumbnail cards. Each card SHALL show the item's thumbnail (or a file-type placeholder), title, and date if set.

#### Scenario: Gallery displays items as cards
- **WHEN** an authenticated user navigates to the gallery
- **THEN** items are displayed as a grid of thumbnail cards with titles

#### Scenario: Item with no thumbnail shows placeholder
- **WHEN** an item has no thumbnail (e.g., a non-image file)
- **THEN** the gallery card shows a file-type icon placeholder

### Requirement: The gallery shows filter and sort controls
The system SHALL provide filter controls in the gallery view allowing users to filter by tags (grouped by category), people, date/decade, and file type. Sort controls SHALL allow sorting by item date and upload date.

#### Scenario: Filter controls visible in gallery
- **WHEN** a user views the gallery
- **THEN** filter controls for tags, people, date, and file type are accessible

#### Scenario: Applied filters reduce visible items
- **WHEN** a user applies one or more filters
- **THEN** only items matching all active filters are shown in the grid

### Requirement: The gallery has an "incomplete items" view
The system SHALL provide a filtered view showing only items missing key metadata: no date, no people linked, and no tags applied. This view helps users identify items that need enrichment.

#### Scenario: Incomplete items view
- **WHEN** a user activates the "incomplete items" filter
- **THEN** only items with no date AND no linked people AND no tags are displayed

### Requirement: Clicking an item navigates to its detail page
The system SHALL navigate the user to the item detail page when they click on a gallery card.

#### Scenario: Item card clicked
- **WHEN** a user clicks a gallery item card
- **THEN** the system navigates to that item's detail page

### Requirement: Item detail page shows all item information
The system SHALL provide a detail page for each item displaying: full-resolution file (or download link for non-images), title, description, date, file type, linked people, tags grouped by category, and related items.

#### Scenario: Item detail shows all metadata
- **WHEN** a user views an item detail page
- **THEN** all stored metadata, linked people, tags, and related items are displayed

#### Scenario: Item detail allows inline editing
- **WHEN** an authenticated user views an item detail page
- **THEN** they can edit the item's title, description, date, people links, tags, and related item associations from that page