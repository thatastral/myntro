import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scrape'

// POST /api/blocks/rescrape
// Re-scrapes all link blocks for the authenticated user and saves fresh metadata.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Fetch all link blocks for this user
    const { data: blocks, error } = await admin
      .from('blocks')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('type', 'link')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!blocks?.length) return NextResponse.json({ updated: 0 })

    // Scrape each URL concurrently (capped at 5 at a time to avoid hammering)
    const results = await Promise.allSettled(
      blocks.map(async (block) => {
        const url = block.content?.url
        if (!url) return null

        const { title, description, og_image, text } = await scrapeUrl(url)

        const enriched = {
          ...block.content,
          ...(og_image ? { og_image } : {}),
          ...(title ? { scraped_title: title } : {}),
          ...(description ? { scraped_description: description } : {}),
          ...(text ? { scraped_text: text } : {}),
        }

        const { error: updateError } = await admin
          .from('blocks')
          .update({ content: enriched })
          .eq('id', block.id)
          .eq('user_id', user.id)

        if (updateError) throw updateError
        return block.id
      })
    )

    const updated = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ updated, failed, total: blocks.length })
  } catch (err) {
    console.error('[api/blocks/rescrape]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
