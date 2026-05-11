## ADDED Requirements

### Requirement: Items can be manually linked to related items
The system SHALL allow authenticated users to create a bidirectional association between any two items. An optional note SHALL describe why the items are related.

#### Scenario: Two items linked with a note
- **WHEN** a user links item A to item B with the note "same trip"
- **THEN** the system stores the relationship; item A shows item B as related and item B shows item A as related

#### Scenario: Two items linked without a note
- **WHEN** a user links item A to item B without providing a note
- **THEN** the system stores the relationship with a null note; both items show each other as related

### Requirement: Related items are displayed on the item detail page
The system SHALL display all items related to the current item in a section of the item detail page, showing each related item's thumbnail, title, and relationship note if present.

#### Scenario: Item detail shows related items
- **WHEN** a user views an item that has related items
- **THEN** the system displays thumbnails and titles of all related items below the item's main content

#### Scenario: Item detail with no related items
- **WHEN** a user views an item with no related items
- **THEN** the related items section is either hidden or shows an empty state

### Requirement: Item relationships can be removed
The system SHALL allow authenticated users to remove a relationship between two items. Removal is bidirectional — removing from either item removes the association.

#### Scenario: User removes a relationship
- **WHEN** a user removes the link between item A and item B from item A's detail page
- **THEN** the relationship is deleted; neither item shows the other as related

### Requirement: An item can be related to multiple other items
The system SHALL support any number of relationships per item. There is no enforced limit.

#### Scenario: Item with many related items
- **WHEN** an item has five related items
- **THEN** all five are displayed in the related items section
