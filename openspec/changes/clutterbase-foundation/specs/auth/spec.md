## ADDED Requirements

### Requirement: Only authenticated users can access the application
The system SHALL require authentication before any data, files, or pages are accessible. Unauthenticated requests SHALL be redirected to the sign-in page.

#### Scenario: Unauthenticated access redirected
- **WHEN** an unauthenticated user navigates to any protected route
- **THEN** the system redirects them to the sign-in page

#### Scenario: Authenticated user accesses protected route
- **WHEN** a user with a valid session navigates to any protected route
- **THEN** the system renders the requested page

### Requirement: Users can sign in with email
The system SHALL support email-based authentication. Users SHALL be able to sign in via magic link (passwordless) or email/password.

#### Scenario: Magic link sign-in
- **WHEN** a user enters their email and requests a magic link
- **THEN** the system sends a sign-in link to that email and displays a confirmation message

#### Scenario: Email/password sign-in
- **WHEN** a user enters valid email and password credentials
- **THEN** the system creates an authenticated session and redirects to the gallery

#### Scenario: Invalid credentials
- **WHEN** a user submits incorrect credentials
- **THEN** the system displays an error message without revealing whether the email exists

### Requirement: Users can sign in with Google
The system SHALL support Google OAuth as a sign-in option. Users SHALL be able to authenticate using their Google account.

#### Scenario: Google sign-in
- **WHEN** a user clicks "Sign in with Google"
- **THEN** the system redirects them to Google's OAuth flow and, on success, creates an authenticated session and redirects to the gallery

### Requirement: Admin role controls sensitive operations
The system SHALL support an admin role. Admin users SHALL be able to manage family members (invite, remove) and manage tag categories. Non-admin authenticated users SHALL not have access to admin functions.

#### Scenario: Admin accesses user management
- **WHEN** an admin user navigates to the admin panel
- **THEN** the system displays user management and tag category management options

#### Scenario: Non-admin blocked from admin functions
- **WHEN** a non-admin authenticated user attempts to access admin-only routes or actions
- **THEN** the system returns an unauthorized response

### Requirement: Users can sign out
The system SHALL allow authenticated users to end their session. Signing out SHALL invalidate the current session and redirect to the sign-in page.

#### Scenario: User signs out
- **WHEN** an authenticated user clicks "Sign out"
- **THEN** the system invalidates their session and redirects them to the sign-in page

### Requirement: All data is scoped to an organization
The system SHALL isolate all data (items, people, tags, family units) by organization. Users SHALL only see and interact with data belonging to their organization. An organization represents a family or other group sharing the archive.

#### Scenario: User sees only their organization's data
- **WHEN** an authenticated user views any list or detail page
- **THEN** only records belonging to the user's organization are returned

#### Scenario: User cannot read another organization's data
- **WHEN** an authenticated user queries any data table
- **THEN** row-level security filters results to the user's organization_id from their JWT

#### Scenario: Admin invites a new user
- **WHEN** an admin sends an email invitation
- **THEN** the invited user is automatically assigned to the admin's organization upon account creation

### Requirement: Sessions persist across browser sessions
The system SHALL maintain authenticated sessions so users do not need to sign in on every visit.

#### Scenario: Returning authenticated user
- **WHEN** a user with a valid persisted session opens the application
- **THEN** the system grants access without requiring re-authentication

#### Scenario: Expired session
- **WHEN** a user's session has expired
- **THEN** the system redirects them to the sign-in page
