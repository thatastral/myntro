import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// POST /api/tips — log a completed tip + send email to recipient
// Body: { username, sender_wallet, amount, token, tx_signature }
// No auth required — called by the tipper's browser after tx confirms
export async function POST(request: NextRequest) {
  try {
    const { username, sender_wallet, amount, token, tx_signature } = await request.json()

    if (!username || !sender_wallet || !amount || !token || !tx_signature) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Look up recipient
    const { data: user } = await admin
      .from('users')
      .select('id, email, name, username')
      .eq('username', username)
      .single()

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    // Log tip + analytics event in parallel
    await Promise.all([
      admin.from('tips').upsert(
        { recipient_user_id: user.id, sender_wallet, amount, token, tx_signature },
        { onConflict: 'tx_signature', ignoreDuplicates: true },
      ),
      admin.from('analytics_events').insert({
        user_id: user.id,
        event_type: 'tip_sent',
        metadata: { sender_wallet, amount, token, tx_signature },
      }),
    ])

    // Send email notification — fire and forget, never block the response
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const recipientName = user.name || user.username
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://myntro.me'
      const from = process.env.RESEND_FROM ?? 'onboarding@resend.dev'
      void recipientName // used in template

      resend.emails.send({
        from: `Myntro <${from}>`,
        to: user.email,
        subject: `You received ${amount} ${token} on Myntro`,
        headers: {
          'List-Unsubscribe': `<mailto:${from}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        text: `You just received ${amount} ${token} on Myntro!\n\nFrom: ${truncate(sender_wallet)}\nNetwork: Solana\n\nView your profile: ${appUrl}/${user.username}\nView transaction: https://solscan.io/tx/${tx_signature}`,
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

        <!-- Amount hero -->
        <tr><td style="padding:24px 32px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#909090;">You just received</p>
          <p style="margin:0;font-size:40px;font-weight:800;color:#0F1702;letter-spacing:-1px;">${amount} ${token}</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#F0F0F0;"></div></td></tr>

        <!-- Details -->
        <tr><td style="padding:20px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:#909090;padding-bottom:10px;">From</td>
              <td style="font-size:12px;font-family:monospace;color:#0F1702;text-align:right;padding-bottom:10px;">${truncate(sender_wallet)}</td>
            </tr>
            <tr>
              <td style="font-size:12px;color:#909090;">Network</td>
              <td style="font-size:12px;color:#0F1702;text-align:right;">Solana</td>
            </tr>
          </table>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#F0F0F0;"></div></td></tr>

        <!-- CTA -->
        <tr><td style="padding:24px 32px;text-align:center;">
          <a href="${appUrl}/${user.username}" style="display:inline-block;background:#0F1702;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 28px;border-radius:12px;">View your profile</a>
          <p style="margin:16px 0 0;font-size:11px;color:#C0C0C0;">
            <a href="https://solscan.io/tx/${tx_signature}" style="color:#909090;">View transaction on Solscan →</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px 28px;text-align:center;background:#F7F7F5;border-top:1px solid #F0F0F0;">
          <p style="margin:0;font-size:11px;color:#C0C0C0;">You're receiving this because someone tipped your Myntro profile, <a href="${appUrl}/${user.username}" style="color:#909090;">${user.username}</a>.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }).catch((err) => console.error('[api/tips] Email failed:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/tips] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// GET /api/tips?username=x — recent tips for the profile owner (authenticated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    if (!username) return NextResponse.json({ error: 'username required.' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const admin = createAdminClient()

    // Verify ownership
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!profile || profile.id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const [tipsResult, allTipsResult] = await Promise.all([
      admin
        .from('tips')
        .select('id, sender_wallet, amount, token, tx_signature, created_at')
        .eq('recipient_user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
      admin
        .from('tips')
        .select('amount, token')
        .eq('recipient_user_id', profile.id),
    ])

    // Aggregate token totals
    const totals = { sol: 0, usdc: 0, usdt: 0 }
    for (const tip of allTipsResult.data ?? []) {
      const t = tip.token?.toLowerCase()
      if (t === 'sol') totals.sol += Number(tip.amount)
      else if (t === 'usdc') totals.usdc += Number(tip.amount)
      else if (t === 'usdt') totals.usdt += Number(tip.amount)
    }

    // Fetch live SOL price (fire-and-forget fallback to 0)
    let solPrice = 0
    try {
      const priceRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { signal: AbortSignal.timeout(3000) },
      )
      const priceData = await priceRes.json()
      solPrice = priceData?.solana?.usd ?? 0
    } catch { /* use 0 if unavailable */ }

    const totalUsd = totals.sol * solPrice + totals.usdc + totals.usdt

    return NextResponse.json({
      tips: tipsResult.data ?? [],
      summary: { sol: totals.sol, usdc: totals.usdc, usdt: totals.usdt, sol_price: solPrice, total_usd: totalUsd },
    })
  } catch (err) {
    console.error('[api/tips] GET error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
