import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/links?user_id=<id>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ links: data })
  } catch (err) {
    console.error('[api/links GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ── Follower count helpers ──────────────────────────────────────────

async function fetchGithubFollowers(url: string): Promise<number | null> {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('github.com')) return null
    const username = u.pathname.split('/').filter(Boolean)[0]
    if (!username) return null
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: { 'User-Agent': 'Myntrobot/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as { followers?: number }
    return data.followers ?? null
  } catch {
    return null
  }
}

async function tryFetchFollowerCount(url: string, icon: string | null): Promise<number | null> {
  if (icon === 'github') return fetchGithubFollowers(url)
  return null
}

// POST /api/links  — create a new link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { title, url, icon } = body

    if (!title || !url) {
      return NextResponse.json({ error: 'title and url are required.' }, { status: 400 })
    }

    // Auto-fetch follower count where supported
    const follower_count = await tryFetchFollowerCount(url, icon ?? null)

    // Get current max display_order
    const { data: existing } = await supabase
      .from('links')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (existing?.display_order ?? -1) + 1

    const { data, error } = await supabase
      .from('links')
      .insert({
        user_id: user.id,
        title: title.trim(),
        url: url.trim(),
        icon: icon ?? null,
        display_order: nextOrder,
        follower_count,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/links POST]', error)
      return NextResponse.json({ error: 'Failed to create link.' }, { status: 500 })
    }

    return NextResponse.json({ link: data }, { status: 201 })
  } catch (err) {
    console.error('[api/links POST] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/links  — update a link (title, url, icon, display_order)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    }

    const allowed = ['title', 'url', 'icon', 'display_order', 'follower_count'] as const
    type AllowedField = typeof allowed[number]
    const safeUpdates: Partial<Record<AllowedField, unknown>> = {}

    for (const key of allowed) {
      if (key in updates) {
        safeUpdates[key] = updates[key]
      }
    }

    const { data, error } = await supabase
      .from('links')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', user.id) // ownership check
      .select()
      .single()

    if (error) {
      console.error('[api/links PATCH]', error)
      return NextResponse.json({ error: 'Failed to update link.' }, { status: 500 })
    }

    return NextResponse.json({ link: data })
  } catch (err) {
    console.error('[api/links PATCH] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// DELETE /api/links?id=<id>
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[api/links DELETE]', error)
      return NextResponse.json({ error: 'Failed to delete link.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/links DELETE] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
