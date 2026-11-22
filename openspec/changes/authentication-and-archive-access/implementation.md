# Implementation

These approved, one-ticket-per-task boundaries are published under [milestone 2: Authentication and Authorization](https://github.com/switzerb/clutterbase/milestone/2). Completion is tracked below. Requirements live in `specs/`; architecture and deployment constraints live in `design.md`. Keep implementation discoveries in this change and verification evidence in ignored local artifacts, not a new `docs/` catalog.

Tasks 1.1–6.1 record completion of the original local email-delivery implementation. Task 6.2 (#35) adds locally verified manual sharing. Hosted release verification remains in 7.1.

## GitHub tracking

| Task | Issue                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------- |
| 1.1  | [#28 — Establish archive scoped memberships and authorization](https://github.com/switzerb/clutterbase/issues/28) |
| 2.1  | [#29 — Implement secure archive invitations and delivery](https://github.com/switzerb/clutterbase/issues/29)      |
| 3.1  | [#30 — Configure invited authentication and owner bootstrap](https://github.com/switzerb/clutterbase/issues/30)   |
| 4.1  | [#31 — Add passwordless sign in and navigation](https://github.com/switzerb/clutterbase/issues/31)                |
| 5.1  | [#32 — Add verified invitation acceptance for relatives](https://github.com/switzerb/clutterbase/issues/32)       |
| 6.1  | [#33 — Add simple owner access management controls](https://github.com/switzerb/clutterbase/issues/33)            |
| 6.2  | [#35 — Add manually shared archive invitation links](https://github.com/switzerb/clutterbase/issues/35)           |
| 7.1  | [#34 — Verify authentication and archive access release](https://github.com/switzerb/clutterbase/issues/34)       |

Dependency outline:

```text
1.1 --> 2.1 --> 3.1
 |        |       |
 |        +---+---+
 v            v
4.1 -------> 5.1
 |            |
 +--> 6.1 <---+
        |
        v
       6.2
        |
        v
       7.1
```

Tasks 3.1 and 4.1 can proceed in parallel after their prerequisites. Tasks 5.1 and 6.1 can proceed in parallel once their shared API and session contracts exist; the diagram's 5.1-to-6.1 relationship denotes final integration, not a requirement to serialize their UI work. Do not deploy until 7.1's release gates pass.

Task 6.2 depends on the verified invitation, acceptance, and owner-control foundations (2.1, 5.1, 6.1). It precedes manual-mode hosted verification in 7.1. Provider-free Google testing may precede production email setup, but it does not complete the full email-code/Google release checklist.

## 1. Membership foundation

- [x] 1.1 Establish archive memberships and access enforcement; verify local migrations, uniqueness and role constraints, RLS/grants, cross-archive isolation, retained-token blocking, and owner-protection tests pass.

```markdown
# Establish archive scoped memberships and authorization

**Status:** Complete (local verification)
**Type:** Feature
**Priority:** Medium
**Dependencies:** None

## Summary

Create the minimal archive and membership foundation so identity alone never grants access. Support multiple owners per archive without introducing archive creation or switching UI.

## Acceptance Criteria

- Inspect existing local schema before changing it; use the recorded hosted legacy inventory as reset context, not the new baseline. Implement and verify locally; hosted cleanup is deferred to 7.1.
- Keep database changes in version-controlled migrations and verify replay against a clean local database.
- Migrations establish archive/membership identity, constrained roles and block state, uniqueness, indexes, explicit grants, and RLS.
- Active Owners and Contributors can read authorized archive information. Nonmembers, signed-out users, and blocked users cannot obtain protected archive data.
- Narrow owner-only block/unblock operations preserve memberships and reject Owner targets.
- Database/API tests cover forged profile roles, direct mutations, cross-archive identifier substitution, two owners, blocked existing tokens, and restoration without another invitation.
- Tests establish the access contract without adding production item/storage features. Future private data is not claimed protected by tests that cover only membership records.

## Assumptions / Decisions / Constraints

- Follow `archive-access` and design decisions 2–3. Live membership, not stale token claims, determines access.
```

## 2. Invitation lifecycle

- [x] 2.1 Implement trusted invitation lifecycle and delivery; verify matching-email acceptance, owner-only administration, seven-day expiry, resend/cancel, lost-response recovery, safe retry/concurrency, role protection, and rejected/unknown delivery tests pass.

```markdown
# Implement secure archive invitations and delivery

**Status:** Complete (local verification)
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1

## Summary

Give owners reliable archive-specific invitations, independent of authentication-code expiry, through narrow trusted operations.

## Acceptance Criteria

- Owners can create Contributor or Owner invitations and list safe status information only for archives they own.
- Invitations expire after seven days. Resend replaces the old credential; cancellation invalidates it.
- Acceptance validates the authenticated, verified email and current invitation inside a transaction, then establishes one membership using the stored archive and role.
- Blocked or existing memberships cannot be overwritten, promoted, or unblocked by invitation.
- Tokens are high-entropy, digest-only at rest, absent from status responses and routine logs, and not consumed by opening links.
- Tests cover credential tampering, mismatched email, exact expiry, repeated acceptance, concurrent acceptance/cancel/resend, duplicate sends, blocked addresses, and contributor/foreign-owner direct calls.
- Create/resend retries confirm the existing operation without issuing another credential or initiating another send. Retry identifiers are scoped to the verified caller, operation, archive, and request parameters; changed parameters are rejected.
- Acceptance and cancel retries reconcile current state. Test a committed acceptance with a lost response, including a subsequent block; an already-accepted result must not bypass current access checks.
- A testable delivery adapter distinguishes provider acceptance, rejection, and unknown outcomes. Failed and unknown sends remain visible and recoverable through explicit replacement/resend.
- Tests cover provider timeouts, interruption after saving an invitation, and late delivery responses after replacement. Recovery preserves digest-only credential storage and cannot overwrite a replacement's delivery status.
- Record operation contracts, stable error outcomes, retry behavior, and concurrency decisions in this change.

## Assumptions / Decisions / Constraints

- Follow `archive-invitations` and design decisions 3–4 and 7. Provider credentials remain server-only.
```

## 3. Authentication admission and setup

- [x] 3.1 Configure invitation-only authentication and repeatable owner setup; verify local email-code flows, direct Auth admission checks, generic application feedback, duplicate-safe bootstrap acceptance, and operator-only invitation recovery.

```markdown
# Configure invited authentication and owner bootstrap

**Status:** Complete (local email-code and hook verification; real Google release checks pending 7.1)
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1, 2.1

## Summary

Permit invited accounts to authenticate with email codes or Google, and securely establish the first Owner without a public ownership-claim path.

## Acceptance Criteria

- New-account admission requires an unexpired pending invitation through a server-enforced hook. Test both supported methods, including requests outside the application. Creating an account does not accept an invitation; acceptance still fails if it expires or is canceled afterward.
- Application code-request feedback does not reveal invitation or membership existence. Test invalid, expired, reused, and rate-limited codes. Record what direct public Auth requests reveal; do not claim they prevent eligibility disclosure.
- Both initial and returning email templates show a code, not a required magic link. Apply the design's initial code expiry and resend cooldown.
- Configure local and hosted callback contracts, Google scopes, PKCE support, and secret references without committing credentials.
- Trusted setup creates one archive and one first-owner invitation for an operator-approved email. Acceptance still requires verified identity and an explicit action.
- An operator-only recovery action replaces an undelivered, lost, or expired bootstrap invitation before ownership is established. It retains the archive and approved email, invalidates the old credential, and starts a new seven-day lifetime.
- Ordinary setup reruns do not rotate credentials. After bootstrap acceptance, setup and recovery issue no further bootstrap invitations or memberships and do not reset roles/blocks. Public clients cannot invoke either operation.
- Tests cover failed delivery, lost and expired links, repeated setup, recovery racing with acceptance, and reruns after acceptance.
- Local tests use the mail viewer and synthetic addresses. Record missing production inputs as release blockers, not fabricated values.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 4.1. Hosted Google/email checks are completed in 7.1 after operator configuration.
```

## 4. Sign-in and protected navigation

- [x] 4.1 Add session-aware login and navigation; verify component/router tests for code entry, Google callback, reload, expiry, sign-out/Back, no-access, safe return destinations, and existing browsing-context restoration.

```markdown
# Add passwordless sign in and navigation

**Status:** Complete (local component/router and Chrome verification)
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1

## Summary

Let relatives sign in through email codes or Google and reach the archive without exposing protected views before access is verified.

## Acceptance Criteria

- Provide labeled email/code entry, Continue with Google, persistent status/errors, resend feedback, callback handling, and sign-out.
- Session initialization, current membership checks, missing access, network failure, and session expiry have distinct fail-closed states.
- Errors explain the next action using design decision 7. Service failures are not labeled as invalid codes or missing membership. Rate-limit timing uses service-provided values.
- After a lost authentication response, retry reconciles session state and checks current access before rendering protected content. It does not automatically request another code. Test both established-session and no-session outcomes.
- Single-archive members reach browsing directly. No archive creation or switcher is introduced.
- Protected deep links preserve valid in-app destinations; external, scheme-relative, and encoded external return attempts are rejected.
- Sign-out, identity changes, and detected access denial clear member-specific state and protected views, including browser Back.
- Tests cover both sign-in adapters, canceled Google flow, initialization races, refresh/reload, navigation, and errors. Preserve existing title/focus and collection-context behavior.
- Verify keyboard operation, responsive layout, existing UI controls, and demo notices.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 2.1 and 3.1 using agreed adapter contracts. Real authentication integration remains a release gate.
```

## 5. Invitation acceptance experience

- [x] 5.1 Add authenticated invitation acceptance; verify email-code/Google continuation, explicit acceptance, wrong-account recovery, old/expired/canceled links, credential cleanup, and scanner-safe navigation tests.

```markdown
# Add verified invitation acceptance for relatives

**Status:** Complete (local component/router and Chrome verification)
**Type:** Feature
**Priority:** Medium
**Dependencies:** 2.1, 3.1, 4.1

## Summary

Carry a relative from their invitation through either sign-in method into the correct archive without treating a forwarded email as authorization.

## Acceptance Criteria

- Invitation landing requires an explicit authenticated Accept invitation action before granting membership. Reading a link or completing either sign-in method alone has no acceptance side effects.
- The invitation survives email-code entry and Google redirects without leaking credentials into logs, referrers, or third-party requests.
- Verified matching addresses can accept; different addresses get a clear switch-account recovery path.
- Expired, canceled, replaced, invalid, blocked, and already-accepted invitations have understandable outcomes without role changes.
- Wrong-account recovery retains the invitation while switching accounts. Expired, canceled, or replaced links direct the recipient to request a current invitation.
- Network/service failures show an unconfirmed result and safe retry, not an invalid-invitation error. Retain the short-lived credential until a confirmed success or terminal outcome.
- Test acceptance that commits before its response is lost. Retry confirms the outcome without duplicate membership and rechecks live access, including a block applied before retry.
- Success opens the admitted archive; credentials are removed from visible URLs and temporary state at appropriate terminal outcomes.
- Route/component tests cover both authentication continuations, credential handling, and all failure/retry cases.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 6.1 once shared operation/session contracts exist.
```

## 6. Owner access-management experience

- [x] 6.1 Add owner invitation and contributor-access controls; verify role defaults/warning, send/resend/cancel, delivery errors, block/unblock, owner protection, and contributor/foreign-archive denial tests.

```markdown
# Add simple owner access management controls

**Status:** Complete (local component/router, API, and Chrome verification)
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1, 2.1, 4.1

## Summary

Let multiple owners invite family and block or restore contributors without using Supabase administration.

## Acceptance Criteria

- An owner-only destination identifies the archive and provides email entry with Contributor default and an explicit Owner privilege notice.
- Owners see invitation email, intended role, expiry, status, rejected or unknown delivery, resend, and cancel with persistent result feedback.
- A lost send/resend/cancel response offers status refresh or retry of the same operation. Tests prove recovery does not silently send another invitation or restore an invalidated credential.
- Explicit resend replaces the credential. Delivery acceptance is not presented as confirmed inbox delivery; provider timeouts are not presented as definite rejection.
- Owners see Contributors and can block/unblock them. Explain that blocking preserves past contributions.
- Owner memberships have no block, remove, demote, or role-change action. No member promotion is introduced.
- Contributors cannot see protected lists by directly navigating to the page. Server denials remain authoritative.
- Tests cover all controls, two independent owners, blocked-address invitation conflicts, and direct-route denial; verify keyboard, focus, narrow layout, and persistent errors.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 5.1. This is not a general account-management or archive-management screen.
```

## 6.2 Manual invitation sharing

- [x] 6.2 Add manually shared archive invitation links; verify owner-only one-time link display/copy, provider-free creation, explicit replacement, lost-response reconciliation, credential cleanup, and unchanged acceptance/access boundaries.

```markdown
# Add manually shared archive invitation links

**Status:** Complete
**Type:** Feature
**Priority:** Medium
**Dependencies:** 2.1 (#29), 5.1 (#32), 6.1 (#33)

## Summary

Let owners create and copy email-bound invitation links to share with relatives themselves. This enables testing with matching Google accounts before configuring a hosted email provider.

## Acceptance Criteria

- Manage access defaults to Create invitation link in manual mode. Contributor remains the default role; Owner requires the existing privilege acknowledgement.
- Creation works without SMTP or Mailpit. The owner sees the new link with Copy invitation link, selectable-text fallback, expiry, and clear instructions that no email was sent.
- Only the initial successful authorized issuance result exposes the link. Store credentials digest-only; keep links out of status lists, routine logs, and persistent owner-browser storage. Clipboard failure does not issue a new invitation.
- Clear displayed links on reload, page exit, sign-out, identity/access loss, or known invalidation. After loss, explain that the link cannot be retrieved.
- Create replacement link explicitly invalidates the old credential and starts a new seven-day lifetime. Cancellation, role protection, and blocked-address handling retain existing semantics.
- Lost create/replacement responses offer status refresh or the identical retry. Retry neither rotates nor returns a new credential; if the original committed, show its current state and offer explicit replacement. Canceled, replaced, accepted, or expired results never expose a link as usable.
- Record manual sharing distinctly from attempted email delivery without claiming the owner sent it or the recipient received it. Preserve existing delivery history; keep Mailpit available as an explicitly configured local email test mode.
- Use the configured application origin. Delivery mode participates in retry consistency; changed parameters/configuration cannot reinterpret an earlier operation.
- Recipients must prove the invited email through an available sign-in method and explicitly accept. Opening links, including scanner navigation, grants no membership. Google acceptance requires no mail service.
- Automated tests cover owner/contributor/foreign-archive authorization, copy fallback, cleanup, reload/lost-response recovery, replacement/cancel/accept races, expiry, rate limits, and retained-token blocks. Existing email-mode tests continue to pass. Verify keyboard and narrow-screen usability locally.
- Keep schema changes replayable through migrations and update the existing OpenSpec contracts and ignored verification report.

## Assumptions / Decisions / Constraints

- This ticket adds manual sharing to the current invitation model; it does not replace invitations with Supabase Auth invitations or add general-purpose share links.
- The owner supplies the recipient's email even when sharing by text.
- Hosted provider-free testers use matching Google accounts. Hosted email-code availability still requires separate email configuration.
- Hosted deployment, first-owner provisioning, and release approval stay in 7.1. This ticket does not broaden the existing local-only setup script to target hosted resources.
```

## 7. Integrated release verification

- [ ] 7.1 Verify and release the agreed milestone with operator approval; pass local quality/build/security checks and hosted email-code/Google, identity-continuity, invitation, role-boundary, and retained-token blocking smoke tests, retaining evidence locally.

```markdown
# Verify authentication and archive access release

**Status:** Not Started
**Type:** Task
**Priority:** Medium
**Dependencies:** 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 6.2

## Summary

Validate the complete private-entry flow locally and on the intended hosted application before declaring this milestone complete.

## Done When

- Use the confirmed target project `hbshdkyfzefwskokwiyf`; confirm the canonical origin, archive name, initial-owner email, and Google configuration with the operator. Manual-link/Google testing may proceed without a provider after release approval and hosted safety checks. Confirm a verified transactional sender before enabling hosted email features. Do not make hosted changes before local verification and approval.
- Refresh the legacy inventory and reset the disposable hosted application schema, old Auth accounts, and Storage files using supported interfaces while retaining the project. Apply the tested migrations and deploy Edge Functions; do not copy local test accounts or files.
- Look up the correct project API URL and publishable key; no privileged key is present in frontend output.
- Run `vp install` before implementation validation, then `vp check`, `vp test`, and `vp run build`, plus the new local database/function security tests.
- Run security/performance/health advisors and resolve or explicitly report applicable findings.
- Real local and hosted sign-in works with email codes and Google. Same-email continuity works in both provider orders without duplicate memberships.
- For an earlier provider-free pilot, verify manually shared links and matching Google sign-in without any SMTP/Mailpit dependency. Record hosted email and cross-provider checks as outstanding, not passed; this pilot does not mark 7.1 complete.
- Invite a second Owner and a Contributor; verify wrong-address denial, expiry/replacement/cancel, delivery recovery, independent owner operation, and sign-out/deep-link behavior.
- Verify first-owner recovery for failed, lost, and expired invitations, plus harmless setup/recovery reruns after acceptance. Use isolated fixtures for destructive failure cases.
- Use controlled failures to verify lost authentication and invitation responses, provider timeouts, and safe retries. Confirm current membership is rechecked and no duplicate admission or implicit resend occurs.
- Verify direct Auth requests reject uninvited account creation for both supported methods. Record observable eligibility differences and confirm only application feedback is described as generic.
- Verify opening invitation links and completing sign-in do not accept invitations until the recipient explicitly selects Accept invitation.
- Retain a Contributor access token, block the member, and prove subsequent protected requests fail; unblock and prove access returns without another invitation.
- Prove cross-archive boundaries using isolated test fixtures without adding a second production archive or switcher.
- Confirm synthetic item/upload/edit notices remain accurate; do not claim real catalog or storage completion.
- Record verification evidence in ignored local artifacts and update this change's task results. Verify a closed/maintenance rollback path without weakening access controls.
```

## Workflow follow-up

- Approved tickets, including 6.2, are published and mapped above. Track implementation in GitHub and keep these task checkboxes aligned with verified completion.
- Begin implementation only after planning review and ticket publication; creating these artifacts is not implementation authorization.
- Verify the completed change against its specs before archiving. Do not mark the broader archive-boundaries or upload milestones complete solely because these foundations exist.
