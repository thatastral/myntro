import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

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
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${user.id}/avatar.${ext}`
    const buffer = new Uint8Array(await file.arrayBuffer())

    const admin = createAdminClient()

    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      console.error('[api/avatar] Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

    const avatarPosition = formData.get('position')
      ? JSON.parse(formData.get('position') as string)
      : { x: 50, y: 50 }

    await admin.from('users').update({
      avatar_url: avatarUrl,
      avatar_position: avatarPosition,
    }).eq('id', user.id)

    return NextResponse.json({ avatar_url: avatarUrl, avatar_position: avatarPosition })
  } catch (err) {
    console.error('[api/avatar]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
