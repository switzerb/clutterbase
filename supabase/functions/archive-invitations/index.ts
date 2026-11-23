import { env } from 'node:process'
import {
  createCredential,
  digestCredential,
  sendLocalInvitation,
} from '../_shared/invitation-delivery.ts'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (value: unknown): value is string => typeof value === 'string' && uuid.test(value)
const reply = (status: number, body: unknown) => Response.json(body, { status, headers })
const knownErrors = new Set([
  'owner_required',
  'retry_conflict',
  'member_blocked',
  'membership_exists',
  'send_rate_limited',
  'invitation_not_pending',
  'replacement_mismatch',
  'invitation_exists',
  'invitation_not_found',
])

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply(405, { outcome: 'method_not_allowed' })
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer '))
      return reply(401, { outcome: 'authentication_required' })
    const url = env.SUPABASE_URL
    const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY
    const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key || !secret) return reply(503, { outcome: 'service_unavailable' })
    let input: Record<string, unknown>
    try {
      const parsed: unknown = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return reply(400, { outcome: 'invalid_request' })
      }
      input = parsed as Record<string, unknown>
    } catch {
      return reply(400, { outcome: 'invalid_request' })
    }
    const { action } = input
    const fields =
      action === 'accept'
        ? ['action', 'token']
        : action === 'list'
          ? ['action', 'archiveId']
          : action === 'cancel'
            ? ['action', 'archiveId', 'invitationId']
            : ['action', 'archiveId', 'email', 'role', 'retryId', 'replacesId']
    if (
      !['create', 'resend', 'accept', 'cancel', 'list'].includes(String(action)) ||
      Object.keys(input).some((name) => !fields.includes(name)) ||
      (action !== 'accept' && !isUuid(input.archiveId))
    ) {
      return reply(400, { outcome: 'invalid_request' })
    }
    if (
      action === 'accept' &&
      (typeof input.token !== 'string' || !/^[0-9a-f]{64}$/.test(input.token))
    ) {
      return reply(400, { outcome: 'invalid_invitation' })
    }
    if (action === 'cancel' && !isUuid(input.invitationId))
      return reply(400, { outcome: 'invalid_request' })
    if (action === 'create' || action === 'resend') {
      if (
        !isUuid(input.retryId) ||
        typeof input.email !== 'string' ||
        input.email.length > 320 ||
        !['owner', 'contributor'].includes(String(input.role)) ||
        (action === 'resend' ? !isUuid(input.replacesId) : input.replacesId !== undefined)
      ) {
        return reply(400, { outcome: 'invalid_request' })
      }
    }

    try {
      const auth = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: key, Authorization: authorization },
        signal: AbortSignal.timeout(10_000),
      })
      if (!auth.ok)
        return reply(auth.status >= 500 || auth.status === 429 ? 503 : 401, {
          outcome:
            auth.status >= 500 || auth.status === 429
              ? 'service_unavailable'
              : 'authentication_required',
        })
      const caller = await auth.json()
      const rpc = async (name: string, parameters: unknown, privileged = false) => {
        const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
          method: 'POST',
          headers: {
            apikey: privileged ? secret : key,
            ...(privileged
              ? secret.startsWith('eyJ')
                ? { Authorization: `Bearer ${secret}` }
                : {}
              : { Authorization: authorization }),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parameters),
          signal: AbortSignal.timeout(10_000),
        })
        const text = await response.text()
        const data = text ? JSON.parse(text) : null
        if (!response.ok)
          throw new Error(knownErrors.has(data?.message) ? data.message : 'unconfirmed')
        return data
      }
      if (action === 'accept') {
        return reply(
          200,
          await rpc('accept_archive_invitation', {
            credential_digest: await digestCredential(input.token as string),
          }),
        )
      }
      const configuredMode = env.INVITATION_DELIVERY_MODE ?? 'manual'
      if (!['manual', 'mailpit'].includes(configuredMode)) {
        return reply(503, { outcome: 'delivery_not_configured' })
      }
      const deliveryMode = configuredMode === 'manual' ? 'manual' : 'email'
      if (action === 'list')
        return reply(200, {
          deliveryMode,
          invitations: await rpc('list_archive_invitations', {
            target_archive_id: input.archiveId,
          }),
        })
      if (action === 'cancel')
        return reply(200, {
          invitation: await rpc('cancel_archive_invitation', {
            target_archive_id: input.archiveId,
            target_invitation_id: input.invitationId,
          }),
        })

      // Manual links need only the canonical origin, not a mail service.
      const deliveryEndpoint = env.INVITATION_MAILPIT_URL
      const origin = env.APP_ORIGIN
      if (!origin) return reply(503, { outcome: 'delivery_not_configured' })
      const appOrigin = new URL(origin)
      if (
        appOrigin.username ||
        appOrigin.password ||
        appOrigin.pathname !== '/' ||
        appOrigin.search ||
        appOrigin.hash ||
        (appOrigin.protocol !== 'https:' &&
          !(
            appOrigin.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(appOrigin.hostname)
          ))
      ) {
        return reply(503, { outcome: 'delivery_not_configured' })
      }
      // Mailpit remains an explicitly enabled local-only adapter.
      if (
        configuredMode === 'mailpit' &&
        (!deliveryEndpoint ||
          !['127.0.0.1', 'localhost', 'kong', 'supabase_kong_clutterbase'].includes(
            new URL(url).hostname,
          ))
      ) {
        return reply(503, { outcome: 'delivery_not_configured' })
      }
      const token = createCredential()
      const issued = await rpc(
        'issue_archive_invitation',
        {
          verified_caller_id: caller.id,
          retry_id: input.retryId,
          target_archive_id: input.archiveId,
          invited_email: input.email,
          invited_role: input.role,
          replaces_id: action === 'resend' ? input.replacesId : null,
          credential_digest: await digestCredential(token),
          delivery_mode: deliveryMode,
        },
        true,
      )
      const link = new URL('/invitation', appOrigin)
      link.hash = new URLSearchParams({ token }).toString()
      if (issued.created && configuredMode === 'mailpit') {
        const delivery = await sendLocalInvitation(deliveryEndpoint!, {
          to: issued.invitation.email,
          role: issued.invitation.role,
          link: link.toString(),
        })
        await rpc(
          'record_invitation_delivery',
          { target_invitation_id: issued.invitation.id, outcome: delivery },
          true,
        )
      }
      // Reconcile cancellation/replacement that may have won while delivery was in flight.
      const current = await rpc('list_archive_invitations', { target_archive_id: input.archiveId })
      const invitation = current.find((item: { id: string }) => item.id === issued.invitation.id)
      const revealLink =
        configuredMode === 'manual' &&
        issued.created &&
        invitation?.status === 'pending' &&
        Date.parse(invitation.expiresAt) > Date.now()
      return reply(200, {
        outcome: issued.created ? 'created' : 'reconciled',
        invitation,
        ...(revealLink ? { link: link.toString() } : {}),
      })
    } catch (error) {
      const outcome =
        error instanceof Error && knownErrors.has(error.message) ? error.message : 'unconfirmed'
      return reply(outcome === 'owner_required' ? 403 : outcome === 'unconfirmed' ? 503 : 409, {
        outcome,
      })
    }
  },
}
