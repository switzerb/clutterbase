import { getSupabase, invokeOperation, OperationError } from './supabase'

export interface Identity {
  id: string
  email: string
}
export interface ArchiveAccess {
  id: string
  name: string
  role: 'owner' | 'contributor'
}

export const authGateway = {
  async identity(this: void): Promise<Identity | null> {
    const client = getSupabase()
    const session = await client.auth.getSession()
    if (session.error) throw new OperationError('unconfirmed')
    if (!session.data.session) return null
    const { data, error } = await client.auth.getUser()
    if (error) {
      if (error.status === 401 || error.status === 403) return null
      throw new OperationError('unconfirmed')
    }
    return data.user ? { id: data.user.id, email: data.user.email ?? '' } : null
  },
  async access(this: void, userId: string): Promise<ArchiveAccess | null> {
    let query = getSupabase()
      .from('archive_memberships')
      .select('archive_id,role,archives(id,name)')
      .eq('user_id', userId)
      .eq('blocked', false)
    if (import.meta.env.VITE_ARCHIVE_ID)
      query = query.eq('archive_id', import.meta.env.VITE_ARCHIVE_ID)
    const { data, error } = await query
    if (error) throw new OperationError('unconfirmed')
    if (!data?.length) return null
    if (data.length !== 1) throw new OperationError('archive_configuration_required')
    const row = data[0]!
    const archive = row.archives as unknown as { id: string; name: string } | null
    if (!archive || !['owner', 'contributor'].includes(row.role)) return null
    return { id: archive.id, name: archive.name, role: row.role }
  },
  subscribe(this: void, changed: (identity: Identity | null) => void) {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      changed(session ? { id: session.user.id, email: session.user.email ?? '' } : null)
    })
    return () => data.subscription.unsubscribe()
  },
  requestCode(this: void, email: string) {
    return invokeOperation<{ outcome: string; resendCooldown: number }>(
      'request-code',
      { email },
      false,
    )
  },
  async verifyCode(this: void, email: string, token: string) {
    const { error } = await getSupabase().auth.verifyOtp({ email, token, type: 'email' })
    if (error)
      throw new OperationError(
        error.status === 429
          ? 'rate_limited'
          : error.code === 'otp_expired' || error.code === 'otp_disabled'
            ? 'invalid_code'
            : 'unconfirmed',
      )
  },
  async google(this: void) {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid email profile',
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw new OperationError('google_failed')
  },
  async exchange(this: void, code: string) {
    const { error } = await getSupabase().auth.exchangeCodeForSession(code)
    if (error)
      throw new OperationError(error.status && error.status < 500 ? 'google_failed' : 'unconfirmed')
  },
  async signOut(this: void) {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' })
    if (error) throw new OperationError('signout_unconfirmed')
  },
}
