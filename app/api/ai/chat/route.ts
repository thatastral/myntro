import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding, chatCompletionStream } from '@/lib/ai/deepseek'
import type { ChatMessage } from '@/lib/ai/deepseek'

// POST /api/ai/chat
// Body: { username: string, question: string, history?: ChatMessage[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, question, history = [] } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username is required.' }, { status: 400 })
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'question is required.' }, { status: 400 })
    }

    if (question.length > 1000) {
      return NextResponse.json({ error: 'Question is too long (max 1000 chars).' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch user profile
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, bio, location, profile_visibility')
      .eq('username', username)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    if (profile.profile_visibility === 'private') {
      return NextResponse.json({ error: 'This profile is private.' }, { status: 403 })
    }

    // Fetch all profile data in parallel
    const [
      linksResult,
      achievementsResult,
      affiliationsResult,
      docsResult,
      blocksResult,
      sectionsResult,
    ] = await Promise.all([
      supabase.from('links').select('title, url, icon').eq('user_id', profile.id).order('display_order'),
      supabase.from('achievements').select('title, description, date, link, scraped_content').eq('user_id', profile.id).order('date', { ascending: false }),
      supabase.from('affiliations').select('community_name, role, verified, proof_link, scraped_content').eq('user_id', profile.id),
      supabase.from('documents').select('parsed_text').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('blocks').select('type, content, section_id, display_order').eq('user_id', profile.id).order('display_order'),
      supabase.from('sections').select('id, title, display_order').eq('user_id', profile.id).order('display_order'),
    ])

    // Vector search (optional — skipped when embeddings unavailable)
    let vectorContext = ''
    try {
      const embedding = await generateEmbedding(question.trim())
      if (embedding) {
        const { data: matches } = await supabase.rpc('match_embeddings', {
          query_embedding: embedding,
          match_user_id: profile.id,
          match_threshold: 0.7,
          match_count: 5,
        })
        if (matches?.length) {
          vectorContext = matches.map((m: { content: string }) => m.content).join('\n\n')
        }
      }
    } catch {
      // Vector search unavailable — proceed without it
    }

    // ── Build structured context sections ───────────────────────────

    const lines: string[] = []

    // Basic identity
    lines.push(`## About ${profile.name || username}`)
    lines.push(`Username: @${username}`)
    if (profile.name) lines.push(`Full name: ${profile.name}`)
    if (profile.bio) lines.push(`Bio: ${profile.bio}`)
    if (profile.location) lines.push(`Location: ${profile.location}`)

    // Social / website links
    const links = linksResult.data ?? []
    if (links.length) {
      lines.push('\n## Social & Website Links')
      for (const l of links) {
        lines.push(`- ${l.icon ? l.icon.charAt(0).toUpperCase() + l.icon.slice(1) : l.title}: ${l.url}`)
      }
    }

    // Affiliations
    const affiliations = affiliationsResult.data ?? []
    if (affiliations.length) {
      lines.push('\n## Affiliations & Communities')
      for (const a of affiliations) {
        const parts = [a.community_name]
        if (a.role) parts.push(`— ${a.role}`)
        if (a.verified) parts.push('(verified)')
        if (a.proof_link) parts.push(`[proof: ${a.proof_link}]`)
        lines.push(`- ${parts.join(' ')}`)
        const sc = a.scraped_content as Record<string, string> | null
        if (sc?.description) lines.push(`  About: ${sc.description}`)
        if (sc?.text) lines.push(`  Details: ${sc.text.slice(0, 400)}`)
      }
    }

    // Achievements
    const achievements = achievementsResult.data ?? []
    if (achievements.length) {
      lines.push('\n## Achievements & Milestones')
      for (const a of achievements) {
        const parts = [`• ${a.title}`]
        if (a.date) parts.push(`(${a.date.slice(0, 10)})`)
        lines.push(parts.join(' '))
        if (a.description) lines.push(`  ${a.description}`)
        if (a.link) lines.push(`  Link: ${a.link}`)
        const sc = a.scraped_content as Record<string, string> | null
        if (sc?.description) lines.push(`  Page summary: ${sc.description}`)
        if (sc?.text) lines.push(`  Page content: ${sc.text.slice(0, 500)}`)
      }
    }

    // Bento grid content (notes, links, embeds) — grouped by section
    const blocks = blocksResult.data ?? []
    const sections = sectionsResult.data ?? []

    if (blocks.length) {
      lines.push('\n## Portfolio & Content Blocks')

      // Free blocks (no section)
      const freeBlocks = blocks.filter((b) => !b.section_id)
      if (freeBlocks.length) {
        appendBlocks(lines, freeBlocks)
      }

      // Sectioned blocks
      for (const section of sections) {
        const sectionBlocks = blocks.filter((b) => b.section_id === section.id)
        if (!sectionBlocks.length) continue
        lines.push(`\n### ${section.title}`)
        appendBlocks(lines, sectionBlocks)
      }
    }

    // CV / document text
    const cvText = vectorContext || (docsResult.data?.parsed_text?.slice(0, 8000) ?? '')
    if (cvText) {
      lines.push('\n## CV / Resume')
      lines.push(cvText)
    }

    const profileContext = lines.join('\n')

    const systemPrompt = `You are an AI assistant embedded on ${profile.name || username}'s personal profile page on Myntro. Visitors ask you questions about this person. Answer based solely on the profile data provided below.

${profileContext}

---
Guidelines:
- Answer in a helpful, warm, and professional tone.
- Be specific — use names, dates, and details from the profile when relevant.
- If you don't have enough information to answer a question, say so honestly. Never fabricate facts.
- Keep responses concise (under 150 words) unless the visitor explicitly asks for more detail.
- Do not reveal or speculate about anything not present in the profile data.`

    // Build message history (cap at last 20 messages)
    const recentHistory: ChatMessage[] = (history as ChatMessage[])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: question.trim() },
    ]

    // Stream response
    try {
      const stream = await chatCompletionStream(messages)
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch (streamErr: unknown) {
      const msg = streamErr instanceof Error ? streamErr.message : String(streamErr)
      console.error('[api/ai/chat] Stream error:', msg)

      if (msg.includes('401') || msg.toLowerCase().includes('api key')) {
        return NextResponse.json({ error: 'AI service is not configured. Please add a GROQ_API_KEY.' }, { status: 503 })
      }
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        return NextResponse.json({ error: 'AI service rate limit reached. Please try again in a moment.' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Failed to get AI response. Please try again.' }, { status: 500 })
    }
  } catch (err) {
    console.error('[api/ai/chat] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ── Helper: render blocks into readable lines ───────────────────────

type RawBlock = { type: string; content: Record<string, string>; section_id: string | null; display_order: number }

function appendBlocks(lines: string[], blocks: RawBlock[]) {
  for (const block of blocks) {
    const c = block.content
    switch (block.type) {
      case 'note':
        if (c.text) lines.push(`- Note: "${c.text}"`)
        break
      case 'link': {
        const title = c.scraped_title || c.title || c.url
        lines.push(`- Link: ${title} — ${c.url}`)
        if (c.scraped_description) lines.push(`  Description: ${c.scraped_description}`)
        if (c.scraped_text) lines.push(`  Page content: ${c.scraped_text.slice(0, 500)}`)
        break
      }
      case 'spotify':
        if (c.url) lines.push(`- Spotify: ${c.url}`)
        break
      case 'youtube':
        if (c.url) lines.push(`- YouTube: ${c.url}`)
        break
      case 'image':
        if (c.caption) lines.push(`- Image: "${c.caption}"`)
        else if (c.url) lines.push(`- Image: ${c.url}`)
        break
    }
  }
}
