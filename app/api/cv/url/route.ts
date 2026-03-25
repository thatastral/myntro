import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { chatCompletion } from '@/lib/ai/deepseek'

const MAX_HTML_SIZE = 500_000 // 500 KB of raw HTML

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

// POST /api/cv/url — fetch a CV/portfolio URL and extract professional info
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required.' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are supported.' }, { status: 400 })
    }

    // Fetch the page
    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Myntro-CV-Bot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: `Could not fetch page (HTTP ${res.status}). Make sure the URL is publicly accessible.` },
          { status: 400 },
        )
      }
      const raw = await res.text()
      html = raw.slice(0, MAX_HTML_SIZE)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Failed to fetch URL: ${msg.includes('timeout') ? 'request timed out' : 'page unreachable'}` },
        { status: 400 },
      )
    }

    // Strip HTML → plain text
    const rawText = stripHtml(html).slice(0, 30000)

    if (rawText.length < 50) {
      return NextResponse.json({ error: 'Could not extract any text from that page.' }, { status: 400 })
    }

    // Use Groq to extract structured professional information
    let parsedText: string
    try {
      parsedText = await chatCompletion([
        {
          role: 'system',
          content: `You are a CV/resume parser. The user will provide raw text scraped from a professional profile or CV page.
Extract all relevant professional information and rewrite it as clean, structured plain text with the following sections (include only those present):
- Full Name
- Headline / Current Role
- Summary / Bio
- Work Experience (company, title, dates, description for each role)
- Education (institution, degree, dates)
- Skills
- Projects / Portfolio
- Certifications / Achievements
- Links / Social

Write it clearly and concisely. Do not invent information. If a section has no data, omit it.`,
        },
        {
          role: 'user',
          content: `Extract professional information from this page scraped from ${url}:\n\n${rawText}`,
        },
      ])
    } catch (err) {
      console.warn('[api/cv/url] AI extraction failed, using raw text:', err)
      parsedText = rawText
    }

    parsedText = parsedText.slice(0, 50000)

    const admin = createAdminClient()

    const { data: doc, error: docError } = await admin
      .from('documents')
      .insert({
        user_id: user.id,
        file_url: url,
        parsed_text: parsedText,
        source_type: 'url',
        source_name: parsedUrl.hostname,
      })
      .select()
      .single()

    if (docError) {
      // source_type / source_name columns may not exist yet — retry without them
      const { data: docFallback, error: fallbackError } = await admin
        .from('documents')
        .insert({ user_id: user.id, file_url: url, parsed_text: parsedText })
        .select()
        .single()
      if (fallbackError) {
        console.error('[api/cv/url] Document insert error:', fallbackError)
        return NextResponse.json({ error: 'Failed to save document.' }, { status: 500 })
      }
      return NextResponse.json({ success: true, document_id: docFallback.id, chars_extracted: parsedText.length })
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      chars_extracted: parsedText.length,
      source: parsedUrl.hostname,
    })
  } catch (err) {
    console.error('[api/cv/url] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
