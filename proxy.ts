import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseConfig } from '@/lib/supabase/config'

export async function proxy(request: NextRequest) {
  // Start with a response that forwards the incoming request cookies to the page.
  let supabaseResponse = NextResponse.next({ request })
  const { url, key } = getSupabaseConfig()

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Write refreshed tokens back into the request so the page sees them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild the response with the updated request, then apply cookies and
          // cache-control headers required by Supabase after a token refresh.
          const previousResponse = supabaseResponse
          supabaseResponse = NextResponse.next({ request })
          previousResponse.cookies.getAll().forEach(cookie => supabaseResponse.cookies.set(cookie))
          previousResponse.headers.forEach((value, name) => {
            if (name !== 'set-cookie') supabaseResponse.headers.set(name, value)
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Verify the JWT and refresh when needed. Privileged actions still use getUser()
  // for a fresh server-side account and role check.
  const { data, error } = await supabase.auth.getClaims()
  const signedIn = !error && !!data?.claims.sub

  function redirectWithSession(path: string) {
    const response = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    for (const name of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(name)
      if (value) response.headers.set(name, value)
    }
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  const { pathname } = request.nextUrl
  const isPublic = pathname === '/sign-in' || pathname.startsWith('/auth/')

  if (!signedIn && !isPublic) {
    return redirectWithSession('/sign-in')
  }

  if (signedIn && pathname === '/sign-in') {
    return redirectWithSession('/')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
