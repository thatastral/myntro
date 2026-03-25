import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/deepseek'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
// Force CJS loader — Turbopack's ESM wrapper breaks these packages
const pdfParse = _require('pdf-parse') as (
  buf: Buffer,
  opts?: { max?: number },
) => Promise<{ text: string; numpages: number }>
const mammoth = _require('mammoth') as {
  extractRawText: (input: { buffer: ArrayBuffer }) => Promise<{ value: string }>
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())

  if (file.type === 'text/plain') {
    return buffer.toString('utf-8').trim()
  }

  if (file.type === 'application/pdf') {
    try {
      const result = await pdfParse(buffer, { max: 50 }) // max 50 pages
      return result.text.trim()
    } catch (err) {
      console.warn('[cv] pdf-parse failed, falling back to raw text:', err)
      return buffer.toString('utf-8').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ').trim()
    }
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: buffer.buffer })
      return result.value.trim()
    } catch (err) {
      console.warn('[cv] mammoth failed, falling back to raw text:', err)
      return buffer.toString('utf-8').replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ').trim()
    }
  }

  return ''
}

// POST /api/cv — upload CV file, extract text, store for AI context
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, DOC, DOCX, and plain text files are supported.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be under 10 MB.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Upload raw file to storage
    const storagePath = `cv/${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await admin.storage
      .from('documents')
      .upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[api/cv] Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from('documents').getPublicUrl(storagePath)

    // Properly extract text
    let parsedText = await extractText(file)
    if (!parsedText || parsedText.length < 20) {
      parsedText = `CV uploaded by ${user.email}. File: ${file.name}`
    }
    // Cap at 50k chars
    parsedText = parsedText.slice(0, 50000)

    const { data: doc, error: docError } = await admin
      .from('documents')
      .insert({
        user_id: user.id,
        file_url: urlData.publicUrl,
        parsed_text: parsedText,
        source_type: 'file',
        source_name: file.name,
      })
      .select()
      .single()

    if (docError) {
      // source_type / source_name columns may not exist yet — retry without them
      const { data: docFallback, error: docFallbackError } = await admin
        .from('documents')
        .insert({ user_id: user.id, file_url: urlData.publicUrl, parsed_text: parsedText })
        .select()
        .single()
      if (docFallbackError) {
        console.error('[api/cv] Document insert error:', docFallbackError)
        return NextResponse.json({ error: 'Failed to save document record.' }, { status: 500 })
      }
      return NextResponse.json({ success: true, document_id: docFallback.id, file_url: urlData.publicUrl, chunks_embedded: 0 })
    }

    // Generate embeddings if available
    const chunks = chunkText(parsedText, 500)
    let chunksEmbedded = 0
    const firstEmbedding = await generateEmbedding(chunks[0] ?? '')
    if (firstEmbedding) {
      const results = await Promise.allSettled(
        chunks.map(async (chunk, index) => {
          const embedding = await generateEmbedding(chunk)
          if (!embedding) throw new Error('null embedding')
          return admin.from('embeddings').insert({
            document_id: doc.id,
            user_id: user.id,
            content: chunk,
            embedding,
            chunk_index: index,
          })
        }),
      )
      chunksEmbedded = results.filter((r) => r.status === 'fulfilled').length
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      file_url: urlData.publicUrl,
      chunks_embedded: chunksEmbedded,
      chars_extracted: parsedText.length,
    })
  } catch (err) {
    console.error('[api/cv] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  const overlap = Math.floor(wordsPerChunk * 0.1)
  for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    if (chunk.trim()) chunks.push(chunk.trim())
    if (i + wordsPerChunk >= words.length) break
  }
  return chunks.length > 0 ? chunks : [text.trim()]
}
