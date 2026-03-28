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
  // Maintenance mode — redirect everything to /waitlist except the waitlist page and its API
  const { pathname } = request.nextUrl
  if (process.env.MAINTENANCE_MODE === 'true') {
    const allowed = pathname === '/waitlist' || pathname.startsWith('/api/waitlist') || pathname.startsWith('/api/admin') || pathname.startsWith('/_next')
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/waitlist'
      return NextResponse.redirect(url)
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
    const dest = request.nextUrl.clone()
    dest.pathname = await getUserProfilePath(request, user.id)
    if (dest.pathname !== '/onboarding') {
      return NextResponse.redirect(dest)
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
      const { count } = await betaAdmin
        .from('beta_testers')
        .select('id', { count: 'exact', head: true })
        .eq('email', user.email)

      if (!count || count === 0) {
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
