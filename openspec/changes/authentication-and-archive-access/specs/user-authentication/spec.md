# Specs Delta

## Purpose

Let invited relatives authenticate without passwords and use the same account through email codes or Google.

## ADDED Requirements

### Requirement: Email-code sign-in

The application SHALL let a user request and enter an emailed one-time code to authenticate control of their email address. Codes SHALL expire, be single-use, and have rate-limited resend and verification behavior. Passwords SHALL NOT be required.

#### Scenario: An invited relative enters a valid code

- **WHEN** a relative requests a code for their invited email and enters a valid code
- **THEN** the application establishes a session and checks archive admission
- **AND** no password setup or email-link navigation is required

#### Scenario: A code cannot be used

- **WHEN** a user submits an incorrect, expired, or previously used code
- **THEN** authentication fails with an understandable message and a way to retry or request another code
- **AND** a rate-limited request explains when retry is available

### Requirement: Google sign-in

The application SHALL offer Continue with Google as an alternative to email-code sign-in. A Google session SHALL NOT by itself grant archive access.

#### Scenario: An invited Google address signs in

- **WHEN** a relative completes Google authentication using the invited email
- **THEN** the application establishes a session and checks archive admission for that verified address

#### Scenario: A different Google account is selected

- **WHEN** a relative signs in using a Google address with no active membership or valid invitation
- **THEN** the application denies archive access
- **AND** offers sign-out or a way to use the invited address without exposing archive content

#### Scenario: Google authentication is canceled or fails

- **WHEN** Google authentication is canceled or cannot complete
- **THEN** the application provides an understandable recovery state with email-code sign-in still available

### Requirement: Same-email identity continuity

Email-code and Google authentication for the same verified email SHALL resolve to the same application account and memberships. Different email addresses SHALL NOT be automatically treated as the same person. Display names and user-editable profile information SHALL NOT establish access.

#### Scenario: A contributor changes sign-in method

- **WHEN** an existing email-code contributor later signs in with Google using the same verified email
- **THEN** their existing membership and role are retained without duplicate membership or another invitation

#### Scenario: Google is used before email codes

- **WHEN** an existing Google contributor signs in using an email code for the same verified address
- **THEN** their existing account and membership are retained

### Requirement: Session lifecycle

The application SHALL restore valid sessions on reload, support sign-out, and deny protected content while session or membership checks are unresolved. Session expiry SHALL return the user to authentication. Sign-out SHALL clear application-held private state.

#### Scenario: A member reloads

- **WHEN** an active member reloads with a valid session
- **THEN** the application checks current membership before rendering the archive

#### Scenario: A user signs out

- **WHEN** a signed-in user selects Sign out
- **THEN** protected content and application-held private state are cleared
- **AND** protected routes require authentication again, including through browser Back

#### Scenario: Membership cannot be checked

- **WHEN** membership verification fails due to a network or service error
- **THEN** the application denies protected content and offers retry rather than assuming access

### Requirement: Private and accessible authentication feedback

Sign-in screens SHALL provide labeled, keyboard-operable controls, visible focus, and persistent status feedback. Unauthenticated code requests SHALL NOT disclose whether an email has membership or an invitation.

#### Scenario: An unknown email requests a code

- **WHEN** an unauthenticated visitor requests a code for an uninvited address
- **THEN** the response does not disclose archive membership or invitation status
- **AND** the request does not grant archive access
