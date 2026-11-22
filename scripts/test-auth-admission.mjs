import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const local = JSON.parse(
  execFileSync('vp', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' }),
)
assert.equal(new URL(local.API_URL).hostname, '127.0.0.1')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(local.API_URL, local.SECRET_KEY, options)
const client = createClient(local.API_URL, local.PUBLISHABLE_KEY, options)
const digest = (token) => createHash('sha256').update(token).digest('hex')
const sql = (query, role = 'postgres') =>
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      'PGPASSWORD=postgres',
      'supabase_db_clutterbase',
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      role,
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atc',
      query,
    ],
    { encoding: 'utf8' },
  )
const success = (result) => {
  assert.equal(result.error, null, result.error?.message)
  return result.data
}
const email = `bootstrap-${randomUUID()}@example.test`
const name = 'Bootstrap test archive'
let archiveId
let userId
assert.equal(
  sql('select count(*) from private.archive_bootstrap').trim(),
  '0',
  'Run before establishing the local demo archive',
)
const setup = (token, recover = false) =>
  admin.rpc('setup_archive', {
    archive_name: name,
    approved_email: email,
    credential_digest: digest(token),
    recover,
  })
async function requestCode(address) {
  const response = await fetch(`${local.FUNCTIONS_URL}/request-code`, {
    method: 'POST',
    headers: { apikey: local.PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: address }),
  })
  return { status: response.status, body: await response.json() }
}
async function latestCode() {
  const search = await fetch(
    `${local.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  ).then((response) => response.json())
  assert.ok(search.messages.length > 0)
  const message = await fetch(`${local.MAILPIT_URL}/api/v1/message/${search.messages[0].ID}`).then(
    (response) => response.json(),
  )
  const code = message.HTML.match(/<strong>(\d{6})<\/strong>/)?.[1]
  assert.ok(code, 'mail contains a six-digit code')
  assert.equal(message.HTML.includes('href='), false, 'mail does not require a magic link')
  return code
}
try {
  const initial = success(await setup('initial'))
  archiveId = initial.archiveId
  assert.equal(initial.created, true)
  assert.equal(success(await setup('ignored')).created, false)
  assert.ok(
    (
      await client.rpc('setup_archive', {
        archive_name: name,
        approved_email: email,
        credential_digest: digest('public'),
        recover: true,
      })
    ).error,
  )
  success(
    await admin.rpc('record_invitation_delivery', {
      target_invitation_id: initial.invitation.id,
      outcome: 'rejected',
    }),
  )
  const recovered = success(await setup('recovered', true))
  assert.equal(recovered.archiveId, archiveId)
  assert.notEqual(recovered.invitation.id, initial.invitation.id)
  sql(
    `update private.archive_invitations set issued_at = now() - interval '8 days', expires_at = now() - interval '1 day' where id = '${recovered.invitation.id}'`,
  )
  assert.equal(success(await setup('still-ignored')).invitation.id, recovered.invitation.id)
  const current = success(await setup('current', true))
  assert.equal(current.created, true)
  assert.equal(
    new Date(current.invitation.expiresAt) - new Date(current.invitation.issuedAt),
    7 * 86400000,
  )

  for (const provider of ['email', 'google']) {
    const allowed = sql(
      `select private.before_user_created('{"user":{"email":"${email}","app_metadata":{"provider":"${provider}"},"is_anonymous":false}}'::jsonb);`,
      'supabase_auth_admin',
    )
    assert.ok(allowed.includes('{}'))
    const denied = sql(
      `select private.before_user_created('{"user":{"email":"uninvited@example.test","app_metadata":{"provider":"${provider}"},"is_anonymous":false}}'::jsonb);`,
      'supabase_auth_admin',
    )
    assert.ok(denied.includes('"http_code": 403'))
  }
  const unknownEmail = `unknown-${randomUUID()}@example.test`
  const direct = await client.auth.signInWithOtp({ email: unknownEmail })
  assert.ok(direct.error, 'direct public Auth rejects account creation')
  console.log(
    `Direct Auth admission denial is observable: HTTP ${direct.error.status}, code ${direct.error.code}.`,
  )
  const unknown = await requestCode(unknownEmail)
  const invited = await requestCode(email)
  assert.equal(invited.status, 200, JSON.stringify(invited))
  assert.deepEqual(unknown, invited, 'application request feedback hides admission eligibility')
  const code = await latestCode()
  assert.ok(
    (
      await client.auth.verifyOtp({
        email,
        token: code === '000000' ? '111111' : '000000',
        type: 'email',
      })
    ).error,
  )
  const verified = success(await client.auth.verifyOtp({ email, token: code, type: 'email' }))
  userId = verified.user.id
  assert.equal(
    success(await client.from('archives').select()).length,
    0,
    'sign-in alone does not accept invitation',
  )
  assert.ok(
    (await client.auth.verifyOtp({ email, token: code, type: 'email' })).error,
    'code is single use',
  )
  assert.equal(
    success(await client.rpc('accept_archive_invitation', { credential_digest: digest('initial') }))
      .outcome,
    'replaced',
  )
  assert.equal(
    success(
      await client.rpc('accept_archive_invitation', { credential_digest: digest('recovered') }),
    ).outcome,
    'replaced',
  )

  const race = await Promise.all([
    client.rpc('accept_archive_invitation', { credential_digest: digest('current') }),
    setup('race-recovery', true),
  ])
  const acceptance = success(race[0]).outcome
  const recovery = success(race[1])
  if (acceptance === 'accepted') {
    assert.equal(recovery.outcome, 'established')
    assert.equal(recovery.created, false)
  } else {
    assert.equal(acceptance, 'replaced')
    assert.equal(recovery.created, true)
    assert.equal(
      success(
        await client.rpc('accept_archive_invitation', {
          credential_digest: digest('race-recovery'),
        }),
      ).outcome,
      'accepted',
    )
  }
  assert.equal(success(await setup('after')).outcome, 'established')
  assert.equal(success(await setup('after-recovery', true)).outcome, 'established')
  assert.equal(success(await client.from('archive_memberships').select().single()).role, 'owner')

  // Advance only synthetic account cooldown timestamps, not production settings or test wait loops.
  sql(
    `update auth.users set confirmation_sent_at = now() - interval '2 minutes', recovery_sent_at = now() - interval '2 minutes' where id = '${userId}'`,
  )
  assert.equal((await requestCode(email)).status, 200)
  const returning = await latestCode()
  const rate = await requestCode(email)
  assert.equal(rate.status, 429)
  assert.equal(rate.body.outcome, 'rate_limited')
  success(await client.auth.verifyOtp({ email, token: returning, type: 'email' }))
  sql(
    `update auth.users set recovery_sent_at = now() - interval '2 minutes' where id = '${userId}'`,
  )
  assert.equal((await requestCode(email)).status, 200)
  const expired = await latestCode()
  sql(
    `update auth.users set recovery_sent_at = now() - interval '11 minutes' where id = '${userId}'`,
  )
  assert.ok(
    (await client.auth.verifyOtp({ email, token: expired, type: 'email' })).error,
    'expired code denied',
  )
  console.log(
    'Auth admission checks passed: generic application feedback, real code templates/verification/expiry/rate limit, hook provider checks, bootstrap retry/recovery/concurrency and explicit acceptance.',
  )
} finally {
  if (archiveId) {
    sql(`begin;
      delete from private.archive_bootstrap where archive_id = '${archiveId}';
      delete from private.invitation_operations where invitation_id in (select id from private.archive_invitations where archive_id = '${archiveId}');
      delete from private.archive_invitations where archive_id = '${archiveId}';
      delete from public.archive_memberships where archive_id = '${archiveId}';
      delete from public.archives where id = '${archiveId}';
      commit;`)
  }
  const created = success(await admin.auth.admin.listUsers()).users.find(
    (user) => user.email === email,
  )
  if (created) success(await admin.auth.admin.deleteUser(created.id))
}
