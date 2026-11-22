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

| Record     | Essential state                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Archive    | Stable UUID and display name                                                                                                                                                            |
| Membership | Archive UUID, authenticated user UUID, constrained Owner/Contributor role, active/blocked status, admission email, timestamps                                                           |
| Invitation | Archive UUID, normalized email, constrained intended role, token digest, issued/expiry times, pending/accepted/canceled/replaced status, inviter, acceptance identity, delivery outcome |

Use foreign keys, timezone-aware timestamps, uniqueness on `(archive_id, user_id)`, and at most one pending invitation per archive/email. Expiry remains a time comparison, not a scheduled job. Index user membership lookup, archive membership lookup, invitation email/status lookup, token digests, and uncovered foreign keys. Only Contributors can be blocked. Keep a blocked membership instead of deleting accounts or content.

Roles and blocks come from current database membership, not JWT role claims or `user_metadata`, so existing tokens cannot bypass a block. RLS protects exposed tables; explicit grants expose only needed reads. No client gets unrestricted membership or invitation writes. Invitation credentials remain in a non-exposed schema; expose only safe owner-visible status through a narrow interface.

Avoid recursive membership RLS: an own-membership read can be restricted directly by user ID; any policy helper that needs privileged lookups lives in a private schema, checks the authenticated caller, has a fixed search path and narrowly granted execution. Prefer invoker functions; document each justified definer boundary.

Alternative rejected: one global owner flag, which would leak authority across archives, or JWT-only access, which would keep blocked sessions authorized.

### 3. Small trusted operations, transactional authorization

Supabase Edge Functions validate the caller's token with Auth and invoke narrow database operations. Database transactions enforce ownership for the target archive, invariant checks, and state changes together; never rely only on a function's earlier membership read. If privileged credentials are needed, keep them server-side and bind the verified caller identity server-side, never from request input. Expose no generic privileged query or caller-impersonation endpoint.

Owner-only operations: create/resend/cancel invitation, list safe invitation and contributor-management data, block/unblock Contributor. Acceptance requires authentication plus a valid invitation credential, not ownership. Pending role changes are performed only by canceling and issuing a new invitation; existing membership promotion, owner removal, demotion, and blocking remain absent.

Use row locks or equivalent conditional transactional updates for acceptance, cancel, resend, and block. Define a common lock order. Concurrent operations cannot resurrect invalid invitations, overwrite roles, or erase blocks. Duplicate requests are idempotent or return explicit conflicts without silently broadening access.

For invitation create/resend operations, bind a retry identifier to the verified caller, operation, archive, and request parameters. Record the operation result transactionally with the state change; reject reuse with different parameters. A retry confirms the existing result rather than issuing another credential or initiating another send. Cancel and acceptance retries reconcile current state. An already-accepted result is not authorization: recheck live membership before opening the archive.

Alternative rejected: browser Auth Admin API calls or direct browser membership updates.

Membership foundation contract: `contributor-access` accepts POST `{ archiveId, userId, blocked }`, verifies the caller with Auth, and calls the invoker RPC `set_contributor_block` with that caller's JWT. The RPC delegates only its constrained mutation to a private definer function. No caller ID or role can be supplied. Stable outcomes are `confirmed`, `authentication_required`, `invalid_request`, `owner_required`, `owner_protected`, `membership_not_found`, `service_unavailable`, and `unconfirmed`. Repeating the same desired block state is idempotent. The archive row is locked before membership rows; invitation mutations must use this same order. Private current-user archive/ownership lookup functions avoid recursive RLS, have fixed empty search paths and explicit execution grants, and never accept a caller identity. Members read their own active memberships; owners also read their archive's memberships for access management.

### 4. Invitations are archive admission, not login credentials

Generate high-entropy invitation credentials server-side and store only digests. Send a link to an invitation landing route. Opening a link is read-only; email scanners must not consume it. Require authenticated, explicit acceptance; match the verified email and stored role/archive inside the transaction. A used credential can return a safe already-accepted result only to its original recipient.

Carry the invitation through email-code sign-in and Google callback in short-lived tab/session state. Remove credentials from visible URLs promptly, suppress referrer leakage and third-party resources on invitation routes, never log tokens, and clear retained credentials after acceptance or terminal failure.

Resend replaces the credential and starts a new seven-day period. Cancel and expiry deny acceptance even if the recipient already has an authentication session. Do not infer that all pending invitations can be accepted just because someone signed in: acceptance must validate the specific current invitation.

Store pending state before attempting delivery. Use a transactional email provider for archive invitations and production SMTP for Supabase codes; one provider can supply both. Report provider acceptance rather than claiming inbox delivery; preserve failed-send status for resend. Secrets, sender identity, and provider account are deployment inputs, not browser configuration. Apply owner-send limits and code-request/verification throttles.

