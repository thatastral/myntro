import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/beta-check?email=...
// Returns { allowed: boolean, reservedUsername: string | null }
export async function GET(request: NextRequest) {
  const email = new URL(request.url).searchParams.get('email')?.toLowerCase().trim()
  if (!email) return NextResponse.json({ allowed: false, reservedUsername: null })

  const admin = createAdminClient()
  const [betaResult, waitlistResult] = await Promise.all([
    admin.from('beta_testers').select('id').eq('email', email).maybeSingle(),
    admin.from('waitlist').select('username').eq('email', email).maybeSingle(),
  ])

  return NextResponse.json({
    allowed: !!betaResult.data,
    reservedUsername: waitlistResult.data?.username ?? null,
  })
}
