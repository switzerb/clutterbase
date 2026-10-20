import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { test } from 'node:test'

const id = '20000000-0000-0000-0000-000000000001'
const path = `items/${id}/original.pdf`
// Exercise the actual server action, replacing only Next/Supabase I/O boundaries.
function registrationHarness({ row = null, original = true, conflict = false, denied = false } = {}) {
  let reads = 0
  let inserts = 0
  let infos = 0
  const saved = { id, file_path: path, uploaded_by: 'user', organization_id: 'org' }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'user', app_metadata: { organization_id: 'org' } } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ++reads > 1 && conflict ? saved : row, error: null }) }) }),
      insert: async record => {
        inserts++
        assert.equal(record.id, id)
        return { error: conflict ? { code: '23505' } : denied ? { code: '42501' } : null }
      },
    }),
    storage: { from: () => ({ info: async () => {
      infos++
      return original ? { data: { contentType: 'application/pdf' }, error: null } : { data: null, error: { message: 'missing' } }
    } }) },
  }
  const exports = {}
  const source = ts.transpileModule(readFileSync(new URL('../app/upload/actions.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, { exports, require: name => {
    if (name === '@/lib/supabase/server') return { createClient: async () => client }
    if (name === 'next/cache') return { revalidatePath() {} }
    if (name === '@/lib/storage') return { isThumbnailable: () => false }
    throw new Error(`Unexpected dependency ${name}`)
  } })
  return { register: exports.registerItem, counts: () => ({ reads, inserts, infos }), saved }
}

test('registration recognizes a previously committed retry without inserting again', async () => {
  const row = { id, file_path: path, uploaded_by: 'user', organization_id: 'org' }
  const harness = registrationHarness({ row })
  assert.equal((await harness.register(id, 'Letter', path, 'application/pdf')).itemId, id)
  assert.equal(harness.counts().inserts, 0)
  assert.equal(harness.counts().infos, 0)
})

test('registration handles an insert conflict by checking the committed item', async () => {
  const harness = registrationHarness({ conflict: true })
  assert.equal((await harness.register(id, 'Letter', path, 'application/pdf')).itemId, id)
  assert.deepEqual(harness.counts(), { reads: 2, inserts: 1, infos: 1 })
})

test('registration rejects missing originals, foreign owners, and paths for another item', async () => {
  const missing = registrationHarness({ original: false })
  assert.equal(typeof (await missing.register(id, 'Letter', path, 'application/pdf')).error, 'string')
  assert.equal(missing.counts().inserts, 0)
  const foreign = registrationHarness({ row: { id, file_path: path, uploaded_by: 'someone-else', organization_id: 'org' } })
  assert.equal(typeof (await foreign.register(id, 'Letter', path, 'application/pdf')).error, 'string')
  const invalid = registrationHarness()
  assert.equal((await invalid.register(id, 'Letter', 'items/other/original.pdf', 'application/pdf')).error, 'Invalid upload details.')
  assert.equal(invalid.counts().reads, 0)
})

test('registration failure returns a recoverable error instead of deleting the original', async () => {
  const harness = registrationHarness({ denied: true })
  assert.match((await harness.register(id, 'Letter', path, 'application/pdf')).error, /Retry to finish/)
  assert.equal(harness.counts().inserts, 1)
})
