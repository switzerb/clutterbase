# Implementation

These are draft, one-ticket-per-task boundaries for review, not published GitHub issues. No implementation is complete. Requirements live in `specs/`; architecture and deployment constraints live in `design.md`. Keep implementation discoveries in this change and verification evidence in ignored local artifacts, not a new `docs/` catalog.

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
       7.1
```

Tasks 3.1 and 4.1 can proceed in parallel after their prerequisites. Tasks 5.1 and 6.1 can proceed in parallel once their shared API and session contracts exist; the diagram's 5.1-to-6.1 relationship denotes final integration, not a requirement to serialize their UI work. Do not deploy until 7.1's release gates pass.

## 1. Membership foundation

- [ ] 1.1 Establish archive memberships and access enforcement; verify local migrations, uniqueness and role constraints, RLS/grants, cross-archive isolation, retained-token blocking, and owner-protection tests pass.

```markdown
# Establish archive scoped memberships and authorization

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** None

## Summary

Create the minimal archive and membership foundation so identity alone never grants access. Support multiple owners per archive without introducing archive creation or switching UI.

## Acceptance Criteria

- Inspect existing local and target schema before changing it; capture any conflicts in the design.
- Migrations establish archive/membership identity, constrained roles and block state, uniqueness, indexes, explicit grants, and RLS.
- Active Owners and Contributors can read authorized archive information. Nonmembers, signed-out users, and blocked users cannot obtain protected archive data.
- Narrow owner-only block/unblock operations preserve memberships and reject Owner targets.
- Database/API tests cover forged profile roles, direct mutations, cross-archive identifier substitution, two owners, blocked existing tokens, and restoration without another invitation.
- Tests establish the access contract without adding production item/storage features. Future private data is not claimed protected by tests that cover only membership records.

## Assumptions / Decisions / Constraints

- Follow `archive-access` and design decisions 2–3. Live membership, not stale token claims, determines access.
```

## 2. Invitation lifecycle

- [ ] 2.1 Implement trusted invitation lifecycle and delivery; verify matching-email acceptance, owner-only administration, seven-day expiry, resend/cancel, safe retry/concurrency, role protection, and delivery-failure tests pass.

```markdown
# Implement secure archive invitations and delivery

**Status:** Not Started
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
- A testable delivery adapter reports provider acceptance or failure honestly. Failed sends remain visible and retryable.
- Record operation contracts and any necessary concurrency decisions in this change.

## Assumptions / Decisions / Constraints

- Follow `archive-invitations` and design decisions 3–4. Provider credentials remain server-only.
```

## 3. Authentication admission and setup

- [ ] 3.1 Configure invitation-only authentication and repeatable owner setup; verify local email-code flows, admission-hook tests, non-enumerating code requests, and duplicate-safe bootstrap acceptance.

```markdown
# Configure invited authentication and owner bootstrap

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1, 2.1

## Summary

Permit invited accounts to authenticate with email codes or Google, and securely establish the first Owner without a public ownership-claim path.

## Acceptance Criteria

- New-account admission requires an unexpired pending invitation through a server-enforced hook; existing sessions remain subject to membership checks.
- The code-request boundary does not reveal invitation or membership existence. Invalid, expired, reused, and rate-limited code behavior is tested.
- Both initial and returning email templates show a code, not a required magic link. Apply the design's initial code expiry and resend cooldown.
- Configure local and hosted callback contracts, Google scopes, PKCE support, and secret references without committing credentials.
- Trusted setup creates one archive and one first-owner invitation for an operator-approved email. Acceptance still requires verified identity.
- Setup reruns do not duplicate ownership or reset roles/blocks; public clients cannot invoke bootstrap.
- Local tests use the mail viewer and synthetic addresses. Record missing production inputs as release blockers, not fabricated values.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 4.1. Hosted Google/email checks are completed in 7.1 after operator configuration.
```

## 4. Sign-in and protected navigation

- [ ] 4.1 Add session-aware login and navigation; verify component/router tests for code entry, Google callback, reload, expiry, sign-out/Back, no-access, safe return destinations, and existing browsing-context restoration.

```markdown
# Add passwordless sign in and navigation

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1

## Summary

Let relatives sign in through email codes or Google and reach the archive without exposing protected views before access is verified.

## Acceptance Criteria

