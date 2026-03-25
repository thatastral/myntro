import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

// GET /api/admin/affiliations?status=pending|all
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'pending'

  const admin = createAdminClient()
  let query = admin
    .from('affiliations')
    .select('*, users!affiliations_user_id_fkey(id, username, name, avatar_url)')
    .order('created_at', { ascending: true })

  if (status === 'pending') {
    query = query.eq('verified', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[api/admin/affiliations GET]', error)
    return NextResponse.json({ error: 'Failed to fetch affiliations.' }, { status: 500 })
  }

  return NextResponse.json({ affiliations: data })
}

// PATCH /api/admin/affiliations
// Body: { id: string, verified: boolean }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { id, verified } = await request.json()

  if (!id || typeof verified !== 'boolean') {
    return NextResponse.json({ error: 'id and verified (boolean) are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('affiliations')
    .update({ verified })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[api/admin/affiliations PATCH]', error)
    return NextResponse.json({ error: 'Failed to update affiliation.' }, { status: 500 })
  }

  return NextResponse.json({ affiliation: data })
}
