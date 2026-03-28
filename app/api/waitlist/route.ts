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

      const { error: emailError } = await resend.emails.send({
        from: `Myntro <${from}>`,
        to: cleanEmail,
        subject: `✓ @${cleanUsername} is yours on Myntro`,
        headers: {
          'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        text: `Your spot is secured.\n\n@${cleanUsername} is reserved for you on Myntro.\n\nWe'll email you the moment Myntro opens. Expect something worth the wait.\n\nWhat you're getting:\n· One link. Your whole story.\n· Tip-enabled. Crypto-native.\n· An AI that speaks for you.\n\nInvite a friend: ${appUrl}/waitlist\n\nYou're receiving this because you reserved @${cleanUsername} on the Myntro waitlist.`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Your spot is secured</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F7F5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">@${cleanUsername} is yours — you're one of the first in to Myntro.&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;</div>

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F7F5;">
<tr><td align="center" style="padding:40px 20px;">

  <!-- Container -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
  <tr><td style="background-color:#ffffff;border-radius:20px;border:1px solid #EBEBEB;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">

    <!-- ── HEADER ── -->
    <tr><td align="center" style="padding:26px 32px 22px;border-bottom:1px solid #F0F0F0;">
      <table cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td valign="middle" style="padding-right:7px;">
          <img src="${appUrl}/logo.svg" width="22" height="22" alt="M" style="display:block;border-radius:5px;">
        </td>
        <td valign="middle">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#0F1702;letter-spacing:-0.2px;">Myntro</span>
        </td>
        <td valign="middle" style="padding-left:7px;">
          <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9px;font-weight:500;color:#0F1702;border:0.5px solid rgba(15,23,2,0.3);border-radius:999px;padding:2px 6px;letter-spacing:0.04em;">Beta</span>
        </td>
      </tr>
      </table>
    </td></tr>

    <!-- ── HEADLINE ── -->
    <tr><td align="center" style="padding:28px 32px 4px;">
      <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#0F1702;letter-spacing:-0.5px;line-height:1.2;">Your spot is secured.</p>
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;color:#5A9900;">@${cleanUsername} is reserved for you.</p>
    </td></tr>

    <!-- ── CARD ── -->
    <tr><td style="padding:20px 24px 24px;">

      <!-- Card outer shell (green-tinted surface, creates visual inset) -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background-color:#F0F7E0;border-radius:14px;padding:9px;">

        <!-- Card inner (white face, dashed border) -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background-color:#ffffff;border-radius:10px;border:1.5px dashed #D4D9CE;padding:14px 18px 10px;">

          <!-- "reserved!" pill -->
          <table cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background-color:#D0ED99;border-radius:999px;padding:3px 9px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9px;font-weight:700;color:#3A6B00;text-transform:uppercase;letter-spacing:0.1em;">reserved!</span>
          </td></tr>
          </table>

          <!-- URL + checkmark row -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;margin-bottom:8px;">
          <tr>
            <td valign="middle">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;color:#B0AFA8;letter-spacing:-0.3px;">myntro.me/</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:700;color:#0F1702;letter-spacing:-0.3px;">${cleanUsername}</span>
            </td>
            <td valign="middle" align="right" style="padding-left:10px;white-space:nowrap;">
              <!-- Checkmark badge (table-cell approach for Gmail compat) -->
              <table cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" valign="middle" style="width:22px;height:22px;background-color:#8EE600;border-radius:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:700;color:#ffffff;line-height:22px;">✓</td></tr>
              </table>
            </td>
          </tr>
          </table>

          <!-- Watermark -->
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#E8E8E4;text-align:center;letter-spacing:0.28em;line-height:1;">MYNTRO</p>

        </td></tr>
        </table>

      </td></tr>
      </table>
    </td></tr>

    <!-- ── BODY COPY ── -->
    <tr><td align="center" style="padding:0 32px 24px;">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#666666;line-height:1.7;">We'll email you the moment Myntro opens.<br>Expect something worth the wait.</p>
    </td></tr>

    <!-- ── DIVIDER ── -->
    <tr><td style="padding:0 32px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="background-color:#F0F0F0;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

    <!-- ── WHAT YOU'RE GETTING ── -->
    <tr><td style="padding:20px 32px;">
      <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#C0C0C0;">What you're getting</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding-bottom:8px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" style="padding-right:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#8EE600;line-height:1.5;">·</td>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#555555;line-height:1.5;">One link. Your whole story.</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" style="padding-right:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#8EE600;line-height:1.5;">·</td>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#555555;line-height:1.5;">Tip-enabled. Crypto-native.</td>
          </tr></table>
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" style="padding-right:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#8EE600;line-height:1.5;">·</td>
            <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#555555;line-height:1.5;">An AI that speaks for you.</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <!-- ── DIVIDER ── -->
    <tr><td style="padding:0 32px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="background-color:#F0F0F0;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

    <!-- ── CTA ── -->
    <tr><td align="center" style="padding:24px 32px;">
      <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#909090;">Know someone who'd want early access?</p>
      <a href="${appUrl}/waitlist" style="display:inline-block;background-color:#0F1702;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;padding:13px 30px;border-radius:12px;letter-spacing:0.01em;">Invite a friend &rarr;</a>
    </td></tr>

    <!-- ── FOOTER ── -->
    <tr><td align="center" style="padding:16px 32px 28px;background-color:#F7F7F5;border-top:1px solid #F0F0F0;border-radius:0 0 20px 20px;">
      <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#C0C0C0;line-height:1.6;">You're receiving this because you reserved <span style="color:#909090;">@${cleanUsername}</span> on the Myntro waitlist with this email.</p>
    </td></tr>

  </table>
  </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`,
      })
      if (emailError) console.error('[api/waitlist] Email failed:', emailError)
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
