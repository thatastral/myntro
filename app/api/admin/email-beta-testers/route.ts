import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

function isAdmin(email?: string | null) {
  if (!email) return false
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  return adminEmails.includes(email)
}

// POST /api/admin/email-beta-testers
// Body: { subject, html }  — send a custom email to every beta tester
export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { subject, html } = await request.json()
  if (!subject || !html) {
    return NextResponse.json({ error: 'subject and html are required.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured.' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: testers, error: dbError } = await admin
    .from('beta_testers')
    .select('email')

  if (dbError) {
    console.error('[admin/email-beta-testers] DB error:', dbError)
    return NextResponse.json({ error: 'Failed to fetch beta testers.' }, { status: 500 })
  }

  if (!testers || testers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No beta testers found.' })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_INFO ?? process.env.RESEND_FROM ?? 'onboarding@resend.dev'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myntro.me'

  let sent = 0
  const errors: string[] = []

  // Send in batches of 50 (Resend rate limit)
  const BATCH = 50
  for (let i = 0; i < testers.length; i += BATCH) {
    const batch = testers.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async ({ email }) => {
        const { error } = await resend.emails.send({
          from: `Myntro <${from}>`,
          to: email,
          subject,
          html,
          headers: {
            'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
        if (error) {
          console.error(`[admin/email-beta-testers] Failed for ${email}:`, error)
          errors.push(email)
        } else {
          sent++
        }
      }),
    )

    // Small pause between batches to respect rate limits
    if (i + BATCH < testers.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`[admin/email-beta-testers] Sent: ${sent}/${testers.length}, Errors: ${errors.length}`)

  return NextResponse.json({
    sent,
    total: testers.length,
    failed: errors.length,
    ...(errors.length > 0 && { failedEmails: errors }),
  })

  void appUrl // used in html template by caller
}

// GET /api/admin/email-beta-testers — return count of beta testers
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { count } = await admin
    .from('beta_testers')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({ count: count ?? 0 })
}
