'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Eye, MousePointerClick, Bot, Zap,
  TrendingUp, Loader2, Globe, RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface AnalyticsPageProps {
  params: Promise<{ username: string }>
}

type Period = '1h' | '24h' | '7d' | '30d' | '90d'

interface AnalyticsData {
  counts: { profile_view: number; link_click: number; ai_chat: number; tip_sent: number }
  chart: { label: string; count: number }[]
  geo: { country: string; country_code: string; count: number }[]
  total: number
  all_time_total: number
  period: Period
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
]

const STATS = [
  { key: 'profile_view' as const, label: 'Profile Views', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/40' },
  { key: 'link_click' as const, label: 'Link Clicks', icon: MousePointerClick, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-100 dark:border-violet-900/40' },
  { key: 'ai_chat' as const, label: 'AI Chats', icon: Bot, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-100 dark:border-green-900/40' },
  { key: 'tip_sent' as const, label: 'Tips Received', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-100 dark:border-amber-900/40' },
]

// Country code → flag emoji
function flag(cc: string) {
  return cc
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const [tooltip, setTooltip] = useState<{ label: string; count: number; x: number } | null>(null)

  return (
    <div className="relative">
      <div className="flex h-28 items-end gap-px">
        {data.map((d, i) => {
          const pct = Math.max((d.count / max) * 100, d.count > 0 ? 6 : 1.5)
          return (
            <div
              key={i}
              className="group relative flex flex-1 cursor-default flex-col justify-end"
              style={{ height: '100%' }}
              onMouseEnter={(e) => setTooltip({ label: d.label, count: d.count, x: e.currentTarget.getBoundingClientRect().left })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={cn(
                  'w-full rounded-sm transition-colors',
                  d.count > 0
                    ? 'bg-gray-800 group-hover:bg-gray-600 dark:bg-gray-200 dark:group-hover:bg-gray-400'
                    : 'bg-gray-100 dark:bg-gray-800',
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
          {tooltip.label}: {tooltip.count}
        </div>
      )}

      {/* X-axis labels — show first, middle, last */}
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-400 dark:text-gray-600">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { username } = use(params)
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('7d')

  const load = useCallback(async (p: Period, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics?username=${encodeURIComponent(username)}&period=${p}`)
      if (res.status === 403) throw new Error('forbidden')
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'error'
      setError(msg === 'forbidden' ? 'forbidden' : 'Failed to load analytics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [username])

  useEffect(() => {
    if (authLoading) return
    if (!authUser) { router.push(`/login?next=/${username}/analytics`); return }
    load(period)
  }, [authUser, authLoading, username, router, load, period])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500">You don&apos;t have access to this page.</p>
        <Link href={`/${username}`} className="text-sm font-medium underline-offset-2 hover:underline">View profile</Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    )
  }

  const periodLabel = { '1h': 'past hour', '24h': 'past 24 hours', '7d': 'past 7 days', '30d': 'past 30 days', '90d': 'past 90 days' }[period]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-xl px-4 py-12">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${username}/edit`}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to editor
          </Link>
          <button
            onClick={() => load(period, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Analytics</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            @{username} · {(data?.all_time_total ?? 0).toLocaleString()} total events all time
          </p>
        </div>

        {/* Period switcher */}
        <div className="mb-6 flex rounded-2xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                'flex-1 rounded-xl py-2 text-sm font-semibold transition-all',
                period === value
                  ? 'bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {STATS.map(({ key, label, icon: Icon, color, bg, border }) => (
            <div
              key={key}
              className={cn(
                'rounded-2xl border bg-white p-4 dark:bg-gray-900',
                border,
              )}
            >
              <div className={cn('mb-3 inline-flex rounded-xl p-2', bg)}>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                {(data?.counts[key] ?? 0).toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Total summary */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-4 w-4" />
            Total events — {periodLabel}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
            {(data?.total ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Activity chart */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{periodLabel}</span>
          </div>
          {data && data.chart.length > 0 ? (
            <BarChart data={data.chart} />
          ) : (
            <div className="flex h-28 items-center justify-center text-xs text-gray-300 dark:text-gray-700">
              No data for this period
            </div>
          )}
        </div>

        {/* Geography */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Geography</h2>
          </div>

          {data && data.geo.length > 0 ? (
            <div className="flex flex-col gap-2">
              {data.geo.map((g) => {
                const pct = data.total > 0 ? Math.round((g.count / data.total) * 100) : 0
                return (
                  <div key={g.country_code} className="flex items-center gap-3">
                    <span className="text-lg leading-none">{flag(g.country_code)}</span>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {g.country}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {g.count.toLocaleString()} · {pct}%
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-gray-800 dark:bg-gray-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Globe className="h-8 w-8 text-gray-200 dark:text-gray-800" />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                No geography data yet for this period.
              </p>
              <p className="text-[11px] text-gray-300 dark:text-gray-600">
                Location is captured from new visits going forward.
              </p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {data?.total === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium text-gray-500">No activity in the {periodLabel}</p>
            <Link
              href={`/${username}`}
              target="_blank"
              className="mt-3 inline-block text-xs font-medium text-gray-600 underline-offset-2 hover:underline dark:text-gray-400"
            >
              Share your profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
