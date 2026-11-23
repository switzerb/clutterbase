import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import {
  createCredential,
  digestCredential,
  sendLocalInvitation,
} from '../supabase/functions/_shared/invitation-delivery.ts'

const [name, email, action] = process.argv.slice(2)
assert.ok(
  name && email && (!action || action === '--recover'),
  'Usage: vpx scripts/setup-local-archive.mjs "Archive name" owner@example.test [--recover]',
)
const local = JSON.parse(
  execFileSync('vp', ['exec', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' }),
)
assert.equal(new URL(local.API_URL).hostname, '127.0.0.1')
const admin = createClient(local.API_URL, local.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const token = createCredential()
const { data, error } = await admin.rpc('setup_archive', {
  archive_name: name,
  approved_email: email,
  credential_digest: await digestCredential(token),
  recover: action === '--recover',
})
assert.equal(error, null, error?.message)
if (data.created) {
  const link = new URL('/invitation', 'http://localhost:5173')
  link.hash = new URLSearchParams({ token }).toString()
  const delivery = await sendLocalInvitation(`${local.MAILPIT_URL}/api/v1/send`, {
    to: data.invitation.email,
    role: 'owner',
    link: link.toString(),
  })
  const recorded = await admin.rpc('record_invitation_delivery', {
    target_invitation_id: data.invitation.id,
    outcome: delivery,
  })
  assert.equal(recorded.error, null, recorded.error?.message)
  console.log(
    `Archive ${data.archiveId}: invitation saved; delivery ${delivery}. Check ${local.MAILPIT_URL}.`,
  )
} else {
  console.log(`Archive ${data.archiveId}: ${data.outcome}; no new invitation or email issued.`)
}
