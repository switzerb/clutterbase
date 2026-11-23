import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Resolve only the local stack. Never accept a hosted URL or credentials from the environment.
const local = JSON.parse(
  execFileSync('vp', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' }),
)
assert.equal(new URL(local.API_URL).hostname, '127.0.0.1')
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(local.API_URL, local.SECRET_KEY, options)
const publicClient = () => createClient(local.API_URL, local.PUBLISHABLE_KEY, options)
const archiveIds = [randomUUID(), randomUUID()]
const users = []

function success(result) {
  assert.equal(result.error, null, result.error?.message)
  return result.data
}

async function account(label) {
  const email = `${label}-${randomUUID()}@example.test`
  const { user } = success(await admin.auth.admin.createUser({ email, email_confirm: true }))
  users.push(user.id)
  const link = success(await admin.auth.admin.generateLink({ type: 'magiclink', email }))
  const client = publicClient()
  const verified = success(
    await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }),
  )
  return { id: user.id, email, client, token: verified.session.access_token }
}

async function block(account, archive, target, blocked) {
  return account.client.rpc('set_contributor_block', {
    target_archive_id: archive,
    target_user_id: target.id,
    should_block: blocked,
  })
}

async function edgeBlock(account, archive, target, blocked) {
  return fetch(`${local.FUNCTIONS_URL}/contributor-access`, {
    method: 'POST',
    headers: {
      apikey: local.PUBLISHABLE_KEY,
      Authorization: `Bearer ${account.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ archiveId: archive, userId: target.id, blocked }),
  })
}

try {
  const first = await account('owner-one')
  const second = await account('owner-two')
  const contributor = await account('contributor')
  const outsider = await account('outsider')
  success(
    await admin.from('archives').insert(archiveIds.map((id, i) => ({ id, name: `Test ${i}` }))),
  )
  success(
    await admin.from('archive_memberships').insert([
      ...[first, second, contributor].map((user) => ({
        archive_id: archiveIds[0],
        user_id: user.id,
        role: user === contributor ? 'contributor' : 'owner',
        admission_email: user.email,
      })),
      {
        archive_id: archiveIds[1],
        user_id: contributor.id,
        role: 'contributor',
        admission_email: contributor.email,
      },
    ]),
  )
  assert.ok((await publicClient().from('archives').select()).error)
  assert.deepEqual(success(await outsider.client.from('archives').select()), [])
  assert.equal(success(await contributor.client.from('archives').select()).length, 2)
  assert.equal(success(await first.client.from('archives').select()).length, 1)

  success(await contributor.client.auth.updateUser({ data: { role: 'owner', is_admin: true } }))
  success(await contributor.client.auth.refreshSession())
  assert.equal(
    (await block(contributor, archiveIds[0], second, true)).error?.message,
    'owner_required',
  )
  assert.equal(
    (await block(first, archiveIds[1], contributor, true)).error?.message,
    'owner_required',
  )
  assert.equal((await block(first, archiveIds[0], second, true)).error?.message, 'owner_protected')
  assert.ok(
    (
      await contributor.client
        .from('archive_memberships')
        .update({ role: 'owner' })
        .eq('user_id', contributor.id)
    ).error,
  )
  assert.ok(
    (await first.client.from('archive_memberships').delete().eq('user_id', second.id)).error,
  )
  assert.ok(
    (
      await outsider.client.from('archive_memberships').insert({
        archive_id: archiveIds[0],
        user_id: outsider.id,
        role: 'owner',
        admission_email: outsider.email,
      })
    ).error,
  )

  const before = success(
    await admin
      .from('archive_memberships')
      .select()
      .eq('archive_id', archiveIds[0])
      .eq('user_id', contributor.id)
      .single(),
  )
  success(await block(first, archiveIds[0], contributor, true))
  // Raw HTTP with the original, pre-block JWT proves no session refresh is needed for enforcement.
  const retained = () =>
    fetch(`${local.API_URL}/rest/v1/archives?select=id&id=eq.${archiveIds[0]}`, {
      headers: { apikey: local.PUBLISHABLE_KEY, Authorization: `Bearer ${contributor.token}` },
    })
  const denied = await retained()
  assert.equal(denied.status, 200)
  assert.deepEqual(await denied.json(), [])
  assert.equal(success(await contributor.client.from('archives').select()).length, 1)
  assert.equal(
    (await block(contributor, archiveIds[0], contributor, false)).error?.message,
    'owner_required',
  )
  success(await block(second, archiveIds[0], contributor, false))
  const restored = await retained()
  assert.equal(restored.status, 200)
  assert.deepEqual(await restored.json(), [{ id: archiveIds[0] }])
  const after = success(
    await admin
      .from('archive_memberships')
      .select()
      .eq('archive_id', archiveIds[0])
      .eq('user_id', contributor.id)
      .single(),
  )
  assert.equal(after.created_at, before.created_at)
  assert.equal(after.role, 'contributor')
  assert.equal(after.blocked, false)
  assert.equal((await edgeBlock(outsider, archiveIds[0], contributor, true)).status, 403)
  assert.equal((await edgeBlock(first, archiveIds[1], contributor, true)).status, 403)
  assert.equal((await edgeBlock(first, archiveIds[0], second, true)).status, 403)
  assert.equal((await edgeBlock(first, archiveIds[0], contributor, true)).status, 200)
  assert.deepEqual(await (await retained()).json(), [])
  assert.equal((await edgeBlock(second, archiveIds[0], contributor, false)).status, 200)
  assert.deepEqual(await (await retained()).json(), [{ id: archiveIds[0] }])
  assert.equal(
    (await edgeBlock({ token: 'invalid' }, archiveIds[0], contributor, true)).status,
    401,
  )
  console.log(
    'Membership API checks passed: RLS, forged roles, direct writes, cross-archive denial, two owners, retained-token block/unblock.',
  )
} finally {
  success(await admin.from('archive_memberships').delete().in('archive_id', archiveIds))
  success(await admin.from('archives').delete().in('id', archiveIds))
  for (const id of users) success(await admin.auth.admin.deleteUser(id))
}