- Provide labeled email/code entry, Continue with Google, persistent status/errors, resend feedback, callback handling, and sign-out.
- Session initialization, current membership checks, missing access, network failure, and session expiry have distinct fail-closed states.
- Single-archive members reach browsing directly. No archive creation or switcher is introduced.
- Protected deep links preserve valid in-app destinations; external, scheme-relative, and encoded external return attempts are rejected.
- Sign-out, identity changes, and detected access denial clear member-specific state and protected views, including browser Back.
- Tests cover both sign-in adapters, canceled Google flow, initialization races, refresh/reload, navigation, and errors. Preserve existing title/focus and collection-context behavior.
- Verify keyboard operation, responsive layout, existing UI controls, and demo notices.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 2.1 and 3.1 using agreed adapter contracts. Real authentication integration remains a release gate.
```

## 5. Invitation acceptance experience

- [ ] 5.1 Add authenticated invitation acceptance; verify email-code/Google continuation, explicit acceptance, wrong-account recovery, old/expired/canceled links, credential cleanup, and scanner-safe navigation tests.

```markdown
# Add verified invitation acceptance for relatives

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** 2.1, 3.1, 4.1

## Summary

Carry a relative from their invitation through either sign-in method into the correct archive without treating a forwarded email as authorization.

## Acceptance Criteria

- Invitation landing requires explicit authenticated acceptance before granting membership; reading a link has no acceptance side effects.
- The invitation survives email-code entry and Google redirects without leaking credentials into logs, referrers, or third-party requests.
- Verified matching addresses can accept; different addresses get a clear switch-account recovery path.
- Expired, canceled, replaced, invalid, blocked, and already-accepted invitations have understandable outcomes without role changes.
- Success opens the admitted archive; credentials are removed from visible URLs and temporary state at appropriate terminal outcomes.
- Route/component tests cover both authentication continuations, credential handling, and all failure/retry cases.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 6.1 once shared operation/session contracts exist.
```

## 6. Owner access-management experience

- [ ] 6.1 Add owner invitation and contributor-access controls; verify role defaults/warning, send/resend/cancel, delivery errors, block/unblock, owner protection, and contributor/foreign-archive denial tests.

```markdown
# Add simple owner access management controls

**Status:** Not Started
**Type:** Feature
**Priority:** Medium
**Dependencies:** 1.1, 2.1, 4.1

## Summary

Let multiple owners invite family and block or restore contributors without using Supabase administration.

## Acceptance Criteria

- An owner-only destination identifies the archive and provides email entry with Contributor default and an explicit Owner privilege notice.
- Owners see invitation email, intended role, expiry, status, delivery failures, resend, and cancel with stable result feedback.
- Owners see Contributors and can block/unblock them. Explain that blocking preserves past contributions.
- Owner memberships have no block, remove, demote, or role-change action. No member promotion is introduced.
- Contributors cannot see protected lists by directly navigating to the page. Server denials remain authoritative.
- Tests cover all controls, two independent owners, blocked-address invitation conflicts, and direct-route denial; verify keyboard, focus, narrow layout, and persistent errors.

## Assumptions / Decisions / Constraints

- Can proceed in parallel with 5.1. This is not a general account-management or archive-management screen.
```

## 7. Integrated release verification

- [ ] 7.1 Verify and release the agreed milestone with operator approval; pass local quality/build/security checks and hosted email-code/Google, identity-continuity, invitation, role-boundary, and retained-token blocking smoke tests, retaining evidence locally.

```markdown
# Verify authentication and archive access release

**Status:** Not Started
**Type:** Task
**Priority:** Medium
**Dependencies:** 1.1, 2.1, 3.1, 4.1, 5.1, 6.1

## Summary

Validate the complete private-entry flow locally and on the intended hosted application before declaring this milestone complete.

## Done When

- Confirm the target project, canonical origin, archive name, initial-owner email, Google credentials, and verified transactional sender with the operator. Do not make hosted changes without approval.
- Look up the correct project API URL and publishable key; no privileged key is present in frontend output.
- Run `vp install` before implementation validation, then `vp check`, `vp test`, and `vp run build`, plus the new local database/function security tests.
- Run security/performance/health advisors and resolve or explicitly report applicable findings.
- Real local and hosted sign-in works with email codes and Google. Same-email continuity works in both provider orders without duplicate memberships.
- Invite a second Owner and a Contributor; verify wrong-address denial, expiry/replacement/cancel, delivery recovery, independent owner operation, and sign-out/deep-link behavior.
- Retain a Contributor access token, block the member, and prove subsequent protected requests fail; unblock and prove access returns without another invitation.
- Prove cross-archive boundaries using isolated test fixtures without adding a second production archive or switcher.
- Confirm synthetic item/upload/edit notices remain accurate; do not claim real catalog or storage completion.
- Record verification evidence in ignored local artifacts and update this change's task results. Verify a closed/maintenance rollback path without weakening access controls.
```

## Workflow follow-up

- Review and approve these ticket drafts before publishing them to GitHub. Map each numbered checkbox to one approved issue and track implementation there.
- Begin implementation only after planning review and ticket publication; creating these artifacts is not implementation authorization.
- Verify the completed change against its specs before archiving. Do not mark the broader archive-boundaries or upload milestones complete solely because these foundations exist.
