# System Design

## Research / Background

See `prd.md` for motivation and the four delta specs for behavior.

- `src/router/index.ts` defines public archive, item, inbox, family, and upload routes. Its existing guards restore collection context; new authentication guards must preserve that behavior.
- `src/App.vue` always renders `AppHeader` and manages route titles and heading focus. `src/components/layout/AppHeader.vue` has no account or access-management controls.
- `src/data/archive.ts` and existing views provide synthetic demonstrations, not persistent archive records. Real uploads, item data, and private file delivery remain later milestones.
- `package.json` already includes Supabase JS, Vue Router, and Pinia. There is no application Supabase client, authentication store, or migration directory.
- `supabase/config.toml` has public signup enabled, a local mail viewer, no configured production SMTP, and placeholder port-3000 redirect URLs. Configuration must be aligned with actual application origins.
- `wrangler.jsonc` hosts static SPA assets. Put trusted authentication-adjacent operations in Supabase Edge Functions rather than introducing a second application backend in Cloudflare.
- The current Supabase docs support email OTP, Google OAuth, automatic same-email identity linking, and a before-user-created admission hook. Built-in email invitation links share the OTP expiry setting, so they cannot represent an independent seven-day archive admission lifetime.

Documentation reviewed:

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
- https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- https://supabase.com/changelog/supabase-cli-v3

## Assumptions / Decisions / Dependencies

### 1. Supabase authenticates; membership authorizes

Use a single browser Supabase client with the public project URL and publishable key. Maintain explicit initializing, signed-out, authenticated/checking-access, admitted, and no-access states. Never render protected content optimistically while checks run.

Use Supabase email OTP with a code-bearing template, initially six digits, ten-minute expiry, and a sixty-second resend cooldown. Verify first-account and returning-account templates so neither accidentally requires a magic link. Use Google OAuth with PKCE and an allowlisted callback. Preserve only validated relative in-app return destinations; reject scheme-relative and encoded external redirects.

Enable automatic same-verified-email identity continuity, test both provider orders, and leave manual cross-email identity linking disabled. Membership uses the immutable authenticated user ID after acceptance, not a client-supplied email or profile. Email matching for admission uses the server-verified current address, normalized consistently by trimming and case folding; do not strip plus suffixes or Gmail dots.

Alternative rejected: passwords or a separate Google account model, which increase support burden or split memberships.

### 2. Minimal archive-scoped access model

Introduce:

| Record | Essential state |
| --- | --- |
| Archive | Stable UUID and display name |
| Membership | Archive UUID, authenticated user UUID, constrained Owner/Contributor role, active/blocked status, admission email, timestamps |
| Invitation | Archive UUID, normalized email, constrained intended role, token digest, issued/expiry times, pending/accepted/canceled/replaced status, inviter, acceptance identity, delivery outcome |

Use foreign keys, timezone-aware timestamps, uniqueness on `(archive_id, user_id)`, and at most one pending invitation per archive/email. Expiry remains a time comparison, not a scheduled job. Index user membership lookup, archive membership lookup, invitation email/status lookup, token digests, and uncovered foreign keys. Only Contributors can be blocked. Keep a blocked membership instead of deleting accounts or content.

Roles and blocks come from current database membership, not JWT role claims or `user_metadata`, so existing tokens cannot bypass a block. RLS protects exposed tables; explicit grants expose only needed reads. No client gets unrestricted membership or invitation writes. Invitation credentials remain in a non-exposed schema; expose only safe owner-visible status through a narrow interface.

Avoid recursive membership RLS: an own-membership read can be restricted directly by user ID; any policy helper that needs privileged lookups lives in a private schema, checks the authenticated caller, has a fixed search path and narrowly granted execution. Prefer invoker functions; document each justified definer boundary.

Alternative rejected: one global owner flag, which would leak authority across archives, or JWT-only access, which would keep blocked sessions authorized.

### 3. Small trusted operations, transactional authorization

Supabase Edge Functions validate the caller's token with Auth and invoke narrow database operations. Database transactions enforce ownership for the target archive, invariant checks, and state changes together; never rely only on a function's earlier membership read. If privileged credentials are needed, keep them server-side and bind the verified caller identity server-side, never from request input. Expose no generic privileged query or caller-impersonation endpoint.

Owner-only operations: create/resend/cancel invitation, list safe invitation and contributor-management data, block/unblock Contributor. Acceptance requires authentication plus a valid invitation credential, not ownership. Pending role changes are performed only by canceling and issuing a new invitation; existing membership promotion, owner removal, demotion, and blocking remain absent.

Use row locks or equivalent conditional transactional updates for acceptance, cancel, resend, and block. Define a common lock order. Concurrent operations cannot resurrect invalid invitations, overwrite roles, or erase blocks. Duplicate requests are idempotent or return explicit conflicts without silently broadening access.

Alternative rejected: browser Auth Admin API calls or direct browser membership updates.

### 4. Invitations are archive admission, not login credentials

Generate high-entropy invitation credentials server-side and store only digests. Send a link to an invitation landing route. Opening a link is read-only; email scanners must not consume it. Require authenticated, explicit acceptance; match the verified email and stored role/archive inside the transaction. A used credential can return a safe already-accepted result only to its original recipient.

Carry the invitation through email-code sign-in and Google callback in short-lived tab/session state. Remove credentials from visible URLs promptly, suppress referrer leakage and third-party resources on invitation routes, never log tokens, and clear retained credentials after acceptance or terminal failure.

