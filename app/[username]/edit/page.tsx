'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Settings, Eye, EyeOff, ArrowUpRight, Loader2, BarChart2, Sun, Moon, Camera, Zap, TrendingUp, TrendingDown, Plus, X, Globe, RefreshCw, MapPin, Info } from 'lucide-react'
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
import { useTheme } from '@/components/ThemeProvider'
import dynamic from 'next/dynamic'

const WalletConnectSection = dynamic(
  () => import('@/components/editor/WalletConnectSection').then((m) => m.WalletConnectSection),
  { ssr: false, loading: () => <div className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" /> },
)

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
  const { resolvedTheme, toggleTheme } = useTheme()

  // All hooks must be at the top — no hooks after conditional returns
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [quickStats, setQuickStats] = useState<{
    views: number; tips: number; prevViews: number; prevTips: number
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'me' | 'achievements'>('me')
  const [addingLink, setAddingLink] = useState(false)
  const [newLinkPlatform, setNewLinkPlatform] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
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
          tips: d.counts?.tip_sent ?? 0,
          prevViews: d.prev_counts?.profile_view ?? 0,
          prevTips: d.prev_counts?.tip_sent ?? 0,
        })
      })
      .catch(() => {})
  }, [username, authUser])

  useEffect(() => {
    if (profile?.user?.avatar_url) setAvatarUrl(profile.user.avatar_url)
  }, [profile?.user?.avatar_url])

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!authUser) return null

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error ?? 'Profile not found.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="text-sm font-medium text-gray-700 underline-offset-2 hover:underline dark:text-gray-300"
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

  const handleShare = async () => {
    const url = `${window.location.origin}/${username}`
    await navigator.clipboard.writeText(url)
  }

  const handleSaveLink = async () => {
    if (!newLinkPlatform || !newLinkUrl.trim()) return
    setSavingLink(true)
    const p = LINK_PLATFORMS.find(pl => pl.id === newLinkPlatform)
    await addLink({ title: p?.label ?? newLinkPlatform, url: newLinkUrl.trim(), icon: newLinkPlatform })
    setNewLinkPlatform('')
    setNewLinkUrl('')
    setAddingLink(false)
    setSavingLink(false)
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-lg px-4 py-12">
          {/* Toolbar */}
          <div className="mb-8 flex items-center justify-between">
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Editing mode
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <a
                href={`/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
                <ArrowUpRight className="h-3 w-3 text-gray-400" />
              </a>
              <a
                href={`/${username}/analytics`}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                Analytics
              </a>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Avatar + actions row */}
            <div className="flex items-start justify-between">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800"
                title="Change profile photo"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={user.name || user.username} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400 dark:text-gray-500">
                    {(user.name || user.username).charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {avatarUploading
                    ? <Loader2 className="h-5 w-5 animate-spin text-white" />
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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                title="Refresh profile"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Name + affiliation + handle */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <InlineEditor
                  value={user.name}
                  onSave={(name) => updateProfile({ name })}
                  placeholder="Your name"
                  as="h1"
                  maxLength={80}
                  className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
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
                              ? 'border-amber-200 opacity-40 dark:border-amber-800'
                              : isOn
                              ? 'border-gray-200 opacity-100 dark:border-gray-700'
                              : 'border-gray-200 opacity-30 dark:border-gray-700'
                          }`}>
                            {a.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[9px] font-bold text-gray-400 dark:bg-gray-800">
                                {a.community_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Overlay: pending dot or eye toggle */}
                          {isPending ? (
                            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-gray-950" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover/badge:opacity-100">
                              {isOn
                                ? <Eye className="h-3.5 w-3.5 text-white" />
                                : <EyeOff className="h-3.5 w-3.5 text-white/70" />
                              }
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">@{user.username}</p>
            </div>

            {/* Bio */}
            <InlineEditor
              value={user.bio ?? ''}
              onSave={(bio) => updateProfile({ bio: bio || null })}
              placeholder="Write a short bio…"
              as="p"
              multiline
              maxLength={300}
              className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400"
            />

            {/* Location + social link icons */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {user.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{user.location}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 shrink-0">
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
                          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                        >
                          <PlatformIcon id={link.icon} />
                        </a>
                        {fmtCount && (
                          <span className="text-[10px] text-gray-400 leading-none dark:text-gray-500">{fmtCount}</span>
                        )}
                        <button
                          onClick={() => deleteLink(link.id)}
                          title="Remove link"
                          className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-100 hover:text-red-600 group-hover/link:flex dark:bg-gray-700 dark:text-gray-400"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => setAddingLink(v => !v)}
                    title="Add link"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {addingLink && (
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
                  <select
                    value={newLinkPlatform}
                    onChange={e => setNewLinkPlatform(e.target.value)}
                    className="bg-transparent text-xs text-gray-600 outline-none dark:text-gray-300"
                  >
                    <option value="">Platform</option>
                    {LINK_PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <div className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveLink()}
                    placeholder="https://..."
                    className="flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-50"
                  />
                  <button
                    onClick={handleSaveLink}
                    disabled={savingLink || !newLinkPlatform || !newLinkUrl.trim()}
                    className="text-xs font-medium text-gray-900 disabled:opacity-40 dark:text-gray-50"
                  >
                    {savingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </button>
                  <button onClick={() => setAddingLink(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Tab switcher + content wrapper */}
            <div className="flex w-full max-w-full flex-col gap-4 overflow-hidden mt-4">
            <div className="flex w-full items-center gap-1 self-start rounded-full border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
              {(['me', 'achievements'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab === 'me' ? 'Me' : 'Achievements'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'me' && (
              <>
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
                  onShare={handleShare}
                />

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* Identity & Background group */}
                <div className="flex flex-col gap-6">
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">
                    Identity &amp; Background
                  </h2>

                  {/* Affiliations */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Affiliations
                      </h3>
                      <div className="group/tip relative">
                        <Info className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                        <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          Add organizations or communities you belong to. Verified badges appear on your public profile.
                        </div>
                      </div>
                    </div>
                    <AffiliationEditor
                      affiliations={profile.affiliations}
                      onAdd={addAffiliation}
                      onUpdate={updateAffiliation}
                      onDelete={deleteAffiliation}
                    />
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-800" />

                  {/* CV / Resume */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Resume / CV
                      </h3>
                      <div className="group/tip relative">
                        <Info className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                        <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          Upload your CV so your AI assistant can answer questions about your background.
                        </div>
                      </div>
                    </div>
                    <CVUpload />
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-800" />

                  {/* Wallet */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Wallet
                      </h3>
                      <div className="group/tip relative">
                        <Info className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                        <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                          Connect your Solana wallet to receive tips from visitors to your profile.
                        </div>
                      </div>
                    </div>
                    <WalletConnectSection
                      savedAddress={walletAddress}
                      onSaved={setWalletAddress}
                    />
                  </div>
                </div>

                <p className="pb-20 text-center text-xs text-gray-400 dark:text-gray-600">
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
    </div>

      {/* Floating stats bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          {/* Tips — left */}
          <a
            href={`/${username}/analytics`}
            className="flex items-center gap-2 group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-none text-gray-900 dark:text-gray-50">
                {quickStats ? quickStats.tips.toLocaleString() : '—'}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Tips · 7d</span>
            </div>
            {quickStats && (() => {
              const prev = quickStats.prevTips
              const curr = quickStats.tips
              if (prev === 0 && curr === 0) return null
              const pct = prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100)
              const up = pct >= 0
              return (
                <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  up ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                     : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                }`}>
                  {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {up ? '+' : ''}{pct}%
                </span>
              )
            })()}
          </a>

          {/* Views — right */}
          <a
            href={`/${username}/analytics`}
            className="flex items-center gap-2 group"
          >
            {quickStats && (() => {
              const prev = quickStats.prevViews
              const curr = quickStats.views
              if (prev === 0 && curr === 0) return null
              const pct = prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100)
              const up = pct >= 0
              return (
                <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  up ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                     : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                }`}>
                  {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {up ? '+' : ''}{pct}%
                </span>
              )
            })()}
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold leading-none text-gray-900 dark:text-gray-50">
                {quickStats ? quickStats.views.toLocaleString() : '—'}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Views · 7d</span>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Eye className="h-3.5 w-3.5 text-blue-500" />
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
    </>
  )
}
