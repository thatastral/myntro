import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'login', 'logout', 'signup', 'onboarding',
  'settings', 'help', 'support', 'about', 'terms', 'privacy',
  'blog', 'docs', 'dashboard', 'profile', 'edit', 'tip',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, checkOnly = false, name = '', avatar_url = null } = body

    // Validate format
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 })
    }

    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: lowercase letters, numbers, underscores only.' },
        { status: 400 },
      )
    }

    if (RESERVED_USERNAMES.has(username)) {
      return NextResponse.json({ available: false, error: 'This username is reserved.' }, { status: 200 })
    }

    const supabase = await createClient()

    // Check availability
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ available: false }, { status: 200 })
    }

    if (checkOnly) {
      return NextResponse.json({ available: true }, { status: 200 })
    }

    // Create profile — requires authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert user profile
    const { error: insertError } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email!,
      username,
      name: name || user.user_metadata?.full_name || '',
      avatar_url: avatar_url || user.user_metadata?.avatar_url || null,
      profile_visibility: 'public',
    })

    if (insertError) {
      // Handle duplicate username race condition
      if (insertError.code === '23505') {
        return NextResponse.json({ available: false, error: 'Username just got taken.' }, { status: 409 })
      }
      console.error('[api/username] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, username }, { status: 201 })
  } catch (err) {
    console.error('[api/username] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
