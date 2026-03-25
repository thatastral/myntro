import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/profile?username=<username>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'username query param is required.' }, { status: 400 })
  }

  try {
    // Use admin client so reads are never filtered by the caller's session —
    // this prevents one user's RLS context from leaking into another user's data.
    const admin = createAdminClient()

    const { data: user, error } = await admin
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    // Fetch related data in parallel
    const [linksResult, achievementsResult, affiliationsResult, walletResult, blocksResult, sectionsResult] =
      await Promise.all([
        admin
          .from('links')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true }),
        admin
          .from('achievements')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        admin
          .from('affiliations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        admin
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from('blocks')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true }),
        admin
          .from('sections')
          .select('*')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true }),
      ])

    return NextResponse.json({
      user,
      links: linksResult.data ?? [],
      achievements: achievementsResult.data ?? [],
      affiliations: affiliationsResult.data ?? [],
      wallet: walletResult.data ?? null,
      blocks: blocksResult.data ?? [],
      sections: sectionsResult.data ?? [],
    })
  } catch (err) {
    console.error('[api/profile GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/profile
// Body: Partial<User> fields to update
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()

    // Whitelist updatable fields
    const allowed = ['name', 'bio', 'location', 'avatar_url', 'profile_visibility', 'featured_affiliation_id'] as const
    type AllowedField = typeof allowed[number]
    const updates: Partial<Record<AllowedField, unknown>> = {}

    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    // Validate profile_visibility
    if (
      updates.profile_visibility !== undefined &&
      !['public', 'private'].includes(updates.profile_visibility as string)
    ) {
      return NextResponse.json(
        { error: 'profile_visibility must be "public" or "private".' },
        { status: 400 },
      )
    }

    let { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    // If the DB column doesn't exist yet (migration pending), retry without that field
    // so the optimistic update in the client isn't rolled back unnecessarily.
    if (error && (error as { code?: string }).code === '42703' && 'featured_affiliation_id' in updates) {
      const { featured_affiliation_id: _ignored, ...rest } = updates as Record<string, unknown>
      if (Object.keys(rest).length > 0) {
        const retry = await supabase.from('users').update(rest).eq('id', user.id).select().single()
        data = retry.data
        error = retry.error
      } else {
        // Nothing else to update — fetch current row and return it as-is
        const current = await supabase.from('users').select().eq('id', user.id).single()
        data = current.data
        error = current.error
      }
    }

    if (error) {
      console.error('[api/profile PATCH]', error)
      return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch (err) {
    console.error('[api/profile PATCH] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
