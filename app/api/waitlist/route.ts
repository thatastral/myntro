import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const RESERVED = new Set([
  'admin', 'api', 'login', 'logout', 'signup', 'onboarding',
  'settings', 'help', 'support', 'about', 'terms', 'privacy',
  'blog', 'docs', 'dashboard', 'profile', 'edit', 'tip', 'waitlist',
])

export async function GET() {
  try {
    const admin = createAdminClient()
    const { count } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json()

    // Validate
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
    }
    if (!username || !USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: lowercase letters, numbers, underscores only.' },
        { status: 400 },
      )
    }
    if (RESERVED.has(username)) {
      return NextResponse.json({ error: 'That username is reserved.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check username taken in live users table
    const { count: liveCount } = await admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
    if (liveCount && liveCount > 0) {
      return NextResponse.json({ error: 'That username is already taken.', field: 'username' }, { status: 409 })
    }

    // Check username already reserved in waitlist
    const { count: waitlistCount } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('username', username)
    if (waitlistCount && waitlistCount > 0) {
      return NextResponse.json({ error: 'That username is already reserved.', field: 'username' }, { status: 409 })
    }

    // Check email already on waitlist
    const { count: emailCount } = await admin
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('email', email.toLowerCase().trim())
    if (emailCount && emailCount > 0) {
      return NextResponse.json({ error: 'That email is already on the waitlist.', field: 'email' }, { status: 409 })
    }

    // Insert
    const { error } = await admin.from('waitlist').insert({
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
    })

    if (error) {
      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'email' : 'username'
        return NextResponse.json({ error: 'Already reserved — try a different one.', field }, { status: 409 })
      }
      console.error('[api/waitlist] Insert error:', error)
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }

    // Send confirmation email (fire-and-forget — never block the response)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myntro.me'
      const from = process.env.RESEND_FROM_INFO ?? process.env.RESEND_FROM ?? 'onboarding@resend.dev'
      const cleanUsername = username.toLowerCase().trim()
      const cleanEmail = email.toLowerCase().trim()

      resend.emails.send({
        from: `Myntro <${from}>`,
        to: cleanEmail,
        subject: `@${cleanUsername} is yours on Myntro`,
        headers: {
          'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:20px;border:1px solid #EBEBEB;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:28px 32px 0;text-align:center;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#8EE600;text-transform:uppercase;">Myntro</p>
        </td></tr>

        <!-- Hero -->
        <tr><td style="padding:24px 32px 20px;text-align:center;">
          <div style="display:inline-block;background:#F0F7E0;border-radius:12px;padding:10px 20px;margin-bottom:16px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#0F1702;letter-spacing:-0.5px;">@${cleanUsername}</p>
          </div>
          <p style="margin:0;font-size:15px;font-weight:600;color:#0F1702;">You're on the list.</p>
          <p style="margin:8px 0 0;font-size:13px;color:#909090;line-height:1.5;">Your username is reserved. We'll email you the moment Myntro opens — you'll be one of the first in.</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#F0F0F0;"></div></td></tr>

        <!-- What is Myntro -->
        <tr><td style="padding:20px 32px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#C0C0C0;">What is Myntro?</p>
          <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">Your digital identity — one link that tells your whole story. Share your work, communities, and achievements. Let people tip you in crypto. Chat with an AI version of you.</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#F0F0F0;"></div></td></tr>

        <!-- CTA -->
        <tr><td style="padding:24px 32px;text-align:center;">
          <p style="margin:0 0 16px;font-size:13px;color:#909090;">Know someone who'd want early access?</p>
          <a href="${appUrl}/waitlist" style="display:inline-block;background:#0F1702;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 28px;border-radius:12px;">Share the waitlist →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px 28px;text-align:center;background:#F7F7F5;border-top:1px solid #F0F0F0;">
          <p style="margin:0;font-size:11px;color:#C0C0C0;">You're receiving this because you joined the Myntro waitlist with this email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }).then(({ error }) => { if (error) console.error('[api/waitlist] Email failed:', error) })
        .catch((err) => console.error('[api/waitlist] Email exception:', err))
    }

    return NextResponse.json({ success: true, username }, { status: 201 })
  } catch (err) {
    console.error('[api/waitlist] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function HEAD(request: NextRequest) {
  // Username availability check — ?username=foo
  const username = new URL(request.url).searchParams.get('username')
  if (!username || !USERNAME_REGEX.test(username) || RESERVED.has(username)) {
    return new NextResponse(null, { status: 400 })
  }

  const admin = createAdminClient()

  const [{ count: liveCount }, { count: wlCount }] = await Promise.all([
    admin.from('users').select('id', { count: 'exact', head: true }).eq('username', username),
    admin.from('waitlist').select('id', { count: 'exact', head: true }).eq('username', username),
  ])

  const taken = (liveCount ?? 0) > 0 || (wlCount ?? 0) > 0
  return new NextResponse(null, { status: taken ? 409 : 200 })
}
