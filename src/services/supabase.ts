import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined
export function getSupabase() {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key?.startsWith('sb_publishable_')) throw new Error('configuration_missing')
    client = createClient(url, key, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return client
}

export class OperationError extends Error {
  constructor(
    public outcome: string,
    public retryAfter?: string,
  ) {
    super(outcome)
  }
}

export async function invokeOperation<T>(
  name: string,
  body: unknown,
  authenticated = true,
): Promise<T> {
  const client = getSupabase()
  const { data, error } = await client.auth.getSession()
  if (error) throw new OperationError('unconfirmed')
  if (authenticated && !data.session) throw new OperationError('authentication_required')
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        ...(authenticated ? { Authorization: `Bearer ${data.session!.access_token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      referrerPolicy: 'no-referrer',
    })
    const result = await response.json()
    if (!response.ok) throw new OperationError(result.outcome ?? 'unconfirmed', result.retryAfter)
    return result as T
  } catch (error) {
    if (error instanceof OperationError) throw error
    throw new OperationError('unconfirmed')
  }
}
