import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()

        // Check if user already has a profile (returning user)
        const { data: profile } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single()

        if (profile?.username) {
          return NextResponse.redirect(`${origin}/${profile.username}/edit`)
        }

        // New user — verify they're on the beta list before proceeding
        const { data: betaTester } = await admin
          .from('beta_testers')
          .select('id')
          .eq('email', (user.email ?? '').toLowerCase())
          .maybeSingle()

        if (!betaTester) {
          // Not on beta list — sign them out and redirect with error
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/signup?error=beta_required`)
        }
      }
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
