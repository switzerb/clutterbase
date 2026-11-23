import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { sendLocalInvitation } from '../supabase/functions/_shared/invitation-delivery.ts'
import invitationFunction from '../supabase/functions/archive-invitations/index.ts'

const local = JSON.parse(
  execFileSync('vp', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' }),
)
assert.equal(new URL(local.API_URL).hostname, '127.0.0.1')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(local.API_URL, local.SECRET_KEY, options)
const client = () => createClient(local.API_URL, local.PUBLISHABLE_KEY, options)
const archiveId = randomUUID()
const otherArchive = randomUUID()
const userIds = []
const digest = (token) => createHash('sha256').update(token).digest('hex')
const success = (result) => {
  assert.equal(result.error, null, result.error?.message)
  return result.data
}
const sql = (query) =>
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_clutterbase',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atc',
      query,
    ],
    { encoding: 'utf8' },
  )
async function user(label) {
  const email = `${label}-${randomUUID()}@example.test`
  const created = success(await admin.auth.admin.createUser({ email, email_confirm: true }))
  userIds.push(created.user.id)
  const link = success(await admin.auth.admin.generateLink({ type: 'magiclink', email }))
  const api = client()
  const session = success(
    await api.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }),
  ).session
  return { id: created.user.id, email, api, token: session.access_token }
}
const issue = (owner, email, token, extra = {}) =>
  admin.rpc('issue_archive_invitation', {
    verified_caller_id: owner.id,
    retry_id: randomUUID(),
    target_archive_id: archiveId,
    invited_email: email,
    invited_role: 'contributor',
    replaces_id: null,
    credential_digest: digest(token),
    ...extra,
  })
const accept = (person, token) =>
  person.api.rpc('accept_archive_invitation', { credential_digest: digest(token) })
const cancel = (owner, id) =>
  owner.api.rpc('cancel_archive_invitation', {
    target_archive_id: archiveId,
    target_invitation_id: id,
  })
const list = (person) =>
  person.api.rpc('list_archive_invitations', { target_archive_id: archiveId })
const record = (id, outcome) =>
  admin.rpc('record_invitation_delivery', { target_invitation_id: id, outcome })
