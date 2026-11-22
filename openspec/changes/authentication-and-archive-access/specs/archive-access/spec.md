# Specs Delta

## Purpose

Protect private archives with independent memberships and let owners suspend contributor access without deleting family contributions.

## ADDED Requirements

### Requirement: Archive-scoped membership roles

Each membership SHALL associate an account with one archive and an Owner or Contributor role. An archive SHALL support multiple owners, and an account SHALL support independent memberships in multiple archives. Ownership of one archive SHALL NOT grant access or administrative privileges in another.

#### Scenario: Two relatives own the same archive

- **WHEN** two accounts have active Owner memberships in an archive
- **THEN** both can perform that archive's owner operations
- **AND** neither requires a global application-admin role

#### Scenario: A person has different roles in different archives

- **WHEN** a person owns archive A and contributes to archive B
- **THEN** they can manage invitations in A but not B
- **AND** substituting another archive identifier does not bypass authorization

### Requirement: Single-archive launch setup

Launch SHALL provide one archive and an initial Owner through trusted setup bound to a verified account. Public visitors SHALL NOT create archives or claim initial ownership. Archive creation and switching interfaces SHALL NOT be required for launch.

#### Scenario: Initial ownership is established

- **WHEN** trusted setup establishes the configured archive and initial verified owner
- **THEN** that account can sign in and invite additional owners or contributors
- **AND** repeating setup does not create duplicate archives or memberships

### Requirement: Contributor and owner permissions

Active owners and contributors SHALL have equal archive-content access for browsing, uploading, tagging, editing, and reviewing as those features become available. Only active owners SHALL manage invitations and contributor blocks. Contributor accounts SHALL NOT elevate their own privileges.

#### Scenario: A contributor attempts an owner operation

- **WHEN** an active contributor directly requests an invitation or contributor-block operation
- **THEN** the server rejects the operation even if the caller bypasses the interface
- **AND** no invitation, role, or membership state changes

### Requirement: Current membership enforcement

Protected archive reads, writes, and administrative operations SHALL require current active membership in the target archive. Authentication alone SHALL NOT suffice. Unauthenticated, nonmember, and blocked requests SHALL be denied by the server independently of route controls.

#### Scenario: A nonmember has a valid session

- **WHEN** an authenticated nonmember requests protected archive data directly
- **THEN** no archive data is returned
- **AND** the interface shows a no-access state with sign-out available

#### Scenario: A client supplies a forged role

- **WHEN** a client changes profile metadata or request parameters to claim ownership
- **THEN** authorization continues to use the stored archive membership and denies unauthorized operations

### Requirement: Contributor blocking

Owners SHALL be able to block Contributors in their archive. After the block commits, subsequent protected reads and writes SHALL fail even with an existing session. Blocking SHALL preserve past contributions, affect only the target archive, and remain effective until explicitly unblocked.

#### Scenario: A contributor is blocked while signed in

- **WHEN** an owner blocks a contributor with a valid existing session
- **THEN** subsequent archive reads and writes from that session are denied
- **AND** the contributor sees a clear no-access state when the application detects the denial
- **AND** previously stored contributions remain intact

#### Scenario: A blocked contributor belongs to another archive

- **WHEN** a contributor blocked in archive A accesses archive B with an active membership
- **THEN** their access to B remains unchanged

### Requirement: Contributor unblocking

Owners SHALL be able to restore a blocked Contributor's existing membership without a new invitation. Invitations SHALL NOT override a block or change an existing member's role.

#### Scenario: An owner unblocks a contributor

- **WHEN** an owner unblocks an archive contributor
- **THEN** that account regains Contributor access to the same archive without accepting another invitation

#### Scenario: An owner tries to invite a blocked address

- **WHEN** an owner invites the address of a blocked contributor
- **THEN** the system leaves the block in place and explains that explicit unblocking is required

### Requirement: Owner membership protection

This release SHALL NOT expose blocking, removal, demotion, or other role-changing operations against existing Owner memberships. Existing contributors SHALL NOT be promoted through a duplicate invitation.

#### Scenario: An owner is targeted for blocking

- **WHEN** any caller attempts to block an Owner membership
- **THEN** the server rejects the operation and preserves the Owner's access
