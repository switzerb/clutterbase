import { env } from 'node:process'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const reply = (status: number, body: unknown) => Response.json(body, { status, headers })

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply(405, { outcome: 'method_not_allowed' })
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer '))
      return reply(401, { outcome: 'authentication_required' })
    const url = env.SUPABASE_URL
    const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY
    if (!url || !key) return reply(503, { outcome: 'service_unavailable' })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return reply(400, { outcome: 'invalid_request' })
    }
    if (
      !body ||
      typeof body !== 'object' ||
      !('archiveId' in body) ||
      typeof body.archiveId !== 'string' ||
      !uuid.test(body.archiveId) ||
      !('userId' in body) ||
      typeof body.userId !== 'string' ||
      !uuid.test(body.userId) ||
      !('blocked' in body) ||
      typeof body.blocked !== 'boolean' ||
      Object.keys(body).some((name) => !['archiveId', 'userId', 'blocked'].includes(name))
    )
      return reply(400, { outcome: 'invalid_request' })

    try {
      // Auth verifies the token; the RPC still checks current archive ownership transactionally.
      const auth = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: key, Authorization: authorization },
        signal: AbortSignal.timeout(10_000),
      })
      if (!auth.ok) {
        return auth.status >= 500 || auth.status === 429
          ? reply(503, { outcome: 'service_unavailable' })
          : reply(401, { outcome: 'authentication_required' })
      }
      const result = await fetch(`${url}/rest/v1/rpc/set_contributor_block`, {
        method: 'POST',
        headers: { apikey: key, Authorization: authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_archive_id: body.archiveId,
          target_user_id: body.userId,
          should_block: body.blocked,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      const data = await result.json()
      if (result.ok) return reply(200, { outcome: 'confirmed', membership: data })
      if (data.message === 'owner_required' || data.message === 'owner_protected') {
        return reply(403, { outcome: data.message })
      }
      if (data.message === 'membership_not_found') return reply(404, { outcome: data.message })
      return reply(503, { outcome: 'unconfirmed' })
    } catch {
      // Do not log request bodies, tokens, or raw provider errors.
      // A mutation may have committed: retrying the same desired block state is safe.
      return reply(503, { outcome: 'unconfirmed' })
    }
  },
}
