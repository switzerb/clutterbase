# Product

## Why

Relatives need a simple, invitation-only way to enter their private family archive without remembering another password. Owners need to welcome family members and stop contributor access without requiring access to Supabase administration.

## What Changes

- Add email one-time-code and Google sign-in, session restoration, and sign-out. No passwords or other social providers initially.
- Create one archive and its initial owner through secure setup, not public registration or an archive-creation screen.
- Associate Owner or Contributor roles with individual archive memberships, not accounts globally. Multiple owners may share an archive; the model permits memberships in other archives later.
- Let owners invite an email address as Contributor by default or explicitly as Owner, with a clear privilege warning. Either sign-in method must prove the invited email.
- Provide a simple owner-only invitation screen with Create invitation link, copy, replacement, and cancel. Owners share links themselves by text or email; no email provider is needed for this method. Invitations expire after seven days; replacement invalidates the previous invitation.
- Show a newly created link only in the issuing owner's current result panel. Lost links are replaced rather than retrieved. For hosted testing without an email provider, recipients use their matching Google accounts. Email-code support and local Mailpit testing remain available; production email delivery can follow later.
- Let owners block and unblock contributors in their archive. Blocking denies subsequent reads and writes even for existing sessions, preserves contributions, and cannot be bypassed by another invitation. Unblocking restores membership without another invitation.
- Keep owner blocking/removal, role changes, archive creation, archive switching, and broader membership administration out of scope.
- Continue to label synthetic browsing, uploads, and edits as demonstrations. This milestone does not deliver real archive files, catalog persistence, upload, or review workflows.
- Authentication and invitation failures provide persistent, understandable feedback and a clear recovery action. Retrying must not duplicate memberships or broaden access. Trusted setup supports recovery of an undelivered, lost, or expired initial-owner invitation.

## Capabilities

### New Capabilities

- `user-authentication`: Email-code and Google sign-in, identity continuity, session handling, and understandable authentication outcomes.
- `archive-access`: Archive-scoped roles, secure initial ownership, membership enforcement, contributor blocking, and restoration.
- `archive-invitations`: Owner-only, email-bound shareable links, acceptance, expiry, replacement, and cancellation; optional email delivery.

### Modified Capabilities

- `archive-navigation`: Make browsing-first home conditional on authenticated archive membership and preserve intended destinations through sign-in.

## Target users

- Relatives who enter an invited email code or use their matching Google account to access the archive.
- Contributors who browse and eventually upload, describe, tag, edit, and review shared material, without invitation privileges.
- Owners, including multiple siblings, who share invitation and contributor-access management for the same archive.

## Research Questions

- Confirm the production Supabase project, site URL, Google OAuth credentials, and initial owner's verified email during implementation setup; do not commit secrets or infer these values. Configure production email delivery before enabling hosted email-code or emailed-invitation testing, not as a prerequisite for manually shared links with Google.
- Verify invitation-only admission and same-email identity linking against current Supabase behavior before implementation. A valid authentication session alone must never establish archive access.
