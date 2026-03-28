import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Temporary diagnostic endpoint — DELETE after debugging
export async function GET(request: NextRequest) {
  const to = new URL(request.url).searchParams.get('to')
  if (!to) return NextResponse.json({ error: 'Pass ?to=your@email.com' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_INFO ?? process.env.RESEND_FROM

  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  if (!from) return NextResponse.json({ error: 'RESEND_FROM not set' }, { status: 500 })

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: `Myntro <${from}>`,
    to,
    subject: 'Myntro email test',
    html: '<p>This is a test email from Myntro.</p>',
  })

  return NextResponse.json({
    apiKeyPrefix: apiKey.slice(0, 8) + '…',
    from,
    to,
    data,
    error,
  })
}
