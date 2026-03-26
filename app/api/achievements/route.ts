import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scrape'

// GET /api/achievements?user_id=<id>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false, nullsFirst: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ achievements: data })
  } catch (err) {
    console.error('[api/achievements GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// POST /api/achievements
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, date, link, image_url } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required.' }, { status: 400 })
    }

    // Scrape achievement link in the background at save time
    const scraped_content = link?.trim() ? await scrapeUrl(link.trim()) : null

    const { data, error } = await supabase
      .from('achievements')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() ?? null,
        date: date ?? null,
        link: link?.trim() ?? null,
        image_url: image_url ?? null,
        scraped_content: scraped_content && Object.keys(scraped_content).length ? scraped_content : null,
      })
      .select()
      .single()

    if (error) {
      console.error('[api/achievements POST]', error)
      return NextResponse.json({ error: 'Failed to create achievement.' }, { status: 500 })
    }

    return NextResponse.json({ achievement: data }, { status: 201 })
  } catch (err) {
    console.error('[api/achievements POST] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/achievements
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

    const allowed = ['title', 'description', 'date', 'link', 'image_url'] as const
    type AllowedField = typeof allowed[number]
    const safeUpdates: Partial<Record<AllowedField | 'scraped_content', unknown>> = {}

    for (const key of allowed) {
      if (key in updates) {
        safeUpdates[key] = updates[key]
      }
    }

    // Re-scrape if link was updated
    if ('link' in updates && updates.link) {
      const scraped = await scrapeUrl(updates.link.trim())
      safeUpdates.scraped_content = Object.keys(scraped).length ? scraped : null
    } else if ('link' in updates && !updates.link) {
      safeUpdates.scraped_content = null
    }

    const { data, error } = await supabase
      .from('achievements')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[api/achievements PATCH]', error)
      return NextResponse.json({ error: 'Failed to update achievement.' }, { status: 500 })
    }

    return NextResponse.json({ achievement: data })
  } catch (err) {
    console.error('[api/achievements PATCH] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// DELETE /api/achievements?id=<id>
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
      .from('achievements')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[api/achievements DELETE]', error)
      return NextResponse.json({ error: 'Failed to delete achievement.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/achievements DELETE] Unexpected:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
