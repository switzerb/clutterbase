## ADDED Requirements

### Requirement: Full-text search across item title and description
The system SHALL support keyword search across item titles and descriptions. Search results SHALL return items where the query matches any part of the title or description.

#### Scenario: Keyword found in title
- **WHEN** a user searches for "beach"
- **THEN** items with "beach" in their title or description are returned

#### Scenario: No matches found
- **WHEN** a user searches for a term that matches no items
- **THEN** the system displays an empty results state

### Requirement: Items can be filtered by one or more tags
The system SHALL allow users to filter items by selecting tags within any category. Selecting multiple tags within a category SHALL return items matching any of those tags (OR). Selecting tags across categories SHALL return items matching all selected categories (AND).

#### Scenario: Filter by single tag
- **WHEN** a user selects the "Boston" tag in the place category
- **THEN** only items tagged with "Boston" are returned

#### Scenario: Filter by multiple tags across categories
- **WHEN** a user selects "Boston" (place) and "1950s" (decade)
- **THEN** only items tagged with both "Boston" AND associated with the 1950s are returned

### Requirement: Items can be filtered by person
The system SHALL allow users to filter items to show only those linked to a specific person.

#### Scenario: Filter by person
- **WHEN** a user selects a person from the people filter
- **THEN** only items linked to that person are returned

### Requirement: Items can be filtered by date range
The system SHALL allow users to filter items by decade or year range. Items with no date SHALL be excluded from date-filtered results.

#### Scenario: Filter by decade
- **WHEN** a user selects "1950s" as a date filter
- **THEN** items with date_year between 1950 and 1959 (inclusive) are returned regardless of date_precision

### Requirement: Items can be filtered by file type
The system SHALL allow users to filter items to show only photos, only documents, or only other file types.

#### Scenario: Filter by file type
- **WHEN** a user selects "photo" as a file type filter
- **THEN** only items with file_type = photo are returned

### Requirement: Search and filters can be combined
The system SHALL allow simultaneous use of keyword search, tag filters, person filter, date filter, and file type filter. Results SHALL satisfy all active constraints.

#### Scenario: Combined search and filter
- **WHEN** a user searches "beach" and filters by person "Ruth" and decade "1950s"
- **THEN** only items matching all three constraints are returned

### Requirement: Search results can be sorted
The system SHALL allow users to sort search results by: item date (ascending/descending), upload date (ascending/descending).

#### Scenario: Sort by item date
- **WHEN** a user sorts results by item date descending
- **THEN** items with the most recent date_year appear first; items with no date appear last
