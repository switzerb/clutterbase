import assert from 'node:assert/strict'
import { test } from 'node:test'
import { safeRedirectPath } from '../lib/supabase/redirect.ts'
import { getSupabaseConfig } from '../lib/supabase/config.ts'

test('auth redirects preserve local paths and reject external or ambiguous targets', () => {
  for (const path of ['/people', '/?q=letters', '/items/123#details']) {
    assert.equal(safeRedirectPath(path), path)
  }
  for (const path of [null, '', 'https://example.com', '//example.com', '/\\example.com', '/\n/example.com', 'javascript:alert(1)']) {
    assert.equal(safeRedirectPath(path), '/')
  }
})

test('public config prefers the new key, supports migration fallback, and fails without a key', () => {
  const names = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
  const saved = names.map(name => process.env[name])
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-test'
    assert.equal(getSupabaseConfig().key, 'sb_publishable_test')
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    assert.equal(getSupabaseConfig().key, 'legacy-test')
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    assert.throws(getSupabaseConfig, /PUBLISHABLE_KEY/)
  } finally {
    names.forEach((name, i) => {
      if (saved[i] === undefined) delete process.env[name]
      else process.env[name] = saved[i]
    })
  }
})
