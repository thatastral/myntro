import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

async function getUserProfilePath(_request: NextRequest, userId: string): Promise<string> {
  // Use service role key to bypass RLS — ensures we can always read the user's
  // own row regardless of profile_visibility or any other policy.
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }) } },
  )
  const { data } = await admin.from('users').select('username').eq('id', userId).single()
  return data?.username ? `/${data.username}/edit` : '/onboarding'
}

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — IMPORTANT: do not add logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect /onboarding — unauthenticated users go to login
  if (pathname.startsWith('/onboarding') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated users who already have a username should not see onboarding
  if (pathname.startsWith('/onboarding') && user) {
    const dest = request.nextUrl.clone()
    dest.pathname = await getUserProfilePath(request, user.id)
    if (dest.pathname !== '/onboarding') {
      return NextResponse.redirect(dest)
    }
  }

  // Protect /[username]/edit
  const editPattern = /^\/[^/]+\/edit(\/.*)?$/
  if (editPattern.test(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from landing / login / signup to their profile
  if (user && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    const dest = request.nextUrl.clone()
    dest.pathname = await getUserProfilePath(request, user.id)
    return NextResponse.redirect(dest)
  }

  // Protect /admin — must be logged in with an admin email
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
    if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
