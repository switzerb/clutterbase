import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { sendLocalInvitation } from '../supabase/functions/_shared/invitation-delivery.ts'

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
  const sent = await edge(owner, sendBody)
  assert.equal(sent.status, 200, JSON.stringify(sent.data))
  assert.equal(sent.data.invitation.delivery, 'accepted')
  const again = await edge(owner, sendBody)
  assert.equal(again.status, 200)
  assert.equal(again.data.outcome, 'reconciled')
  assert.equal(again.data.invitation.id, sent.data.invitation.id)
  assert.equal((await edge(recipient, { action: 'list', archiveId })).status, 403)
  assert.equal((await edge(owner, { ...sendBody, verified_caller_id: otherOwner.id })).status, 400)
  const mailbox = await fetch(
    `${local.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${sendBody.email}`)}`,
  )
  assert.equal((await mailbox.json()).count, 1, 'retry sends no second email')

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
