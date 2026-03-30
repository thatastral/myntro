import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rating, working_well, blockers, other_notes, username, name } = await request.json()

  if (!rating) {
    return NextResponse.json({ error: 'Rating is required.' }, { status: 400 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.RESEND_FROM_INFO ?? process.env.RESEND_FROM ?? 'onboarding@resend.dev'

    const nl = (s: string) => s.replace(/\n/g, '<br>')

    const { error: emailError } = await resend.emails.send({
      from: `Myntro <${from}>`,
      to: 'astral@myntro.me',
      subject: `Beta feedback from @${username} — ${rating}/5`,
      text: [
        `From: ${name} (@${username}) <${user.email}>`,
        `Rating: ${rating}/5`,
        ``,
        `What's working well:`,
        working_well || '(no answer)',
        ``,
        `Blockers:`,
        blockers || '(no answer)',
        ``,
        `Other notes:`,
        other_notes || '(none)',
      ].join('\n'),
      html: `
        <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#0F1702;">
          <strong>From:</strong> ${name} (@${username}) &lt;${user.email}&gt;
        </p>
        <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#0F1702;">
          <strong>Rating:</strong> ${rating}/5
        </p>
        <hr style="border:none;border-top:1px solid #EBEBEB;margin:12px 0;" />
        <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#0F1702;">
          <strong>What's working well:</strong><br>${nl(working_well || '(no answer)')}
        </p>
        <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#0F1702;">
          <strong>Blockers:</strong><br>${nl(blockers || '(no answer)')}
        </p>
        <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#0F1702;">
          <strong>Other notes:</strong><br>${nl(other_notes || 'none')}
        </p>
      `,
    })
    if (emailError) console.error('[api/feedback] Email failed:', emailError)
  }

  return NextResponse.json({ success: true })
}
