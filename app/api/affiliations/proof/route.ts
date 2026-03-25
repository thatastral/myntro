import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF, or PDF allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
    }

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg')
    const filename = `${Date.now()}.${ext}`
    const path = `affiliations/${user.id}/proof/${filename}`
    const buffer = new Uint8Array(await file.arrayBuffer())

    const admin = createAdminClient()
    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[api/affiliations/proof] Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload proof' }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path)
    return NextResponse.json({ proof_url: urlData.publicUrl })
  } catch (err) {
    console.error('[api/affiliations/proof]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
