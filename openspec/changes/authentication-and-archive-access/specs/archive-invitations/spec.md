# Specs Delta

## Purpose

Let archive owners admit relatives through email-bound invitations without exposing administrative systems or granting access to unintended accounts.

## ADDED Requirements

### Requirement: Owner-only invitations

Active owners SHALL have a simple invitation screen scoped to their archive. They SHALL enter an email and choose Contributor or Owner, with Contributor selected by default. Inviting an Owner SHALL clearly explain the recipient's invitation and contributor-access management privileges.

#### Scenario: An owner invites a sibling as another owner

- **WHEN** an owner enters a sibling's email, selects Owner, and confirms the privilege notice
- **THEN** an invitation for that email and archive is created with the Owner role

#### Scenario: A contributor attempts to send an invitation

- **WHEN** a contributor requests invitation creation directly or visits the owner screen
- **THEN** the operation is denied without sending email or exposing the invitation list

### Requirement: Email-bound invitation acceptance

Acceptance SHALL require a valid invitation, authentication proving its email address through email code or Google, and an explicit authenticated Accept invitation action. Opening a link or completing sign-in SHALL NOT consume the invitation or establish membership. Successful acceptance SHALL establish exactly one membership with the invitation's archive and role. A forwarded invitation alone SHALL NOT grant access.

#### Scenario: A matching relative accepts

- **WHEN** a relative opens a valid invitation, authenticates its email using either supported method, and explicitly selects Accept invitation
- **THEN** acceptance establishes their membership and opens the archive

#### Scenario: A link is opened without acceptance

- **WHEN** a person or email scanner opens an invitation link, or a relative completes sign-in without selecting Accept invitation
- **THEN** the invitation remains unconsumed and no membership is created

#### Scenario: A forwarded invitation reaches a different account

- **WHEN** an authenticated user attempts acceptance with an email different from the invited address
- **THEN** no membership is created
- **AND** the interface explains the mismatch and offers a way to sign in with the invited address

### Requirement: Invitation expiry

Invitations SHALL expire seven days after issuance. Expired invitations SHALL NOT establish membership. Invitation expiry SHALL be independent of the shorter-lived email authentication code.

#### Scenario: An invitation has expired

- **WHEN** a relative attempts to accept an invitation at or after its expiry
- **THEN** acceptance is denied with a clear explanation to ask an owner for a replacement
- **AND** successful authentication does not override expiry

### Requirement: Pending invitation management

Owners SHALL see invitations for their archive with email, intended role, expiry, and actionable status. They SHALL be able to resend or cancel an unaccepted invitation. Resending SHALL issue a new seven-day invitation and invalidate the old one; cancellation SHALL prevent acceptance.

#### Scenario: An owner resends an invitation

- **WHEN** an owner resends a pending or expired unaccepted invitation
- **THEN** a replacement is issued with a new seven-day lifetime
- **AND** the previous invitation can no longer be accepted

#### Scenario: An owner cancels an invitation

- **WHEN** an owner cancels an unaccepted invitation
- **THEN** later acceptance is denied even if its original expiry has not passed

### Requirement: Safe invitation state transitions

Acceptance SHALL be single-use and safe under retries and concurrent owner actions. Duplicate invitations SHALL NOT create duplicate memberships, overwrite existing roles, or bypass contributor blocks. An invitation's archive and role SHALL NOT be replaceable by the recipient.

#### Scenario: Acceptance is retried

- **WHEN** the same recipient retries a successfully accepted invitation
- **THEN** no duplicate membership or role change occurs

#### Scenario: Cancellation and acceptance race

- **WHEN** cancellation or resend completes before acceptance commits
- **THEN** acceptance of the invalidated invitation creates no membership

#### Scenario: A caller attempts to change the invited role

- **WHEN** a recipient alters an acceptance request to claim Owner instead of Contributor
- **THEN** the membership cannot exceed the stored invitation role

### Requirement: Honest delivery feedback

Invitation operations SHALL distinguish a saved invitation from email delivery failure and SHALL offer an owner an appropriate retry. Secrets and acceptance credentials SHALL NOT be shown in invitation lists or logged as routine application data.

#### Scenario: Invitation email cannot be sent

- **WHEN** invitation creation succeeds but its email provider rejects delivery
- **THEN** the owner sees a persistent delivery-failure state and resend action
- **AND** the application does not claim the email was delivered

### Requirement: Recoverable invitation errors and unknown outcomes

Invitation failures SHALL provide persistent feedback and recovery actions. Service failures SHALL be distinct from invalid invitations; unknown outcomes SHALL NOT be reported as definite success or failure. Retries SHALL reconcile current state without duplicate memberships, role changes, or block overrides.

#### Scenario: A recipient needs a recovery action

- **WHEN** acceptance fails because the account is wrong or the invitation is expired, canceled, or replaced
- **THEN** wrong-account feedback offers account switching
- **AND** expired, canceled, or replaced invitation feedback directs the recipient to request a current invitation

#### Scenario: Acceptance succeeds but its response is lost

- **WHEN** acceptance commits but the recipient does not receive its response
- **THEN** the application offers a safe retry to confirm the result
- **AND** retry creates no duplicate membership and rechecks current access before opening the archive

#### Scenario: An owner operation has an unknown outcome

- **WHEN** an invitation send, resend, or cancel request loses its response
- **THEN** the interface explains that the result could not be confirmed and offers a status refresh or safe retry
- **AND** recovery does not silently issue additional invitations or restore an invalidated credential
