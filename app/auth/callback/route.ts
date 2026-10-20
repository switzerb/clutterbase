import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { safeRedirectPath } from '@/lib/supabase/redirect'

// OAuth/PKCE uses a code; SSR email templates can send a token_hash instead.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = safeRedirectPath(searchParams.get('next'))
  const response = NextResponse.redirect(new URL(next, origin))
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')

  const { url, key } = getSupabaseConfig()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })

  let authenticated = false
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authenticated = !error
  } else if (tokenHash && (type === 'email' || type === 'invite')) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    authenticated = !error
  }

  if (!authenticated) {
    response.headers.set('Location', new URL('/sign-in?error=1', origin).toString())
  }
  return response
}
