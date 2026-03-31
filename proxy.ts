import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

async function getUserProfilePath(request: NextRequest, userId: string): Promise<{ path: string; username: string | null }> {
  // Check cookie cache first — avoids a DB query on repeat visits
  const cached = request.cookies.get('myntro-u')?.value
  if (cached) return { path: `/${cached}/edit`, username: null } // null = already cached, no need to re-set

  // Use service role key to bypass RLS — ensures we can always read the user's
  // own row regardless of profile_visibility or any other policy.
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }) } },
  )
  const { data } = await admin.from('users').select('username').eq('id', userId).single()
  const username = data?.username ?? null
  return { path: username ? `/${username}/edit` : '/onboarding', username }
}

export default async function proxy(request: NextRequest) {
  // Maintenance mode — unauthenticated visitors only see /waitlist.
  // Authenticated users (beta testers who signed up) pass through so they
  // can reach /onboarding and their edit page.
  // Auth routes are always allowed so Google OAuth can complete.
  const { pathname } = request.nextUrl
  if (process.env.MAINTENANCE_MODE === 'true') {
    const publicAllowed =
      pathname === '/waitlist' ||
      pathname.startsWith('/api/waitlist') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/email') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/beta-check') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/_next')

    if (!publicAllowed) {
      // Check session — authenticated users pass through
      const tempClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll() {},
          },
        },
      )
      const { data: { user: tempUser } } = await tempClient.auth.getUser()
      if (!tempUser) {
        const url = request.nextUrl.clone()
        url.pathname = '/waitlist'
        return NextResponse.redirect(url)
      }
    }
  }

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

  // Protect /onboarding — unauthenticated users go to login
  if (pathname.startsWith('/onboarding') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated users who already have a username should not see onboarding
  if (pathname.startsWith('/onboarding') && user) {
    const { path, username } = await getUserProfilePath(request, user.id)
    if (path !== '/onboarding') {
      const dest = request.nextUrl.clone()
      dest.pathname = path
      const res = NextResponse.redirect(dest)
      if (username) res.cookies.set('myntro-u', username, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' })
      return res
    }

    // Private beta gate — user is authenticated but has no username yet.
    // Admin emails always bypass. Everyone else must be in the beta_testers table.
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
    const isAdmin = adminEmails.includes((user.email ?? '').toLowerCase())

    if (!isAdmin) {
      const betaAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { global: { fetch: (url, opts = {}) => fetch(url, { ...opts, cache: 'no-store' }) } },
      )
      const { data: betaTester } = await betaAdmin
        .from('beta_testers')
        .select('id')
        .ilike('email', user.email ?? '')
        .maybeSingle()

      if (!betaTester) {
        const url = request.nextUrl.clone()
        url.pathname = '/waitlist'
        return NextResponse.redirect(url)
      }
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
  // Allow /forgot-password and /reset-password through even when authenticated
  if (user && (pathname === '/' || pathname === '/login' || pathname === '/signup') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
    const { path, username } = await getUserProfilePath(request, user.id)
    const dest = request.nextUrl.clone()
    dest.pathname = path
    const res = NextResponse.redirect(dest)
    if (username) res.cookies.set('myntro-u', username, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' })
    return res
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
    '/((?!_next/static|_next/image|favicon.ico|api/rpc|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
