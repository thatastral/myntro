import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scrape'

// GET /api/affiliations?user_id=<id>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('affiliations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ affiliations: data })
  } catch (err) {
    console.error('[api/affiliations GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// POST /api/affiliations
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { community_name, role, logo_url, proof_link } = body

    if (!community_name) {
      return NextResponse.json({ error: 'community_name is required.' }, { status: 400 })
    }

    // Scrape proof link at save time for AI context
    const scraped_content = proof_link?.trim() ? await scrapeUrl(proof_link.trim()) : null

    const { data, error } = await supabase
      .from('affiliations')
      .insert({
        user_id: user.id,
        community_name: community_name.trim(),
        role: role?.trim() ?? null,
        logo_url: logo_url ?? null,
        proof_link: proof_link?.trim() ?? null,
        verified: false,
        scraped_content: scraped_content && Object.keys(scraped_content).length ? scraped_content : null,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/affiliations POST]', error)
      return NextResponse.json({ error: 'Failed to create affiliation.' }, { status: 500 })
    }

    return NextResponse.json({ affiliation: data }, { status: 201 })
  } catch (err) {
    console.error('[api/affiliations POST] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/affiliations
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { id, community_name, role, logo_url, proof_link } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 })
    }
    if (!community_name) {
      return NextResponse.json({ error: 'community_name is required.' }, { status: 400 })
    }

    // Re-scrape proof link if it changed
    const scraped_content = proof_link?.trim() ? await scrapeUrl(proof_link.trim()) : null

    const { data, error } = await supabase
      .from('affiliations')
      .update({
        community_name: community_name.trim(),
        role: role?.trim() ?? null,
        logo_url: logo_url ?? null,
        proof_link: proof_link?.trim() ?? null,
        scraped_content: scraped_content && Object.keys(scraped_content).length ? scraped_content : null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[api/affiliations PATCH]', error)
      return NextResponse.json({ error: 'Failed to update affiliation.' }, { status: 500 })
    }

    return NextResponse.json({ affiliation: data })
  } catch (err) {
    console.error('[api/affiliations PATCH] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// DELETE /api/affiliations?id=<id>
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
      .from('affiliations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[api/affiliations DELETE]', error)
      return NextResponse.json({ error: 'Failed to delete affiliation.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/affiliations DELETE] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
