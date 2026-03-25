import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// POST /api/sections — create a section
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await request.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: last } = await admin
    .from('sections')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('sections')
    .insert({ user_id: user.id, title: title.trim(), display_order: (last?.display_order ?? -1) + 1 })
    .select()
    .single()

  if (error) {
    console.error('[api/sections POST]', error.code, error.message, error.details)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  return NextResponse.json({ section: data }, { status: 201 })
}

// PATCH /api/sections?id=<id> — update title or display_order
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sections')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ section: data })
}

// DELETE /api/sections?id=<id>
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('sections').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
