import { env } from 'node:process'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}
const reply = (status: number, body: unknown) => Response.json(body, { status, headers })

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply(405, { outcome: 'method_not_allowed' })
    let email: string
    try {
      const body: unknown = await request.json()
      if (
        !body ||
        typeof body !== 'object' ||
        !('email' in body) ||
        typeof body.email !== 'string' ||
        Object.keys(body).length !== 1
      ) {
        return reply(400, { outcome: 'invalid_email' })
      }
      email = body.email.trim().toLowerCase()
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+$/.test(email))
        return reply(400, { outcome: 'invalid_email' })
    } catch {
      return reply(400, { outcome: 'invalid_email' })
    }
    const url = env.SUPABASE_URL
    const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY
    if (!url || !key) return reply(503, { outcome: 'service_unavailable' })
    try {
      const result = await fetch(`${url}/auth/v1/otp`, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, create_user: true }),
        signal: AbortSignal.timeout(10_000),
      })
      if (result.status === 429) {
        const timing = result.headers.get('Retry-After')
        return reply(429, { outcome: 'rate_limited', ...(timing ? { retryAfter: timing } : {}) })
      }
      const data = await result.json()
      if (
        !result.ok &&
        ![
          'hook_payload_invalid',
          'hook_error',
          'signup_disabled',
          'email_provider_disabled',
        ].includes(data.code) &&
        result.status !== 403
      ) {
        return reply(503, { outcome: 'unconfirmed' })
      }
      // Both successful requests and admission denial receive exactly this application feedback.
      return reply(200, { outcome: 'code_requested', resendCooldown: 60 })
    } catch {
      return reply(503, { outcome: 'unconfirmed' })
    }
  },
}
