import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

    // Admin client bypasses RLS — reliable for availability checks regardless
    // of profile_visibility or any other row-level policy on the users table
    const admin = createAdminClient()

    // Get the current user so we can exclude their own row from the check
    // (prevents their previously-saved username from appearing as "taken")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Availability check — count matching rows, excluding the current user's own
    let availQuery = admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
    if (user) availQuery = availQuery.neq('id', user.id)

    const { count, error: queryError } = await availQuery

    console.log('[api/username] check:', { username, userId: user?.id, count, queryError: queryError?.message })

    if (queryError) {
      console.error('[api/username] Availability query error:', queryError)
      return NextResponse.json({ error: 'Could not check availability. Please try again.' }, { status: 500 })
    }

    if (count && count > 0) {
      return NextResponse.json({ available: false }, { status: 200 })
    }

    if (checkOnly) {
      return NextResponse.json({ available: true }, { status: 200 })
    }

    // Create profile — requires authenticated user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove any orphaned rows with the same email but a different id.
    // This can happen when a user's auth id changes (e.g. re-signup) and leaves
    // a stale row that would violate the unique constraint on email.
    await admin.from('users').delete().eq('email', user.email!).neq('id', user.id)

    // Upsert user profile using admin client + explicit conflict column so RLS
    // never interferes with the insert-or-update decision.
    const { error: insertError } = await admin.from('users').upsert(
      {
        id: user.id,
        email: user.email!,
        username,
        name: name || user.user_metadata?.full_name || '',
        avatar_url: avatar_url || user.user_metadata?.avatar_url || null,
        profile_visibility: 'public',
      },
      { onConflict: 'id' },
    )

    if (insertError) {
      if (insertError.code === '23505') {
        console.error('[api/username] Unique constraint on upsert:', insertError)
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
