import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('state') ?? '/onboarding'
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const cookieStore = await cookies()
  const codeVerifier = cookieStore.get('pkce_verifier')?.value

  if (!codeVerifier) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  // Exchange authorization code for tokens
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myntro.me'
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/callback/google`,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const { id_token } = await tokenRes.json() as { id_token: string }

  // Mint a Supabase session from the Google ID token
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

  const { error: signInError } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  })

  if (signInError) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const admin = createAdminClient()

  // Returning user — go straight to edit page
  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()

  const clearVerifier = (res: NextResponse) => {
    res.cookies.delete('pkce_verifier')
    return res
  }

  if (profile?.username) {
    return clearVerifier(NextResponse.redirect(`${origin}/${profile.username}/edit`))
  }

  // New user — beta gate
  const { data: betaTester } = await admin
    .from('beta_testers')
    .select('id')
    .ilike('email', user.email ?? '')
    .maybeSingle()

  if (!betaTester) {
    await admin.auth.admin.deleteUser(user.id)
    await supabase.auth.signOut()
    return clearVerifier(NextResponse.redirect(`${origin}/signup?error=beta_required`))
  }

  return clearVerifier(NextResponse.redirect(`${origin}/onboarding`))
}
