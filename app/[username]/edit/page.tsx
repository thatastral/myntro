'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Gear, Eye, EyeSlash, ArrowSquareOut, CircleNotch, ChartBar, Camera, Coins, TrendUp, TrendDown, Plus, X, Globe, ArrowClockwise, MapPin, ArrowLeft, Info, Sliders, CaretDown } from '@phosphor-icons/react'
import Link from 'next/link'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { InlineEditor } from '@/components/editor/InlineEditor'
import { AchievementEditor } from '@/components/editor/AchievementEditor'
import {
  SiX, SiSnapchat, SiYoutube, SiTiktok, SiInstagram,
  SiFacebook, SiGithub, SiPinterest, SiMedium,
} from 'react-icons/si'
import { FaLinkedinIn } from 'react-icons/fa'
import { AffiliationEditor } from '@/components/editor/AffiliationEditor'
import { BlocksEditor } from '@/components/blocks/BentoGrid'
import { CVUpload } from '@/components/editor/CVUpload'
import { SettingsModal } from '@/components/modals/SettingsModal'
import { FeedbackFab } from '@/components/editor/FeedbackFab'
import { GuidedTour } from '@/components/editor/GuidedTour'
import { ProfileChecklist } from '@/components/editor/ProfileChecklist'
import dynamic from 'next/dynamic'

const WalletConnectSection = dynamic(
  () => import('@/components/editor/WalletConnectSection').then((m) => m.WalletConnectSection),
  { ssr: false, loading: () => <div className="h-16 animate-pulse rounded-xl bg-[#F0F0F0]" /> },
)

function formatTipDate(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  )
}

interface EditPageProps {
  params: Promise<{ username: string }>
}

