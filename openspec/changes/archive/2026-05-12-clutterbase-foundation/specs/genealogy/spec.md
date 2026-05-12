## ADDED Requirements

### Requirement: Family relationships are modeled via family units
The system SHALL represent genealogical relationships using family units. Each family unit MAY have up to two parents (either can be null to represent unknown or single parents) and any number of children.

#### Scenario: Two-parent family unit created
- **WHEN** a user creates a family unit linking two people as parents
- **THEN** the system stores the unit with both parent references

#### Scenario: Single-parent family unit created
- **WHEN** a user creates a family unit with only one parent specified
- **THEN** the system stores the unit with one parent and the other null

### Requirement: Children are linked to family units
The system SHALL link children to a family unit via a junction record. A person SHALL be a child in at most one family unit.

#### Scenario: Child added to a family unit
- **WHEN** a user adds a person as a child of a family unit
- **THEN** the system creates a family_unit_children record linking that person to the unit

### Requirement: A person can be a parent in multiple family units
The system SHALL allow a person to appear as a parent in more than one family unit, enabling modeling of remarriage and multiple partnerships.

#### Scenario: Person appears in two family units as parent
- **WHEN** a person has children from two different partnerships
- **THEN** the person is listed as parent in two distinct family units, each with their respective other parent and children

### Requirement: Family tree navigation is possible from any person
The system SHALL allow navigating the family tree up (to parents) and down (to children) from any person's profile.

#### Scenario: Navigating to a person's parents
- **WHEN** a user views a person's profile
- **THEN** the system displays the family unit where that person is a child (showing their parents if known)

#### Scenario: Navigating to a person's children
- **WHEN** a user views a person's profile
- **THEN** the system displays all family units where that person is a parent (showing children in each)

### Requirement: Unknown parents can be represented
The system SHALL allow family units where one or both parents are unknown (null). This supports incomplete genealogical records without blocking data entry.

#### Scenario: Both parents unknown
- **WHEN** a user creates a family unit with both parent fields null
- **THEN** the system stores the unit and displays the children without named parents
