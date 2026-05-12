## ADDED Requirements

### Requirement: People are first-class entities with a required name
The system SHALL represent family members and historical figures as people records. Each person SHALL have a full name. All other fields (birth_year, death_year, notes, profile_photo_item_id) SHALL be optional.

#### Scenario: Person created with only a name
- **WHEN** a user creates a person with only a full name
- **THEN** the system stores the person with all optional fields null

#### Scenario: Person created with full details
- **WHEN** a user creates a person with name, birth year, death year, and notes
- **THEN** all provided fields are stored and displayed on the person's profile

### Requirement: Items can be linked to multiple people
The system SHALL allow items to be associated with any number of people. The same person SHALL be linkable to many items.

#### Scenario: People linked to an item
- **WHEN** a user links two people to a photo item
- **THEN** both people appear on the item's detail page and the item appears in each person's item list

### Requirement: People have a profile page showing their items
The system SHALL provide a profile page for each person displaying their linked items in a gallery grid.

#### Scenario: Viewing a person's profile
- **WHEN** a user navigates to a person's profile page
- **THEN** the system displays the person's details and a gallery of all items linked to them

### Requirement: A person can have a profile photo
A person MAY have a profile photo set by linking to an existing item in the archive. The linked item's thumbnail is used as the person's avatar.

#### Scenario: Profile photo set
- **WHEN** a user sets a person's profile photo to an existing photo item
- **THEN** the person's avatar displays that item's thumbnail

### Requirement: People can be edited and deleted
The system SHALL allow authenticated users to edit a person's details. Admin users SHALL be able to delete a person, which removes the person record and all item_people associations.

#### Scenario: Admin deletes a person
- **WHEN** an admin deletes a person
- **THEN** the system removes the person record and all item_people and family_unit associations for that person