Track delivery per invitation issuance so a late response cannot overwrite a replacement's status. A provider timeout or interrupted send may leave delivery unknown; do not label it a definite failure or automatically send again. Reconcile with the provider where supported. Otherwise show the unknown outcome and let the owner explicitly resend, replacing the credential. Retain digest-only credential storage; a retry must not depend on recovering a stored plaintext token.

Alternative rejected: Supabase's built-in Auth invitation lifecycle as the archive invitation source of truth, because its email-token expiry couples admission to OTP expiry and it does not model archive-specific roles, cancel, and replacement.

Local invitation contract: `archive-invitations` accepts POST actions `create`, `resend`, `list`, `cancel`, and `accept`. Create/resend take `archiveId`, `email`, `role`, and a UUID `retryId`; resend additionally takes `replacesId`. List takes `archiveId`; cancel also takes `invitationId`; accept takes only the raw `token`. Unknown fields are rejected. Issuance generates 32 random bytes and stores only SHA-256 digests in private tables. The Edge Function binds Auth's verified caller ID when invoking service-role-only issuance; user-scoped list/cancel/accept RPCs independently authorize through `auth.uid()`. Public RPC wrappers are invokers; all definer bodies remain private.

Issuance locks a caller/retry advisory key before the archive row, then checks current ownership and an exact normalized parameter fingerprint. A retry returns current issuance status without sending again; changed parameters return `retry_conflict`. Twenty new issuances per caller per hour are allowed (retries do not count). All lifecycle mutations then serialize on the archive row before invitation or membership rows. Acceptance returns `accepted`, `already_accepted`, `verified_identity_required`, `invalid_invitation`, `wrong_account`, `replaced`, `canceled`, `expired`, `membership_exists`, `member_blocked`, or `no_access`. Already-accepted retries recheck live membership. Cancel retries return current status, including a competing acceptance. Owner conflicts include `invitation_exists`, `invitation_not_pending`, `replacement_mismatch`, and `send_rate_limited`. Network/unknown service errors return `unconfirmed`, never credential failure.

Local delivery uses Mailpit's HTTP send API through an injectable adapter; 2xx means provider acceptance, definite 4xx rejection (except timeout) means rejected, and timeouts/5xx/interruption mean unknown. Each issuance is saved as unknown before sending. Only the creating request sends; retry cannot recover or resend a plaintext credential. Late delivery updates affect only that pending issuance and cannot update its replacement. Invitation links carry credentials in the URL fragment. `APP_ORIGIN` and `INVITATION_MAILPIT_URL` configure local delivery. A hosted transactional provider adapter, sender, and SMTP credentials remain release configuration work; the local-only adapter fails closed outside the local stack.

### 5. Invitation-only account admission and secure setup

Install a before-user-created hook that permits a new email/Google account only for an unexpired pending invitation and otherwise denies creation. Grant the hook only the minimal lookup privilege. This is defense in depth: acceptance still rechecks invitation state and verified identity, including cancellation between account creation and acceptance. Existing authenticated nonmembers still receive no archive access.

The application's code-request boundary normalizes account-admission failures into generic feedback while retaining useful service/rate-limit failures. Do not claim the existence of an invitation from a code request. This is an application-feedback guarantee, not a guarantee against eligibility disclosure through Supabase's public Auth API. The project URL and publishable key are public, and direct Auth requests can expose admission-hook rejection differences. Test those direct requests to verify account-creation enforcement and document observable behavior without claiming universal non-enumeration.

Trusted, repeatable setup creates the single archive and a bootstrap Owner invitation for the operator-confirmed email. This bypasses the normal owner prerequisite only through an operator-only setup path, never a public first-user rule. Ownership is granted only after normal verified acceptance. Setup must not reset roles, unblock people, or issue duplicate bootstrap ownership on rerun.

Provide an explicit operator-only recovery action for an undelivered, lost, or expired bootstrap invitation before initial ownership is established. Keep the configured archive and approved recipient; replace the credential with a new seven-day invitation and report delivery separately. Serialize recovery with acceptance so an accepted bootstrap invitation cannot be replaced. Ordinary setup reruns do not rotate credentials. After initial ownership is established, setup and recovery create no further bootstrap invitations or memberships. Test failed delivery, expiry, lost links, concurrent acceptance/recovery, and reruns after acceptance.