Resend replaces the credential and starts a new seven-day period. Cancel and expiry deny acceptance even if the recipient already has an authentication session. Do not infer that all pending invitations can be accepted just because someone signed in: acceptance must validate the specific current invitation.

Store pending state before attempting delivery. Use a transactional email provider for archive invitations and production SMTP for Supabase codes; one provider can supply both. Report provider acceptance rather than claiming inbox delivery; preserve failed-send status for resend. Secrets, sender identity, and provider account are deployment inputs, not browser configuration. Apply owner-send limits and code-request/verification throttles.

Alternative rejected: Supabase's built-in Auth invitation lifecycle as the archive invitation source of truth, because its email-token expiry couples admission to OTP expiry and it does not model archive-specific roles, cancel, and replacement.

### 5. Invitation-only account admission and secure setup

Install a before-user-created hook that permits a new email/Google account only for an unexpired pending invitation and otherwise denies creation. Grant the hook only the minimal lookup privilege. This is defense in depth: acceptance still rechecks invitation state and verified identity, including cancellation between account creation and acceptance. Existing authenticated nonmembers still receive no archive access.

The public code-request boundary normalizes account-admission failures into non-enumerating feedback while retaining useful service/rate-limit failures. Do not claim the existence of an invitation from a code request.

Trusted, repeatable setup creates the single archive and a bootstrap Owner invitation for the operator-confirmed email. This bypasses the normal owner prerequisite only through an operator-only setup path, never a public first-user rule. Ownership is granted only after normal verified acceptance. Setup must not reset roles, unblock people, or issue duplicate bootstrap ownership on rerun.

### 6. Simple interface and honest scope

Add login/code-entry, OAuth callback, invitation acceptance, and no-access routes; add an owner-only access-management page listing invitations and contributors with block/unblock controls. Clearly show archive name, role, pending invitation expiry, delivery errors, and the significance of inviting an Owner. Use existing accessible controls, typography, heading focus, persistent feedback, and system theme.

No archive switcher, last-used selection, archive creation, ownership editing, or account-email management UI in this release. The membership model supports later multiple archives, but the release resolves one configured archive. Test cross-archive authorization using private fixtures, not new product UI.

On sign-out, identity change, or detected access denial, clear member-specific state and hide protected views. Refresh current access on protected navigation and app resume; server checks remain authoritative on every operation. A block cannot retract previously downloaded or displayed material. The guarantee begins with requests authorized after the block transaction commits; already in-flight work or pixels are not remotely erased.

Keep synthetic fixtures and existing demo notices. This milestone proves boundaries on real archive/membership/invitation records and operations; it must not claim that future item persistence or storage is already protected. Future catalog and storage implementations must reuse live membership checks before private material is introduced.

## Risks / Trade-offs

- [Authentication succeeds while admission expires or is canceled] -> Recheck admission transactionally; show no-access or invitation-expired state rather than auto-admitting.
- [Lost or stolen invitation email] -> Require the matching verified address as well as the invitation credential; single-use, replacement, expiry, and cancellation limit reuse.
- [Role escalation or stale authorization] -> Database-owned roles, live membership predicates, protected mutation boundaries, and tests using retained pre-block tokens.
- [Privileged function bypass] -> Narrow caller-validated operations, private helpers, explicit execution grants, adversarial direct-call tests, and security advisors.
- [Production email unavailable] -> Treat working SMTP, code templates, sender verification, and invitation delivery as release gates. New Free Supabase projects using default SMTP cannot customize code templates.
- [Google credentials or redirect misconfiguration] -> Verify local and hosted callbacks, consent configuration, and both sign-in orderings before release.
- [SPA token exposure through XSS] -> Keep privileged secrets out of the browser; avoid untrusted HTML and unnecessary third-party scripts; do not store invitation credentials longer than needed.
- [Owners cannot be removed in this release] -> Warn before issuing Owner invitations; retain operator recovery as an operational responsibility rather than adding owner-management UI.
- [Broader milestones mistaken as complete] -> Limit acceptance claims to authentication/access; real files, persistent catalog edits, review, and switching remain deferred.

## Migration plan

1. During implementation, inspect local and target database state before authoring migrations; the repository alone does not establish hosted schema state. Follow the existing imperative migration approach and installed CLI help. CLI v3 defaults locally; hosted changes require explicit targeting and separate approval.
2. Develop and test locally using synthetic accounts and the local mail viewer. Apply schema, indexes, grants, RLS, and trusted operations before exposing the frontend. Never seed real family credentials into committed fixtures.
3. Configure the admission hook, email-code templates, production SMTP, invitation sender, Google OAuth, exact allowed origins/callbacks, and function secrets. Look up the target API URL/publishable key rather than assuming existing environment values.
4. Run operator setup for the approved archive name and first-owner email. Verify first-owner email-code and Google sign-in, then invite a second Owner and a Contributor and test block/unblock with an already-issued token.
5. Deploy the authenticated frontend only after local security tests and hosted smoke checks pass. Retain evidence in ignored local artifacts; do not add a parallel documentation catalog.
6. If rollout fails, put the application into a closed/maintenance state and disable failing entrypoints. Preserve memberships, block records, invitation invalidations, and migrations. Do not roll back to an unauthenticated frontend against private data or loosen RLS as a workaround.

## Open questions

- Deployment inputs: production Supabase project, archive display name, initial-owner email, canonical application origin, Google credentials, and transactional email account/sender. Confirm these with the operator before deployment; the architecture and scope do not depend on their particular values.
