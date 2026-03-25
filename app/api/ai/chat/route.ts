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

    // Fetch user profile for context
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

    // Vector search (optional — skipped if embeddings unavailable)
    let relevantContext = ''

    try {
      const questionEmbedding = await generateEmbedding(question.trim())

      if (questionEmbedding) {
        const { data: matches } = await supabase.rpc('match_embeddings', {
          query_embedding: questionEmbedding,
          match_user_id: profile.id,
          match_threshold: 0.7,
          match_count: 5,
        })
        if (matches && matches.length > 0) {
          relevantContext = matches.map((m: { content: string }) => m.content).join('\n\n')
        }
      }
    } catch (embeddingErr) {
      console.warn('[api/ai/chat] Vector search skipped:', embeddingErr)
    }

    // Fetch public profile data for additional context
    const [linksResult, achievementsResult, affiliationsResult, docsResult] = await Promise.all([
      supabase.from('links').select('title, url').eq('user_id', profile.id).limit(10),
      supabase.from('achievements').select('title, description, date').eq('user_id', profile.id).limit(10),
      supabase.from('affiliations').select('community_name, role, verified').eq('user_id', profile.id).limit(10),
      // Fetch most recent CV/document text as fallback when embeddings are unavailable
      supabase
        .from('documents')
        .select('parsed_text, file_url')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // Build system prompt
    const profileSummary = [
      `Name: ${profile.name || username}`,
      profile.bio ? `Bio: ${profile.bio}` : '',
      profile.location ? `Location: ${profile.location}` : '',
      linksResult.data?.length
        ? `Links: ${linksResult.data.map((l) => `${l.title} (${l.url})`).join(', ')}`
        : '',
      achievementsResult.data?.length
        ? `Achievements: ${achievementsResult.data
            .map((a) => `${a.title}${a.description ? ': ' + a.description : ''}`)
            .join(' | ')}`
        : '',
      affiliationsResult.data?.length
        ? `Affiliations: ${affiliationsResult.data
            .map((a) => `${a.community_name}${a.role ? ' (' + a.role + ')' : ''}${a.verified ? ' ✓' : ''}`)
            .join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    // Use vector search results if available, otherwise fall back to the full CV text
    const cvContext = relevantContext
      || (docsResult.data?.parsed_text
          ? docsResult.data.parsed_text.slice(0, 8000)
          : '')

    const systemPrompt = `You are an AI assistant for ${profile.name || username}'s personal page on Myntro. Your job is to answer visitor questions about this person based on their profile information.

Profile information:
${profileSummary}

${cvContext ? `CV / Document context:\n${cvContext}` : ''}

Instructions:
- Answer questions about this person's background, skills, achievements, and work.
- Be helpful, concise, and professional.
- If you don't have enough information to answer, say so honestly — don't make things up.
- Do not reveal private or sensitive information beyond what's in the profile.
- Keep responses focused and under 200 words unless more detail is explicitly requested.`

    // Build message history (cap at last 10 exchanges)
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

      if (msg.includes('401') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('invalid api key')) {
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
