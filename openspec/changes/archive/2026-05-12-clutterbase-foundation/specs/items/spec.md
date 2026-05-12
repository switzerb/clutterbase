## ADDED Requirements

### Requirement: Items require only a file and title to be created
The system SHALL allow item creation with only a file and title. All other fields (description, date, file_type, people, tags) SHALL be optional and can be added or edited at any time after creation.

#### Scenario: Minimal item creation
- **WHEN** a user uploads a file with only a title provided
- **THEN** the system creates the item and stores it with all optional fields empty

#### Scenario: Title defaults to filename
- **WHEN** a user uploads a file without providing a title
- **THEN** the system derives the title from the uploaded filename (without extension)

### Requirement: Items store flexible date information
The system SHALL store a date for an item as either an exact year or a decade. The date and its precision SHALL both be stored so the UI can display them appropriately.

#### Scenario: Exact year stored
- **WHEN** a user sets an item's date to a specific year (e.g., 1952)
- **THEN** the system stores `date_year = 1952` and `date_precision = year`

#### Scenario: Decade stored
- **WHEN** a user sets an item's date to a decade (e.g., 1950s)
- **THEN** the system stores `date_year = 1950` and `date_precision = decade`

#### Scenario: No date provided
- **WHEN** a user creates an item without specifying a date
- **THEN** both `date_year` and `date_precision` remain null

### Requirement: File type is inferred from uploaded file
The system SHALL infer the item's file type (photo, document, other) from the uploaded file's MIME type. Users MAY override the inferred type.

#### Scenario: Image file inferred as photo
- **WHEN** a user uploads a file with an image MIME type (e.g., image/jpeg, image/png)
- **THEN** the system sets `file_type = photo`

#### Scenario: PDF inferred as document
- **WHEN** a user uploads a file with a PDF or text MIME type
- **THEN** the system sets `file_type = document`

#### Scenario: Unknown MIME type
- **WHEN** a user uploads a file with an unrecognized MIME type
- **THEN** the system sets `file_type = other`

### Requirement: Items can be edited after creation
The system SHALL allow any authenticated user to edit an item's title, description, date, file_type, people links, and tag links after the item has been created.

#### Scenario: Editing item metadata
- **WHEN** an authenticated user edits an item's metadata and saves
- **THEN** the system updates the item and reflects the changes immediately

### Requirement: Items can be deleted
The system SHALL allow admin users to delete items. Deletion SHALL remove the item record and its associated files from storage.

#### Scenario: Admin deletes an item
- **WHEN** an admin user deletes an item
- **THEN** the system removes the item record, its file from storage, its thumbnail from storage, and all junction table entries (item_tags, item_people, item_relationships)
