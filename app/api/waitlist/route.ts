import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const RESERVED = new Set([
  'admin', 'api', 'login', 'logout', 'signup', 'onboarding',
  'settings', 'help', 'support', 'about', 'terms', 'privacy',
  'blog', 'docs', 'dashboard', 'profile', 'edit', 'tip', 'waitlist',
])

export async function GET() {
  try {
    const admin = createAdminClient()
    const { count } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json()

    // Validate
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }
    if (!username || !USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: lowercase letters, numbers, underscores only.' },
        { status: 400 },
      )
    }
    if (RESERVED.has(username)) {
      return NextResponse.json({ error: 'That username is reserved.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check username taken in live users table
    const { count: liveCount } = await admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
    if (liveCount && liveCount > 0) {
      return NextResponse.json({ error: 'That username is already taken.', field: 'username' }, { status: 409 })
    }

    // Check username already reserved in waitlist
    const { count: waitlistCount } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
    if (waitlistCount && waitlistCount > 0) {
      return NextResponse.json({ error: 'That username is already reserved.', field: 'username' }, { status: 409 })
    }

    // Check email already on waitlist
    const { count: emailCount } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.toLowerCase().trim())
    if (emailCount && emailCount > 0) {
      return NextResponse.json({ error: 'That email is already on the waitlist.', field: 'email' }, { status: 409 })
    }

    // Insert
    const { error } = await admin.from('waitlist').insert({
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
    })

    if (error) {
      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'email' : 'username'
        return NextResponse.json({ error: 'Already reserved — try a different one.', field }, { status: 409 })
      }
      console.error('[api/waitlist] Insert error:', error)
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, username }, { status: 201 })
  } catch (err) {
    console.error('[api/waitlist] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function HEAD(request: NextRequest) {
  // Username availability check — ?username=foo
  const username = new URL(request.url).searchParams.get('username')
  if (!username || !USERNAME_REGEX.test(username) || RESERVED.has(username)) {
    return new NextResponse(null, { status: 400 })
  }

  const admin = createAdminClient()

  const [{ count: liveCount }, { count: wlCount }] = await Promise.all([
    admin.from('users').select('id', { count: 'exact', head: true }).eq('username', username),
    admin.from('waitlist').select('id', { count: 'exact', head: true }).eq('username', username),
  ])

  const taken = (liveCount ?? 0) > 0 || (wlCount ?? 0) > 0
  return new NextResponse(null, { status: taken ? 409 : 200 })
}