Local setup: `vpx scripts/setup-local-archive.mjs "Archive name" owner@example.test` uses only CLI-discovered loopback credentials and sends the first-owner invitation to Mailpit. Add `--recover` only for an explicit replacement. The service-role-only `setup_archive` RPC serializes a singleton bootstrap record, preserves the configured archive/email, and locks the archive before changing its invitation. Normal reruns return `pending` or `established` without another send. Neither RPC grants membership; acceptance still requires verified identity.

The invoker `private.before_user_created` hook grants `supabase_auth_admin` only the email/status/expiry lookup columns under a pending/unexpired RLS policy. Email and Google admission use the same hook; other providers and anonymous creation are denied. `request-code` is the public application boundary: it relays OTP requests without a privileged key and maps admission denial and successful requests to identical `code_requested` feedback. Service failures remain `unconfirmed`; rate limits use actual `Retry-After` when provided. Direct local Auth calls observably return HTTP 403 for uninvited creation, so the generic-feedback claim remains application-only.

Local code templates for both first-account confirmation and returning-account magic-link events contain six-digit codes, ten-minute expiry, and no required link. Resend cooldown is sixty seconds. Local mail quota is 100/hour for synthetic testing. Application callbacks are `http://localhost:5173/auth/callback` and `http://127.0.0.1:5173/auth/callback`; Google's provider callback is `http://127.0.0.1:54321/auth/v1/callback`. Google credentials remain unconfigured and its provider disabled until supplied. Request only `openid email profile`, use PKCE in the browser, and keep manual linking disabled. Hook-level tests cover both provider labels, but real Google sign-in, same-email identity continuity, and hosted admission tests remain release gates.

### 6. Simple interface and honest scope

Add login/code-entry, OAuth callback, invitation acceptance, and no-access routes; add an owner-only access-management page listing invitations and contributors with block/unblock controls. Clearly show archive name, role, pending invitation expiry, delivery errors, and the significance of inviting an Owner. Use existing accessible controls, typography, heading focus, persistent feedback, and system theme.

No archive switcher, last-used selection, archive creation, ownership editing, or account-email management UI in this release. The membership model supports later multiple archives, but the release resolves one configured archive. Test cross-archive authorization using private fixtures, not new product UI.

On sign-out, identity change, or detected access denial, clear member-specific state and hide protected views. Refresh current access on protected navigation and app resume; server checks remain authoritative on every operation. A block cannot retract previously downloaded or displayed material. The guarantee begins with requests authorized after the block transaction commits; already in-flight work or pixels are not remotely erased.

Keep synthetic fixtures and existing demo notices. This milestone proves boundaries on real archive/membership/invitation records and operations; it must not claim that future item persistence or storage is already protected. Future catalog and storage implementations must reuse live membership checks before private material is introduced.

Implemented frontend boundaries: the session store owns verified identity, current archive access, and generation-based stale-request protection. Protected navigation and focus/pageshow/visibility resume recheck access. Private views are hidden during checks and discarded on denial or identity change; public authentication forms retain their lifecycle through reconciliation. The browser client is lazy, PKCE-based, and accepts only a publishable key. `VITE_ARCHIVE_ID` selects the configured archive when more than one membership exists.

The invitation route captures a 32-byte hexadecimal fragment credential before rendering and replaces the visible route with `/invitation`. A dedicated credential module retains it in tab-scoped session storage (memory fallback) for at most thirty minutes without extending expiry on reads. Explicit account switching preserves it; normal sign-out, confirmed acceptance, and terminal outcomes clear it. Neither email-code completion nor Google callback accepts an invitation. Acceptance rechecks live membership before navigation.

The owner screen composes an invitation form, invitation statuses/actions, and protected member controls. Owner invitations require a privilege acknowledgement. Unknown create/resend/cancel outcomes retain the exact request and retry identifier; block retries retain the desired boolean rather than toggling current state. Status refresh never sends mail. Server owner/authentication denial clears protected lists and exits the screen.

### 7. Clear errors and safe recovery

Map operation results to stable application outcomes and persistent, accessible feedback. Do not display raw provider errors or invitation credentials. Keep service failures distinct from invalid credentials and denied access.

| Outcome                                   | Feedback and next action                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Incorrect, expired, or reused code        | Explain that the code cannot be used; offer another attempt or a new code                      |
| Rate limit                                | Explain the wait and show retry timing when supplied by the service; do not invent a countdown |
| Google canceled or failed                 | Offer another attempt or email-code sign-in                                                    |
| Wrong invitation account                  | Offer account switching while retaining the invitation for the intended recipient              |
| Expired, canceled, or replaced invitation | Explain that a current invitation is needed and direct the recipient to an Owner               |
| Blocked or missing membership             | Show no-access and sign-out; invitation retries cannot override the denial                     |
| Network or service failure                | Explain that the result could not be confirmed; offer retry without assuming access            |
| Delivery rejected or unknown              | Show the saved invitation and its separate delivery outcome; offer explicit replacement/resend |

