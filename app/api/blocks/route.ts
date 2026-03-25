import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ── OG image helper ────────────────────────────────────────────────

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Myntrobot/1.0 (link preview)' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    // og:image (both attribute orders)
    const og =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
    if (og) return og
    // twitter:image fallback
    const tw =
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1]
    return tw ?? null
  } catch {
    return null
  }
}

// GET /api/blocks?username=<username>
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: user } = await admin.from('users').select('id').eq('username', username).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: blocks, error } = await admin
    .from('blocks')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ blocks: blocks ?? [] })
}

// POST /api/blocks — create a block
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, content, span = 1, section_id = null } = body

  if (!type || !content) return NextResponse.json({ error: 'type and content required' }, { status: 400 })

  // Enrich link blocks with OG image at save time
  let enrichedContent = { ...content }
  if (type === 'link' && content.url) {
    const ogImage = await fetchOgImage(content.url)
    if (ogImage) enrichedContent.og_image = ogImage
  }

  const admin = createAdminClient()

  // Get max display_order within the target container (section or free)
  const { data: last } = await (section_id
    ? admin.from('blocks').select('display_order').eq('user_id', user.id).eq('section_id', section_id).order('display_order', { ascending: false }).limit(1).maybeSingle()
    : admin.from('blocks').select('display_order').eq('user_id', user.id).is('section_id', null).order('display_order', { ascending: false }).limit(1).maybeSingle())

  const { data, error } = await admin
    .from('blocks')
    .insert({
      user_id: user.id,
      type,
      content: enrichedContent,
      span,
      section_id,
      display_order: (last?.display_order ?? -1) + 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data }, { status: 201 })
}

// PATCH /api/blocks?id=<id> — update content / section_id / display_order
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await request.json()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('blocks')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data })
}

// DELETE /api/blocks?id=<id>
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('blocks').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
