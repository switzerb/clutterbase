## ADDED Requirements

### Requirement: Tags belong to structured categories
The system SHALL organize tags into categories. The default categories SHALL be: place, event, topic, format. Each tag SHALL belong to exactly one category. Categories SHALL be managed by admin users.

#### Scenario: Tag created in a category
- **WHEN** an admin creates a tag named "Boston" in the "place" category
- **THEN** the tag is stored associated with the "place" category and available for use on items

#### Scenario: Tag displayed with its category
- **WHEN** tags are displayed on an item detail page
- **THEN** each tag SHALL be grouped or labeled by its category

### Requirement: Items can have multiple tags from any category
The system SHALL allow items to be linked to any number of tags across any combination of categories. The same tag SHALL be reusable across many items.

#### Scenario: Multiple tags applied to an item
- **WHEN** a user applies tags from multiple categories to an item
- **THEN** all selected tags are associated with the item and visible on its detail page

#### Scenario: Tag reused across items
- **WHEN** a tag (e.g., "Cape Cod") exists in the system
- **THEN** any item can be linked to it without creating a duplicate

### Requirement: Tags are shared across all family members
Tags SHALL be global to the application — not per-user. All authenticated users see and use the same tag vocabulary.

#### Scenario: Tag created by one user, used by another
- **WHEN** one family member creates a tag
- **THEN** all other authenticated family members can apply that tag to items

### Requirement: Admin can manage tag categories and tags
Admin users SHALL be able to create, rename, and delete tag categories and individual tags. Deleting a tag SHALL remove it from all items it was applied to.

#### Scenario: Admin deletes a tag
- **WHEN** an admin deletes a tag
- **THEN** the system removes the tag and all item_tag associations for that tag