When an authentication response is lost, reconcile session state and recheck current access before rendering protected content. Do not automatically request another code. When invitation acceptance loses its response, retain the short-lived credential for a safe retry; clear it only after a confirmed success or terminal outcome. Owner operations refresh safe server status or retry the same operation identifier before offering a new mutation. Preserve explicit Accept invitation as a separate action after sign-in.

## Risks / Trade-offs

- [Authentication succeeds while admission expires or is canceled] -> Recheck admission transactionally; show no-access or invitation-expired state rather than auto-admitting.
- [Lost or stolen invitation email] -> Require the matching verified address as well as the invitation credential; single-use, replacement, expiry, and cancellation limit reuse.
- [Role escalation or stale authorization] -> Database-owned roles, live membership predicates, protected mutation boundaries, and tests using retained pre-block tokens.
- [Privileged function bypass] -> Narrow caller-validated operations, private helpers, explicit execution grants, adversarial direct-call tests, and security advisors.
- [Production email unavailable] -> Treat working SMTP, code templates, sender verification, and invitation delivery as release gates. New Free Supabase projects using default SMTP cannot customize code templates.
- [Response lost after an operation succeeds] -> Report an unknown outcome, reconcile server state, and retry without duplicating admission or sending another invitation implicitly.
- [Initial-owner invitation unusable] -> Use the operator-only replacement path before ownership is established; preserve the archive and approved recipient.
- [Admission eligibility observable through direct Auth requests] -> Use generic application feedback, test direct endpoints, and explicitly limit the privacy guarantee.
- [Google credentials or redirect misconfiguration] -> Verify local and hosted callbacks, consent configuration, and both sign-in orderings before release.
- [SPA token exposure through XSS] -> Keep privileged secrets out of the browser; avoid untrusted HTML and unnecessary third-party scripts; do not store invitation credentials longer than needed.
- [Owners cannot be removed in this release] -> Warn before issuing Owner invitations; retain operator recovery as an operational responsibility rather than adding owner-management UI.
- [Broader milestones mistaken as complete] -> Limit acceptance claims to authentication/access; real files, persistent catalog edits, review, and switching remain deferred.

## Migration plan

The operator confirmed the existing Clutterbase project (`hbshdkyfzefwskokwiyf`) as the eventual hosted target and all previous-attempt data, accounts, and files as disposable. Read-only inspection found ten legacy public tables, six non-extension public functions, two Auth users, eighteen Storage objects in private `originals`/`thumbnails` buckets, and no deployed Edge Functions. The legacy organization-based model is not the new archive-membership baseline.

1. Develop locally first. Inspect the existing local schema before changing it; retain the hosted inventory as reset context rather than importing its obsolete schema. Follow the imperative migration approach and installed CLI help. Record every new database change in version-controlled migrations and verify replay against a clean local database.
2. Use synthetic accounts and the local mail viewer. Apply schema, indexes, grants, RLS, and trusted operations before exposing the frontend. Never seed real family credentials into committed fixtures. Local accounts and files are test fixtures, not data to synchronize to production.
3. Keep the hosted project unchanged during local implementation. At the release stage, refresh its inventory, reset the disposable legacy application setup, apply the locally tested migrations, and deploy Edge Functions. Retain the project itself and use the supported Auth and Storage APIs for account/file cleanup. Hosted execution remains explicitly targeted and requires release approval.
4. Configure the admission hook, email-code templates, production SMTP, invitation sender, Google OAuth, exact allowed origins/callbacks, and function secrets. Look up the target API URL/publishable key rather than assuming existing environment values. Real Google verification requires operator-supplied OAuth credentials even when testing locally; adapter tests do not substitute for that release gate.
5. Run operator setup for the approved archive name and first-owner email. Verify bootstrap invitation recovery before acceptance and harmless reruns after acceptance. Verify first-owner email-code and Google sign-in, then invite a second Owner and a Contributor and test block/unblock with an already-issued token. Exercise lost-response recovery and direct Auth admission checks.
6. Deploy the authenticated frontend only after local security tests and hosted smoke checks pass. Retain evidence in ignored local artifacts; do not add a parallel documentation catalog.
7. If rollout fails, put the application into a closed/maintenance state and disable failing entrypoints. Preserve memberships, block records, invitation invalidations, and migrations. Do not roll back to an unauthenticated frontend against private data or loosen RLS as a workaround.

## Open questions

- Remaining deployment inputs: archive display name, initial-owner email, canonical application origin, Google credentials, and transactional email account/sender. Confirm these with the operator before deployment; the architecture and scope do not depend on their particular values.
