# Specs Delta

## MODIFIED Requirements

### Requirement: Browsing-first home

For authenticated users with active archive membership, the application SHALL open directly to the archive collection rather than a dashboard or welcome panel. Its compact shared navigation SHALL expose Archive, Inbox, and Family, show the current destination, and provide a prominent Upload files action. Signed-out visitors SHALL see sign-in instead of archive content.

#### Scenario: Opening the application

- **WHEN** an authenticated active archive member opens the application root
- **THEN** the archive collection is the main content
- **AND** Archive, Inbox, Family, and Upload files are visibly available

#### Scenario: Opening the application while signed out

- **WHEN** a signed-out visitor opens the application root
- **THEN** sign-in is the main content and archive content is not rendered

## ADDED Requirements

### Requirement: Authentication-aware destinations

Protected deep links SHALL pass through authentication and current membership verification before rendering. Successful sign-in SHALL restore a valid intended in-app destination. External return destinations SHALL NOT be followed. Invitation acceptance SHALL finish before opening the admitted archive.

#### Scenario: A member follows a direct item link

- **WHEN** a signed-out active member opens an item link and successfully signs in
- **THEN** the application verifies their membership and returns them to that item URL
- **AND** existing missing-item behavior remains applicable

#### Scenario: A return destination points outside the application

- **WHEN** a sign-in request contains an external return destination
- **THEN** the application ignores it and opens the authorized archive instead

### Requirement: Owner access-management destination

Active owners SHALL have a clearly labeled archive-scoped destination for invitations and contributor blocking. Contributors SHALL NOT see owner controls, and navigating directly to that destination SHALL NOT expose its protected information.

#### Scenario: An owner manages access

- **WHEN** an active owner opens access management
- **THEN** the current archive is identified and invitation and contributor-block controls are available
- **AND** no archive switcher or archive-creation control is required for this single-archive release
