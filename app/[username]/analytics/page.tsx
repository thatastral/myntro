'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Eye, CursorClick, Robot, Lightning,
  TrendUp, CircleNotch, Globe, ArrowClockwise,
} from '@phosphor-icons/react'
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
  { key: 'profile_view' as const, label: 'Profile Views', icon: Eye, dot: '#4285F4' },
  { key: 'link_click' as const, label: 'Link Clicks', icon: CursorClick, dot: '#8B5CF6' },
  { key: 'ai_chat' as const, label: 'AI Chats', icon: Robot, dot: '#10B981' },
  { key: 'tip_sent' as const, label: 'Tips Received', icon: Lightning, dot: '#F59E0B' },
]

function flag(cc: string) {
  return cc
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const [tooltip, setTooltip] = useState<{ label: string; count: number } | null>(null)

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
              onMouseEnter={() => setTooltip({ label: d.label, count: d.count })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={cn(
                  'w-full rounded-sm transition-colors duration-150',
                  d.count > 0
                    ? 'bg-[#0F1702] group-hover:bg-[#1A2E03]'
                    : 'bg-[#F0F0F0]',
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>

      {tooltip && (
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0F1702] px-2.5 py-1 text-xs font-medium text-white shadow-lg">
          {tooltip.label}: {tooltip.count}
        </div>
      )}

      <div className="mt-1.5 flex justify-between text-[10px] text-[#C0C0C0]">
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <CircleNotch className="h-5 w-5 animate-spin text-[#C0C0C0]" />
      </div>
    )
  }

  if (error === 'forbidden') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-white">
        <p className="text-sm text-[#909090]">You don&apos;t have access to this page.</p>
        <Link href={`/${username}`} className="text-sm font-semibold text-[#0F1702] underline-offset-2 hover:underline">
          View profile
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <p className="text-sm text-[#909090]">{error}</p>
      </div>
    )
  }

  const periodLabel = { '1h': 'past hour', '24h': 'past 24 hours', '7d': 'past 7 days', '30d': 'past 30 days', '90d': 'past 90 days' }[period]

  return (
    <div className="min-h-[100dvh] bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mx-auto max-w-xl px-4 py-12">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${username}/edit`}
            className="flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to editor
          </Link>
          <button
            onClick={() => load(period, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-[#909090] transition-colors hover:text-[#0F1702] disabled:opacity-50"
          >
            <ArrowClockwise className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-[#0F1702]"
            style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
          >
            Analytics
          </h1>
          <p className="mt-1 text-sm text-[#909090]">
            @{username} · {(data?.all_time_total ?? 0).toLocaleString()} total events all time
          </p>
        </div>

        {/* Period switcher */}
        <div className="mb-6 flex rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                'flex-1 rounded-xl py-2 text-sm font-semibold transition-all duration-150',
                period === value
                  ? 'bg-[#0F1702] text-white shadow-sm'
                  : 'text-[#909090] hover:text-[#0F1702]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {STATS.map(({ key, label, icon: Icon, dot }) => (
            <div
              key={key}
              className="rounded-2xl border border-[#EBEBEB] bg-white p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                <span className="text-xs text-[#909090]">{label}</span>
              </div>
              <div
                className="text-2xl font-bold tracking-tight text-[#0F1702]"
                style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
              >
                {(data?.counts[key] ?? 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Total summary */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[#909090]">
            <TrendUp className="h-4 w-4" />
            Total events — {periodLabel}
          </div>
          <span
            className="text-sm font-bold text-[#0F1702]"
            style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
          >
            {(data?.total ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Activity chart */}
        <div className="mb-4 rounded-2xl border border-[#EBEBEB] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F1702]">Activity</h2>
            <span className="text-xs capitalize text-[#C0C0C0]">{periodLabel}</span>
          </div>
          {data && data.chart.length > 0 ? (
            <BarChart data={data.chart} />
          ) : (
            <div className="flex h-28 items-center justify-center text-xs text-[#C0C0C0]">
              No data for this period
            </div>
          )}
        </div>

        {/* Geography */}
        <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#909090]" />
            <h2 className="text-sm font-semibold text-[#0F1702]">Geography</h2>
          </div>

          {data && data.geo.length > 0 ? (
            <div className="flex flex-col gap-3">
              {data.geo.map((g) => {
                const pct = data.total > 0 ? Math.round((g.count / data.total) * 100) : 0
                return (
                  <div key={g.country_code} className="flex items-center gap-3">
                    <span className="text-lg leading-none">{flag(g.country_code)}</span>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#0F1702]">{g.country}</span>
                        <span className="text-xs text-[#909090]">
                          {g.count.toLocaleString()} · {pct}%
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
                        <div
                          className="h-full rounded-full bg-[#0F1702] transition-all duration-500"
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
              <Globe className="h-8 w-8 text-[#E8E8E8]" />
              <p className="text-xs text-[#909090]">No geography data yet for this period.</p>
              <p className="text-[11px] text-[#C0C0C0]">Location is captured from new visits going forward.</p>
            </div>
          )}
        </div>

        {/* Empty state */}
        {data?.total === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E8E8E8] bg-white p-8 text-center">
            <TrendUp className="mx-auto mb-3 h-8 w-8 text-[#E0E0E0]" />
            <p className="text-sm font-medium text-[#909090]">No activity in the {periodLabel}</p>
            <Link
              href={`/${username}`}
              target="_blank"
              className="mt-3 inline-block text-xs font-semibold text-[#0F1702] underline-offset-2 hover:underline"
            >
              Share your profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