export default function EditPage({ params }: EditPageProps) {
  const { username } = use(params)
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
  const {
    profile,
    loading,
    error,
    updateProfile,
    addLink,
    updateLink,
    deleteLink,
    reorderLinks,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    addAffiliation,
    updateAffiliation,
    deleteAffiliation,
    addBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    refetch,
  } = useProfile(username)
  // All hooks must be at the top — no hooks after conditional returns
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarImgError, setAvatarImgError] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [quickStats, setQuickStats] = useState<{
    views: number; prevViews: number; tips: number; prevTips: number
  } | null>(null)
  const [tipsTotalUsd, setTipsTotalUsd] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'me' | 'achievements'>('me')
  const [recentTips, setRecentTips] = useState<{ id: string; sender_wallet: string; amount: number; token: string; tx_signature: string; created_at: string }[]>([])
  const [tipsOpen, setTipsOpen] = useState(true)
  const [addingLink, setAddingLink] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [platformUrls, setPlatformUrls] = useState<Record<string, string>>({})
  const [savingLink, setSavingLink] = useState(false)

  useEffect(() => {
    if (profile?.wallet?.wallet_address) setWalletAddress(profile.wallet.wallet_address)
  }, [profile?.wallet?.wallet_address])

  // Background: refresh GitHub follower counts for existing links that have null counts
  useEffect(() => {
    if (!profile?.links) return
    const stale = profile.links.filter((l) => l.icon === 'github' && l.follower_count == null)
    if (!stale.length) return
    stale.forEach(async (link) => {
      try {
        const u = new URL(link.url)
        const ghUser = u.pathname.split('/').filter(Boolean)[0]
        if (!ghUser) return
        const res = await fetch(`https://api.github.com/users/${ghUser}`, {
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return
        const data = await res.json() as { followers?: number }
        if (typeof data.followers !== 'number') return
        await updateLink(link.id, { follower_count: data.followers })
      } catch { /* ignore */ }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user?.id])

  useEffect(() => {
    if (!username || !authUser) return
    fetch(`/api/analytics?username=${encodeURIComponent(username)}&period=7d`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return
        setQuickStats({
          views: d.counts?.profile_view ?? 0,
          prevViews: d.prev_counts?.profile_view ?? 0,
          tips: d.counts?.tip_sent ?? 0,
          prevTips: d.prev_counts?.tip_sent ?? 0,
        })
      })
      .catch(() => {})
  }, [username, authUser])

  useEffect(() => {
    if (!username || !authUser) return
    fetch(`/api/tips?username=${encodeURIComponent(username)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.tips) setRecentTips(d.tips)
        if (typeof d?.summary?.total_usd === 'number') setTipsTotalUsd(d.summary.total_usd)
      })
      .catch(() => {})
  }, [username, authUser])

  useEffect(() => {
    if (profile?.user?.avatar_url) { setAvatarUrl(profile.user.avatar_url); setAvatarImgError(false) }
  }, [profile?.user?.avatar_url])

  useEffect(() => {
    if (profile && !profile.user.tour_seen) setShowTour(true)
  }, [profile?.user?.tour_seen])

  const handleTourFinish = useCallback(() => {
    setShowTour(false)
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tour_seen: true }),
    }).catch(() => {})
  }, [])

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.avatar_url) { setAvatarUrl(data.avatar_url); setAvatarImgError(false) }
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }, [])

  // Auth guard
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push(`/login?next=/${username}/edit`)
    }
  }, [authLoading, authUser, router, username])

  // Ownership guard
  useEffect(() => {
    if (!authLoading && !loading && profile && authUser?.id !== profile.user.id) {
      router.push(`/${username}`)
    }
  }, [authLoading, loading, profile, authUser, router, username])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <CircleNotch className="h-5 w-5 animate-spin text-[#C0C0C0]" />
      </div>
    )
  }

  if (!authUser) return null

  if (error || !profile) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <p className="text-sm text-[#909090]">
          {error ?? 'Profile not found.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="text-sm font-semibold text-[#0F1702] underline-offset-2 hover:underline"
        >
          Go home
        </button>
      </div>
    )
  }

  const { user, links, achievements, affiliations } = profile

  const LINK_PLATFORMS = [
    { id: 'x',         label: 'X / Twitter', Icon: SiX },
    { id: 'instagram', label: 'Instagram',   Icon: SiInstagram },
    { id: 'linkedin',  label: 'LinkedIn',    Icon: FaLinkedinIn },
    { id: 'github',    label: 'GitHub',      Icon: SiGithub },
    { id: 'youtube',   label: 'YouTube',     Icon: SiYoutube },
    { id: 'tiktok',    label: 'TikTok',      Icon: SiTiktok },
    { id: 'facebook',  label: 'Facebook',    Icon: SiFacebook },
    { id: 'snapchat',  label: 'Snapchat',    Icon: SiSnapchat },
    { id: 'pinterest', label: 'Pinterest',   Icon: SiPinterest },
    { id: 'medium',    label: 'Medium',      Icon: SiMedium },
    { id: 'website',   label: 'Website',     Icon: Globe },
  ]

  const PlatformIcon = ({ id }: { id: string | null | undefined }) => {
    const p = LINK_PLATFORMS.find(pl => pl.id === id)
    if (!p) return <Globe className="h-3.5 w-3.5" />
    return <p.Icon size={14} />
  }

  const closeLinkPopover = () => {
    setAddingLink(false)
    setSelectedPlatforms([])
    setPlatformUrls({})
  }

  const handleTogglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(id)) {
        // Deselect — remove from list and clear its URL
        setPlatformUrls(urls => { const next = { ...urls }; delete next[id]; return next })
        return prev.filter(p => p !== id)
      }
      return [...prev, id]
    })
  }

  const handleSaveAll = async () => {
    const toSave = selectedPlatforms.filter(id => platformUrls[id]?.trim())
    if (!toSave.length) return
    setSavingLink(true)
    await Promise.all(toSave.map(id => {
      const p = LINK_PLATFORMS.find(pl => pl.id === id)
      return addLink({ title: p?.label ?? id, url: platformUrls[id].trim(), icon: id })
    }))
    closeLinkPopover()
    setSavingLink(false)
  }

  return (
    <>
      <div className="min-h-[100dvh] bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="mx-auto max-w-lg px-4 py-12">
          {/* Toolbar */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/${username}`}
                className="flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
              >
                <ArrowLeft className="h-4 w-4" />
                Profile
              </Link>
              <div className="h-3.5 w-px bg-[#EBEBEB]" />
              <div className="text-xs font-medium text-[#C0C0C0]">
                Editing
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
                <ArrowSquareOut className="h-3 w-3 text-[#C0C0C0]" />
              </a>
              <a
                id="tour-analytics"
                href={`/${username}/analytics`}
                className="flex items-center gap-1.5 rounded-xl border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
              >
                <ChartBar className="h-3.5 w-3.5" />
                Analytics
              </a>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
              >
                <Gear className="h-3.5 w-3.5" />
                Settings
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Avatar + actions row */}
            <div className="flex items-start justify-between">
              <button
                id="tour-avatar"
                onClick={() => avatarInputRef.current?.click()}
                className="group relative h-[58px] w-[58px] flex-shrink-0 overflow-hidden rounded-full bg-[#F0F0F0]"
                title="Change profile photo"
              >
                {avatarUrl && !avatarImgError ? (
                  <Image
                    src={avatarUrl}
                    alt={user.name || user.username}
                    fill
                    className="object-cover"
                    sizes="58px"
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#C0C0C0]">
                    {(user.name || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {avatarUploading
                    ? <CircleNotch className="h-5 w-5 animate-spin text-white" />
                    : <Camera className="h-5 w-5 text-white" />}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </button>
              <button
                onClick={refetch}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EBEBEB] bg-white text-[#909090] transition-all hover:bg-[#FAFAFA] hover:text-[#0F1702]"
                title="Refresh profile"
              >
                <ArrowClockwise className="h-4 w-4" />
              </button>
            </div>

            {/* Name + affiliation + handle */}
            <div id="tour-profile">
              <div className="flex items-center gap-2.5 flex-wrap">
                <InlineEditor
                  value={user.name}
                  onSave={(name) => updateProfile({ name })}
                  placeholder="Your name"
                  as="h1"
                  maxLength={80}
                  className="text-2xl font-bold tracking-tight text-[#0F1702]"
                />

                {/* Affiliation visibility picker — only verified ones can be featured */}
                {affiliations.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {affiliations.map((a) => {
                      const isOn = user.featured_affiliation_id === a.id
                      const isPending = !a.verified
                      return (
                        <button
                          key={a.id}
                          onClick={() => {
                            if (isPending) return
                            updateProfile({ featured_affiliation_id: isOn ? null : a.id })
                          }}
                          title={
                            isPending
                              ? `${a.community_name} — pending approval`
                              : isOn
                              ? 'Hide from profile'
                              : 'Show on profile'
                          }
                          className={`group/badge relative h-7 w-7 flex-shrink-0 ${isPending ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          {/* Logo */}
                          <div className={`h-full w-full overflow-hidden rounded-lg border transition-all ${
                            isPending
                              ? 'border-amber-200 opacity-40'
                              : isOn
                              ? 'border-[#EBEBEB] opacity-100'
                              : 'border-[#EBEBEB] opacity-30'
                          }`}>
                            {a.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5] text-[9px] font-bold text-[#C0C0C0]">
                                {a.community_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {isPending ? (
                            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover/badge:opacity-100">
                              {isOn
                                ? <Eye className="h-3.5 w-3.5 text-white" />
                                : <EyeSlash className="h-3.5 w-3.5 text-white/70" />
                              }
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[#909090]">@{user.username}</p>
            </div>

            {/* Bio */}
            <InlineEditor
              value={user.bio ?? ''}
              onSave={(bio) => updateProfile({ bio: bio || null })}
              placeholder="Write a short bio…"
              as="p"
              multiline
              maxLength={300}
              className="max-w-sm text-sm leading-relaxed text-[#555]"
            />

            {/* Location + social link icons */}
            <div id="tour-links" className="flex items-start gap-2">
              {user.location && (
                <div className="flex items-center gap-1.5 text-xs text-[#909090]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{user.location}</span>
                </div>
              )}
              {/* Icon pills + add button — relative so popover anchors here */}
              <div className="relative ml-auto flex shrink-0 items-center gap-1">
                {links.map(link => {
                  const cnt = link.follower_count
                  const fmtCount = cnt === null || cnt === undefined ? null
                    : cnt >= 1_000_000 ? `${(cnt / 1_000_000).toFixed(1)}M`
                    : cnt >= 1_000 ? `${(cnt / 1_000).toFixed(1)}K`
                    : String(cnt)
                  return (
                    <div key={link.id} className="group/link relative flex items-center gap-0.5">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.title}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[#909090] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F1702]"
                      >
                        <PlatformIcon id={link.icon} />
                      </a>
                      {fmtCount && (
                        <span className="text-[10px] text-[#C0C0C0] leading-none">{fmtCount}</span>
                      )}
                      <button
                        onClick={() => deleteLink(link.id)}
                        title="Remove link"
                        className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E8E8E8] text-[#909090] hover:bg-red-100 hover:text-red-600 group-hover/link:flex"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  )
                })}
                <button
                  onClick={() => addingLink ? closeLinkPopover() : setAddingLink(true)}
                  title="Add link"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[#C0C0C0] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F1702]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                {/* Floating popover — anchored to this container, no layout shift */}
                {addingLink && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={closeLinkPopover} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-76 rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-xl" style={{ width: 304 }}>
                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#C0C0C0]">
                        Select platforms
                      </p>

                      {/* Platform grid — multi-select */}
                      <div className="mb-4 grid grid-cols-4 gap-1.5">
                        {LINK_PLATFORMS.map(p => {
                          const alreadyAdded = links.some(l => l.icon === p.id)
                          const isSelected = selectedPlatforms.includes(p.id)
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => handleTogglePlatform(p.id)}
                              className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-[10px] font-medium transition-colors ${
                                alreadyAdded
                                  ? 'cursor-not-allowed bg-[#FAFAFA] text-[#D5D5D5]'
                                  : isSelected
                                    ? 'bg-[#0F1702] text-white'
                                    : 'bg-[#F5F5F5] text-[#909090] hover:bg-[#EBEBEB] hover:text-[#0F1702]'
                              }`}
                            >
                              <p.Icon size={15} />
                              <span className="w-full truncate text-center leading-tight">
                                {p.label.split(' ')[0]}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* URL fields — one per selected platform, in selection order */}
                      {selectedPlatforms.length > 0 && (
                        <div className="mb-4 flex flex-col gap-2">
                          {selectedPlatforms.map(id => {
                            const p = LINK_PLATFORMS.find(pl => pl.id === id)
                            if (!p) return null
                            return (
                              <div key={id} className="flex items-center gap-2">
                                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#909090]">
                                  <p.Icon size={13} />
                                </div>
                                <input
                                  type="url"
                                  value={platformUrls[id] ?? ''}
                                  onChange={e => setPlatformUrls(prev => ({ ...prev, [id]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && handleSaveAll()}
                                  placeholder={`${p.label} URL…`}
                                  autoFocus={selectedPlatforms.indexOf(id) === 0 && !platformUrls[id]}
                                  className="flex-1 rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-xs text-[#0F1702] outline-none placeholder:text-[#C0C0C0] focus:border-[#D5D5D5]"
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeLinkPopover}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#909090] hover:bg-[#F5F5F5]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAll}
                          disabled={savingLink || !selectedPlatforms.some(id => platformUrls[id]?.trim())}
                          className="flex items-center gap-1.5 rounded-lg bg-[#0F1702] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1A2E03] disabled:opacity-40"
                        >
                          {savingLink ? <CircleNotch className="h-3 w-3 animate-spin" /> : 'Save all'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>

            {/* Recent Tips */}
            {recentTips.length > 0 && (
              <div className="flex w-full flex-col gap-2 mt-4">
                <button
                  onClick={() => setTipsOpen((v) => !v)}
                  className="flex items-center justify-between"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#C0C0C0]">Recent Tips</p>
                  <CaretDown
                    className={`h-3 w-3 text-[#C0C0C0] transition-transform duration-200 ${tipsOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>
                {tipsOpen && recentTips.slice(0, 5).map((tip) => (
                  <div key={tip.id} className="flex items-center justify-between rounded-xl bg-[#F7F7F5] px-3.5 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-[#909090]">
                        {tip.sender_wallet.slice(0, 6)}…{tip.sender_wallet.slice(-4)}
                      </span>
                      <span className="text-[10px] text-[#C0C0C0]">{formatTipDate(tip.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0F1702]">{tip.amount} {tip.token}</span>
                      <a
                        href={`https://solscan.io/tx/${tip.tx_signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ArrowSquareOut className="h-3.5 w-3.5 text-[#C0C0C0] hover:text-[#0F1702]" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab switcher + content wrapper */}
            <div className="mt-6 flex w-full max-w-full flex-col gap-4 overflow-hidden">
            <div className="inline-flex items-center gap-0.5 self-start rounded-full border border-[#E0E0E0] bg-[#F5F5F5] p-1">
              {(['me', 'achievements'] as const).map(tab => (
                <button
                  key={tab}
                  id={tab === 'achievements' ? 'tour-achievements' : undefined}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                    activeTab === tab
                      ? 'bg-[#0F1702] text-white'
                      : 'text-[#909090] hover:text-[#555]'
                  }`}
                >
                  {tab === 'me' ? 'Me' : 'Achievements'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'me' && (
              <>
                <div id="tour-blocks">
                <BlocksEditor
                  blocks={profile.blocks}
                  sections={profile.sections}
                  username={username}
                  onAdd={addBlock}
                  onUpdate={updateBlock}
                  onDelete={deleteBlock}
                  onAddSection={addSection}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                  onReorderBlocks={reorderBlocks}
                  onReorderSections={reorderSections}
                />
                </div>

                <div className="h-px bg-[#F0F0F0]" />

                {/* Identity & Background */}
                <div className="flex flex-col gap-4">
                  {/* Section header */}
                  <div id="tour-identity" className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F1702]">
                      Identity &amp; Background
                    </h2>
                    <div className="group/tip relative">
                      <Info className="h-3.5 w-3.5 text-[#C0C0C0] cursor-default" />
                      <div className="pointer-events-none absolute left-0 top-5 z-10 w-52 rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-xs text-[#909090] shadow-md opacity-0 transition-opacity duration-150 group-hover/tip:opacity-100">
                        Your community affiliations, resume, and Solana tip wallet.
                      </div>
                    </div>
                  </div>

                  <AffiliationEditor
                    affiliations={profile.affiliations}
                    onAdd={addAffiliation}
                    onUpdate={updateAffiliation}
                    onDelete={deleteAffiliation}
                  />

                  <div className="h-px bg-[#F5F5F5]" />

                  <CVUpload />

                  <div className="h-px bg-[#F5F5F5]" />

                  <WalletConnectSection
                    savedAddress={walletAddress}
                    onSaved={setWalletAddress}
                    username={username}
                  />
                </div>

                <p className="pb-20 text-center text-xs text-[#C0C0C0]">
                  Changes save automatically as you edit.
                </p>
              </>
            )}

            {activeTab === 'achievements' && (
              <div className="pb-20">
                <AchievementEditor
                  achievements={achievements}
                  onAdd={addAchievement}
                  onUpdate={updateAchievement}
                  onDelete={deleteAchievement}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating stats bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#F0F0F0] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          {/* Tips earned — left */}
          <a href={`/${username}/analytics`} className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F5]">
              <Coins className="h-3.5 w-3.5 text-[#909090]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none text-[#0F1702]">
                {tipsTotalUsd !== null
                  ? tipsTotalUsd === 0
                    ? '$0'
                    : tipsTotalUsd < 1
                      ? `$${tipsTotalUsd.toFixed(2)}`
                      : `$${tipsTotalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                  : '—'}
              </span>
              <span className="text-[10px] text-[#C0C0C0]">Earned · all time</span>
            </div>
            {quickStats && (() => {
              const prev = quickStats.prevTips
              const curr = quickStats.tips
              if (curr === 0) return null
              if (prev === 0) return (
                <span className="rounded-full bg-[#F0FBE0] px-1.5 py-0.5 text-[10px] font-semibold text-[#4A7A00]">New</span>
              )
              const pct = Math.round(((curr - prev) / prev) * 100)
              const up = pct >= 0
              return (
                <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  up ? 'bg-[#F0FBE0] text-[#4A7A00]' : 'bg-red-50 text-red-600'
                }`}>
                  {up ? <TrendUp className="h-2.5 w-2.5" /> : <TrendDown className="h-2.5 w-2.5" />}
                  {up ? '+' : ''}{pct}%
                </span>
              )
            })()}
          </a>

          {/* Views — right */}
          <a href={`/${username}/analytics`} className="flex items-center gap-2 group">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold leading-none text-[#0F1702]">
                {quickStats ? quickStats.views.toLocaleString() : '—'}
              </span>
              <span className="text-[10px] text-[#C0C0C0]">Views · 7d</span>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F5]">
              <Eye className="h-3.5 w-3.5 text-[#909090]" />
            </div>
          </a>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        walletAddress={walletAddress}
        onProfileUpdate={updateProfile}
        onWalletDisconnect={() => setWalletAddress(null)}
      />

      {/* Customisation coming soon badge — fixed bottom-left */}
      <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2.5 shadow-md">
        <Sliders className="h-3.5 w-3.5 shrink-0 text-[#909090]" />
        <span className="text-[13px] font-semibold text-[#0F1702]">Customisation</span>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-[#2D4A00]"
          style={{ background: 'linear-gradient(to right, #f0f0f0, #C5F135)' }}
        >
          Coming Soon
        </span>
      </div>

      {/* Feedback FAB — fixed bottom-right */}
      <FeedbackFab
        username={username}
        name={profile?.user?.name ?? username}
        email={authUser?.email ?? ''}
      />

      {showTour && <GuidedTour onFinish={handleTourFinish} />}

      <ProfileChecklist
        user={user}
        links={links}
        blocks={profile.blocks}
        achievements={achievements}
        wallets={profile.wallet ? [profile.wallet] : []}
      />
    </>
  )
}
