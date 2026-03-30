import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Geo lookup — free ip-api.com, no key required, 45 req/min
// ---------------------------------------------------------------------------
async function getGeo(ip: string): Promise<{ country: string; country_code: string; city: string } | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return null // local / private — skip
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`, {
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    if (data.status !== 'success') return null
    return { country: data.country, country_code: data.countryCode, city: data.city }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// POST /api/analytics — track an event
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const { username, event_type, metadata: clientMeta = {} } = await request.json()

    if (!username || !event_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const [userResult, authResult] = await Promise.all([
      supabase.from('users').select('id').eq('username', username).single(),
      supabase.auth.getUser(),
    ])

    const user = userResult.data
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Don't record profile_view events from the profile owner themselves
    if (event_type === 'profile_view' && authResult.data.user?.id === user.id) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Grab IP from headers
    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1'

    // Vercel injects geo headers — use them if present, otherwise do lookup
    const vercelCountry = request.headers.get('x-vercel-ip-country')
    const vercelCity = request.headers.get('x-vercel-ip-city')
    const vercelRegion = request.headers.get('x-vercel-ip-country-region')

    let geo: { country: string; country_code: string; city: string } | null = null

    if (vercelCountry) {
      geo = {
        country: vercelCountry,
        country_code: vercelCountry,
        city: vercelCity ? decodeURIComponent(vercelCity) : '',
      }
    } else {
      geo = await getGeo(ip)
    }

    const admin = createAdminClient()
    await admin.from('analytics_events').insert({
      user_id: user.id,
      event_type,
      metadata: {
        ...clientMeta,
        ...(geo
          ? { country: geo.country, country_code: geo.country_code, city: geo.city }
          : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/analytics?username=xxx&period=7d
// period: 1h | 24h | 7d | 30d | 90d   (default: 7d)
// ---------------------------------------------------------------------------
type Period = '1h' | '24h' | '7d' | '30d' | '90d'

function periodToMs(period: Period): number {
  return { '1h': 3600_000, '24h': 86400_000, '7d': 604800_000, '30d': 2592000_000, '90d': 7776000_000 }[period]
}

function buildChart(
  events: { created_at: string }[],
  period: Period,
  now: Date,
): { label: string; count: number }[] {
  if (period === '1h') {
    // 12 × 5-min buckets
    return Array.from({ length: 12 }, (_, i) => {
      const bucketStart = new Date(now.getTime() - (11 - i) * 5 * 60_000)
      const bucketEnd = new Date(bucketStart.getTime() + 5 * 60_000)
      const count = events.filter((e) => {
        const t = new Date(e.created_at).getTime()
        return t >= bucketStart.getTime() && t < bucketEnd.getTime()
      }).length
      const hh = bucketStart.getUTCHours().toString().padStart(2, '0')
      const mm = bucketStart.getUTCMinutes().toString().padStart(2, '0')
      return { label: `${hh}:${mm}`, count }
    })
  }

  if (period === '24h') {
    // 24 × hourly buckets
    return Array.from({ length: 24 }, (_, i) => {
      const bucketStart = new Date(now.getTime() - (23 - i) * 3600_000)
      bucketStart.setUTCMinutes(0, 0, 0)
      const bucketEnd = new Date(bucketStart.getTime() + 3600_000)
      const count = events.filter((e) => {
        const t = new Date(e.created_at).getTime()
        return t >= bucketStart.getTime() && t < bucketEnd.getTime()
      }).length
      const hh = bucketStart.getUTCHours().toString().padStart(2, '0')
      return { label: `${hh}:00`, count }
    })
  }

  // 7d → 7 days, 30d → 30 days, 90d → 13 weekly buckets
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const step = period === '90d' ? 7 : 1
  const buckets = Math.ceil(days / step)

  return Array.from({ length: buckets }, (_, i) => {
    const daysAgo = (buckets - 1 - i) * step
    const bucketStart = new Date(now)
    bucketStart.setUTCHours(0, 0, 0, 0)
    bucketStart.setUTCDate(bucketStart.getUTCDate() - daysAgo - (step - 1))
    const bucketEnd = new Date(bucketStart)
    bucketEnd.setUTCDate(bucketEnd.getUTCDate() + step)

    const count = events.filter((e) => {
      const t = new Date(e.created_at).getTime()
      return t >= bucketStart.getTime() && t < bucketEnd.getTime()
    }).length

    const month = bucketStart.toLocaleString('en', { month: 'short', timeZone: 'UTC' })
    const day = bucketStart.getUTCDate()
    return { label: `${month} ${day}`, count }
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')
  const period = (searchParams.get('period') ?? '7d') as Period

  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  if (!['1h', '24h', '7d', '30d', '90d'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .eq('id', authUser.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const since = new Date(now.getTime() - periodToMs(period)).toISOString()

  const admin = createAdminClient()
  const prevSince = new Date(now.getTime() - periodToMs(period) * 2).toISOString()

  // Run all three queries in parallel
  const [eventsResult, allTimeResult, prevResult] = await Promise.all([
    admin
      .from('analytics_events')
      .select('event_type, created_at, metadata')
      .eq('user_id', profile.id)
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    admin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id),
    admin
      .from('analytics_events')
      .select('event_type')
      .eq('user_id', profile.id)
      .gte('created_at', prevSince)
      .lt('created_at', since),
  ])

  const all = eventsResult.data ?? []
  const allTimeTotal = allTimeResult.count ?? 0
  const prevEvents = prevResult.data ?? []

  // Counts per event type
  const counts = { profile_view: 0, link_click: 0, ai_chat: 0, tip_sent: 0 }
  for (const e of all) {
    const t = e.event_type as keyof typeof counts
    if (t in counts) counts[t]++
  }

  // Chart
  const chart = buildChart(all, period, now)

  // Geography — aggregate by country from metadata
  const geoMap: Record<string, { country: string; country_code: string; count: number }> = {}
  for (const e of all) {
    const meta = e.metadata as { country?: string; country_code?: string } | null
    if (!meta?.country || !meta?.country_code) continue
    const cc = meta.country_code
    if (!geoMap[cc]) geoMap[cc] = { country: meta.country, country_code: cc, count: 0 }
    geoMap[cc].count++
  }
  const geo = Object.values(geoMap).sort((a, b) => b.count - a.count).slice(0, 10)

  const prevCounts = { profile_view: 0, link_click: 0, ai_chat: 0, tip_sent: 0 }
  for (const e of prevEvents ?? []) {
    const t = e.event_type as keyof typeof prevCounts
    if (t in prevCounts) prevCounts[t]++
  }

  return NextResponse.json({
    counts,
    prev_counts: prevCounts,
    chart,
    geo,
    total: all.length,
    all_time_total: allTimeTotal ?? 0,
    period,
  })
}