async function edge(person, body) {
  const response = await fetch(`${local.FUNCTIONS_URL}/archive-invitations`, {
    method: 'POST',
    headers: {
      apikey: local.PUBLISHABLE_KEY,
      Authorization: `Bearer ${person.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return { status: response.status, data: await response.json() }
}

// Exercise the same Edge handler in explicit Mailpit mode without changing the
// running app's manual-sharing configuration. Auth and RPC still use real HTTP.
async function configuredEdge(person, body, mode, afterIssue) {
  const settings = {
    SUPABASE_URL: local.API_URL,
    SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: local.SECRET_KEY,
    APP_ORIGIN: 'http://localhost:5173',
    INVITATION_DELIVERY_MODE: mode,
    INVITATION_MAILPIT_URL: mode === 'mailpit' ? `${local.MAILPIT_URL}/api/v1/send` : undefined,
  }
  const saved = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  if (afterIssue)
    globalThis.fetch = async (...args) => {
      const response = await originalFetch(...args)
      const requestUrl = args[0] instanceof Request ? args[0].url : args[0].toString()
      if (requestUrl.endsWith('/rpc/issue_archive_invitation')) {
        await afterIssue(await response.clone().json())
      }
      return response
    }
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    const response = await invitationFunction.fetch(
      new Request(`${local.FUNCTIONS_URL}/archive-invitations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${person.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    return { status: response.status, data: await response.json() }
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

try {
  const owner = await user('inviter')
  const recipient = await user('recipient')
  const stranger = await user('stranger')
  const otherOwner = await user('foreign-owner')
  success(
    await admin.from('archives').insert([
      { id: archiveId, name: 'Invitation tests' },
      { id: otherArchive, name: 'Other archive' },
    ]),
  )
  success(
    await admin.from('archive_memberships').insert([
      { archive_id: archiveId, user_id: owner.id, role: 'owner', admission_email: owner.email },
      {
        archive_id: otherArchive,
        user_id: otherOwner.id,
        role: 'owner',
        admission_email: otherOwner.email,
      },
    ]),
  )
  const retryId = randomUUID()
  const request = { retry_id: retryId }
  const issued = success(await issue(owner, recipient.email.toUpperCase(), 'first-token', request))
  assert.equal(issued.created, true)
  assert.equal(issued.invitation.delivery, 'unknown')
  assert.equal(
    new Date(issued.invitation.expiresAt) - new Date(issued.invitation.issuedAt),
    7 * 86400000,
  )
  assert.equal(issued.invitation.email, recipient.email)
  const retried = success(await issue(owner, recipient.email, 'discarded-token', request))
  assert.equal(retried.created, false)
  assert.equal(retried.invitation.id, issued.invitation.id)
  assert.equal(
    (await issue(owner, stranger.email, 'changed', request)).error?.message,
    'retry_conflict',
  )
  assert.equal(
    (await issue(owner, recipient.email, 'duplicate')).error?.message,
    'invitation_exists',
  )
  assert.equal(
    (await issue(stranger, stranger.email, 'unauthorized')).error?.message,
    'owner_required',
  )
  assert.equal((await list(stranger)).error?.message, 'owner_required')
  assert.equal((await list(otherOwner)).error?.message, 'owner_required')
  assert.ok(
    (
      await recipient.api.rpc('issue_archive_invitation', {
        verified_caller_id: owner.id,
        retry_id: randomUUID(),
        target_archive_id: archiveId,
        invited_email: stranger.email,
        invited_role: 'owner',
        replaces_id: null,
        credential_digest: digest('forged'),
      })
    ).error,
  )
  assert.ok((await recipient.api.schema('private').from('archive_invitations').select()).error)
  assert.equal(success(await accept(stranger, 'first-token')).outcome, 'wrong_account')
  assert.equal(success(await accept(recipient, 'tampered')).outcome, 'invalid_invitation')
  assert.equal(success(await accept(recipient, 'discarded-token')).outcome, 'invalid_invitation')
  assert.equal(
    success(await admin.from('archive_memberships').select().eq('user_id', recipient.id)).length,
    0,
  )
  const accepted = await Promise.all([
    accept(recipient, 'first-token'),
    accept(recipient, 'first-token'),
  ])
  assert.deepEqual(
    accepted.map((result) => success(result).outcome).sort((a, b) => a.localeCompare(b)),
    ['accepted', 'already_accepted'],
  )
  assert.equal(
    success(await admin.from('archive_memberships').select().eq('user_id', recipient.id)).length,
    1,
  )
  success(
    await owner.api.rpc('set_contributor_block', {
      target_archive_id: archiveId,
      target_user_id: recipient.id,
      should_block: true,
    }),
  )
  assert.equal(success(await accept(recipient, 'first-token')).outcome, 'member_blocked')
  assert.equal((await issue(owner, recipient.email, 'blocked')).error?.message, 'member_blocked')
  success(
    await owner.api.rpc('set_contributor_block', {
      target_archive_id: archiveId,
      target_user_id: recipient.id,
      should_block: false,
    }),
  )
  assert.equal(success(await accept(recipient, 'first-token')).outcome, 'already_accepted')
  assert.equal(
    (await issue(owner, recipient.email, 'promote', { invited_role: 'owner' })).error?.message,
    'membership_exists',
  )
  assert.equal((await list(recipient)).error?.message, 'owner_required')

  const old = success(await issue(owner, stranger.email, 'old'))
  success(await record(old.invitation.id, 'rejected'))
  assert.equal(
    success(await list(owner)).find((item) => item.id === old.invitation.id).delivery,
    'rejected',
  )
  const fresh = success(
    await issue(owner, stranger.email, 'fresh', { replaces_id: old.invitation.id }),
  )
  assert.equal(success(await accept(stranger, 'old')).outcome, 'replaced')
  success(await record(old.invitation.id, 'accepted'))
  assert.equal(
    success(await list(owner)).find((item) => item.id === fresh.invitation.id).delivery,
    'unknown',
  )
  const canceled = success(await cancel(owner, fresh.invitation.id))
  assert.equal(canceled.status, 'canceled')
  assert.equal(success(await cancel(owner, fresh.invitation.id)).status, 'canceled')
  assert.equal(success(await accept(stranger, 'fresh')).outcome, 'canceled')

  const expired = success(await issue(owner, stranger.email, 'expired'))
  sql(
    `update private.archive_invitations set issued_at = now() - interval '7 days', expires_at = now() where id = '${expired.invitation.id}'`,
  )
  assert.equal(success(await accept(stranger, 'expired')).outcome, 'expired')
  const race = success(
    await issue(owner, stranger.email, 'race', { replaces_id: expired.invitation.id }),
  )
  const results = await Promise.all([accept(stranger, 'race'), cancel(owner, race.invitation.id)])
  const admission = success(results[0])
  const cancellation = success(results[1])
  assert.ok(['accepted', 'canceled'].includes(admission.outcome))
  assert.equal(cancellation.status, admission.outcome)
  assert.equal(
    success(await admin.from('archive_memberships').select().eq('user_id', stranger.id)).length,
    admission.outcome === 'accepted' ? 1 : 0,
  )

  const message = {
    to: 'fixture@example.test',
    role: 'contributor',
    link: 'http://localhost/invitation#token=fixture',
  }
  assert.equal(
    await sendLocalInvitation(
      'http://unused.test',
      message,
      async () => new Response('', { status: 200 }),
    ),
    'accepted',
  )
  assert.equal(
    await sendLocalInvitation(
      'http://unused.test',
      message,
      async () => new Response('', { status: 422 }),
    ),
    'rejected',
  )
  assert.equal(
    await sendLocalInvitation(
      'http://unused.test',
      message,
      async () => new Response('', { status: 503 }),
    ),
    'unknown',
  )
  assert.equal(
    await sendLocalInvitation('http://unused.test', message, async () => {
      throw new Error('timeout')
    }),
    'unknown',
  )
  const sendBody = {
    action: 'create',
    archiveId,
    email: `mail-${randomUUID()}@example.test`,
    role: 'owner',
    retryId: randomUUID(),
  }
  const sent = await configuredEdge(owner, sendBody, 'mailpit')
  assert.equal(sent.status, 200, JSON.stringify(sent.data))
  assert.equal(sent.data.invitation.delivery, 'accepted')
  const again = await configuredEdge(owner, sendBody, 'mailpit')
  assert.equal(again.status, 200)
  assert.equal(again.data.outcome, 'reconciled')
  assert.equal(again.data.invitation.id, sent.data.invitation.id)
  assert.equal((await edge(recipient, { action: 'list', archiveId })).status, 403)
  assert.equal((await edge(owner, { ...sendBody, verified_caller_id: otherOwner.id })).status, 400)
  const mailbox = await fetch(
    `${local.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${sendBody.email}`)}`,
  )
  assert.equal((await mailbox.json()).count, 1, 'retry sends no second email')

  const shared = await user('manual-recipient')
  const shareBody = {
    action: 'create',
    archiveId,
    email: shared.email,
    role: 'contributor',
    retryId: randomUUID(),
  }
  const manual = await edge(owner, shareBody)
  assert.equal(manual.status, 200, JSON.stringify(manual.data))
  assert.equal(manual.data.invitation.deliveryMode, 'manual')
  assert.equal(manual.data.invitation.delivery, 'not_requested')
  const sharedToken = new URLSearchParams(new URL(manual.data.link).hash.slice(1)).get('token')
  assert.match(sharedToken, /^[a-f0-9]{64}$/)
  assert.equal(new URL(manual.data.link).origin, 'http://localhost:5173')
  assert.equal(
    sql(
      `select token_digest from private.archive_invitations where id = '${manual.data.invitation.id}'`,
    ).trim(),
    digest(sharedToken),
  )
  assert.equal(
    (
      await fetch(
        `${local.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${shared.email}`)}`,
      ).then((r) => r.json())
    ).count,
    0,
  )
  success(await record(manual.data.invitation.id, 'accepted'))
  assert.equal(
    success(await list(owner)).find((item) => item.id === manual.data.invitation.id).delivery,
    'not_requested',
  )
  const manualRetry = await edge(owner, shareBody)
  assert.equal(manualRetry.data.outcome, 'reconciled')
  assert.equal(manualRetry.data.link, undefined, 'lost-response retry cannot recreate plaintext')
  assert.equal((await configuredEdge(owner, shareBody, 'mailpit')).data.outcome, 'retry_conflict')
  assert.equal((await edge(otherOwner, { ...shareBody, retryId: randomUUID() })).status, 403)
  assert.equal((await edge(recipient, { ...shareBody, retryId: randomUUID() })).status, 403)
  assert.equal((await edge(owner, { ...shareBody, origin: 'https://other.test' })).status, 400)
  assert.equal((await edge(owner, { ...shareBody, deliveryMode: 'email' })).status, 400)
  assert.equal((await edge(owner, { action: 'list', archiveId })).data.deliveryMode, 'manual')
  assert.equal(
    JSON.stringify((await edge(owner, { action: 'list', archiveId })).data).includes(sharedToken),
    false,
  )
  assert.equal(
    (await edge(otherOwner, { action: 'accept', token: sharedToken })).data.outcome,
    'wrong_account',
  )
  const replacementBody = {
    ...shareBody,
    action: 'resend',
    replacesId: manual.data.invitation.id,
    retryId: randomUUID(),
  }
  const replacement = await edge(owner, replacementBody)
  assert.equal(replacement.status, 200)
  const replacementToken = new URLSearchParams(new URL(replacement.data.link).hash.slice(1)).get(
    'token',
  )
  assert.notEqual(replacementToken, sharedToken)
  assert.equal(
    (await edge(shared, { action: 'accept', token: sharedToken })).data.outcome,
    'replaced',
  )
  assert.equal((await edge(owner, shareBody)).data.link, undefined)
  assert.equal(
    (await edge(shared, { action: 'accept', token: replacementToken })).data.outcome,
    'accepted',
  )
  assert.equal(
    (await edge(owner, replacementBody)).data.link,
    undefined,
    'accepted retry returns no link',
  )
  success(
    await owner.api.rpc('set_contributor_block', {
      target_archive_id: archiveId,
      target_user_id: shared.id,
      should_block: true,
    }),
  )
  assert.equal(
    (await edge(shared, { action: 'accept', token: replacementToken })).data.outcome,
    'member_blocked',
  )
  assert.deepEqual(
    success(await shared.api.from('archives').select()),
    [],
    'retained token loses access after block',
  )
  assert.equal(
    (await edge(owner, { ...shareBody, retryId: randomUUID() })).data.outcome,
    'member_blocked',
  )

  for (const status of ['canceled', 'replaced', 'accepted', 'expired']) {
    const raced = await configuredEdge(
      owner,
      {
        ...shareBody,
        email: `race-${randomUUID()}@example.test`,
        retryId: randomUUID(),
      },
      'manual',
      async ({ invitation }) => {
        // Deterministically change lifecycle state after issuance, before reconciliation.
        sql(
          status === 'expired'
            ? `update private.archive_invitations set issued_at = now() - interval '7 days', expires_at = now() where id = '${invitation.id}'`
            : `update private.archive_invitations set status = '${status}'${status === 'accepted' ? `, accepted_by = '${shared.id}', accepted_at = now()` : ''} where id = '${invitation.id}'`,
        )
      },
    )
    assert.equal(raced.status, 200)
    assert.equal(
      raced.data.link,
      undefined,
      `${status} during reconciliation must suppress the credential`,
    )
  }
  const noMailBody = {
    ...shareBody,
    email: `no-mail-${randomUUID()}@example.test`,
    retryId: randomUUID(),
  }
  const noMail = await configuredEdge(owner, noMailBody, 'manual')
  assert.equal(noMail.status, 200, 'manual mode needs no Mailpit setting')
  assert.ok(noMail.data.link)
  success(await cancel(owner, noMail.data.invitation.id))
  const canceledManual = await edge(owner, noMailBody)
  assert.equal(canceledManual.data.invitation.status, 'canceled')
  assert.equal(canceledManual.data.link, undefined)

  const expiringBody = {
    ...shareBody,
    email: `expired-manual-${randomUUID()}@example.test`,
    retryId: randomUUID(),
  }
  const expiring = await edge(owner, expiringBody)
  sql(
    `update private.archive_invitations set issued_at = now() - interval '7 days', expires_at = now() where id = '${expiring.data.invitation.id}'`,
  )
  assert.equal((await edge(owner, expiringBody)).data.link, undefined)
  const simultaneousBody = {
    ...shareBody,
    email: `simultaneous-${randomUUID()}@example.test`,
    retryId: randomUUID(),
  }
  const simultaneous = await Promise.all([
    edge(owner, simultaneousBody),
    edge(owner, simultaneousBody),
  ])
  assert.equal(simultaneous.filter((response) => response.data.link).length, 1)
  assert.equal(simultaneous[0].data.invitation.id, simultaneous[1].data.invitation.id)

  const racing = await user('racing')
  const base = success(await issue(owner, racing.email, 'race-old', { invited_role: 'owner' }))
  const replacing = await Promise.all([
    accept(racing, 'race-old'),
    issue(owner, racing.email, 'race-new', {
      invited_role: 'owner',
      replaces_id: base.invitation.id,
    }),
  ])
  const acceptance = success(replacing[0]).outcome
  if (acceptance === 'accepted') {
    assert.equal(replacing[1].error?.message, 'membership_exists')
    assert.equal(
      success(
        await racing.api
          .from('archive_memberships')
          .select()
          .eq('archive_id', archiveId)
          .eq('user_id', racing.id)
          .single(),
      ).role,
      'owner',
    )
  } else {
    assert.equal(acceptance, 'replaced')
    assert.equal(success(replacing[1]).created, true)
    assert.equal(success(await accept(racing, 'race-new')).outcome, 'accepted')
    assert.equal(
      success(
        await racing.api
          .from('archive_memberships')
          .select()
          .eq('archive_id', archiveId)
          .eq('user_id', racing.id)
          .single(),
      ).role,
      'owner',
    )
  }
  const parallelEmail = `parallel-${randomUUID()}@example.test`
  const parallelId = randomUUID()
  const parallel = await Promise.all([
    issue(owner, parallelEmail, 'parallel-first', { retry_id: parallelId }),
    issue(owner, parallelEmail, 'parallel-second', { retry_id: parallelId }),
  ])
  assert.equal(parallel.filter((result) => success(result).created).length, 1)
  assert.equal(success(parallel[0]).invitation.id, success(parallel[1]).invitation.id)
  const canceledRetry = success(await cancel(owner, success(parallel[0]).invitation.id))
  assert.equal(canceledRetry.status, 'canceled')
  const afterCancelRetry = success(
    await issue(owner, parallelEmail, 'ignored', { retry_id: parallelId }),
  )
  assert.equal(afterCancelRetry.created, false)
  assert.equal(afterCancelRetry.invitation.status, 'canceled')
  const safe = JSON.stringify(success(await list(owner)))
  assert.equal(safe.includes('token_digest'), false)
  assert.equal(safe.includes(digest('first-token')), false)
  console.log(
    'Invitation checks passed: verified email, transactional retries/concurrency, replacement, expiry, cancellation, role protection, delivery outcomes, real local delivery.',
  )
} finally {
  // These IDs are generated locally; this fixture cleanup never targets the hosted project.
  sql(`begin;
    delete from private.invitation_operations where invitation_id in (select id from private.archive_invitations where archive_id in ('${archiveId}', '${otherArchive}'));
    delete from private.archive_invitations where archive_id in ('${archiveId}', '${otherArchive}');
    delete from public.archive_memberships where archive_id in ('${archiveId}', '${otherArchive}');
    delete from public.archives where id in ('${archiveId}', '${otherArchive}');
    commit;`)
  for (const id of userIds) success(await admin.auth.admin.deleteUser(id))
}
