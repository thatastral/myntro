'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, CircleNotch, Globe, Check, ArrowLeft } from '@phosphor-icons/react'
import {
  SiX, SiSnapchat, SiYoutube, SiTiktok, SiInstagram,
  SiFacebook, SiGithub, SiPinterest, SiMedium,
} from 'react-icons/si'
import { FaLinkedinIn } from 'react-icons/fa'
import { useAuth } from '@/hooks/useAuth'
import { MyntroLogo } from '@/components/MyntroLogo'
import { createClient } from '@/lib/supabase/client'

const PLATFORMS = [
  { id: 'x',         label: 'X / Twitter', placeholder: 'x.com/username',           pattern: /^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\/.+/i, Icon: SiX },
  { id: 'instagram',  label: 'Instagram',   placeholder: 'instagram.com/username',    pattern: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/i, Icon: SiInstagram },
  { id: 'linkedin',  label: 'LinkedIn',   placeholder: 'linkedin.com/in/username', pattern: /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/.+/i, Icon: FaLinkedinIn },
  { id: 'github',    label: 'GitHub',      placeholder: 'github.com/username',       pattern: /^(https?:\/\/)?(www\.)?github\.com\/.+/i, Icon: SiGithub },
  { id: 'youtube',   label: 'YouTube',     placeholder: 'youtube.com/@channel',      pattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i, Icon: SiYoutube },
  { id: 'tiktok',    label: 'TikTok',      placeholder: 'tiktok.com/@username',      pattern: /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/i, Icon: SiTiktok },
  { id: 'facebook',  label: 'Facebook',    placeholder: 'facebook.com/username',     pattern: /^(https?:\/\/)?(www\.)?facebook\.com\/.+/i, Icon: SiFacebook },
  { id: 'snapchat',  label: 'Snapchat',   placeholder: 'snapchat.com/add/username', pattern: /^(https?:\/\/)?(www\.)?snapchat\.com\/.+/i, Icon: SiSnapchat },
  { id: 'pinterest', label: 'Pinterest',  placeholder: 'pinterest.com/username',    pattern: /^(https?:\/\/)?(www\.)?pinterest\.(com|it|co\.uk)\/.+/i, Icon: SiPinterest },
  { id: 'medium',    label: 'Medium',     placeholder: 'medium.com/@username',       pattern: /^(https?:\/\/)?(www\.)?medium\.com\/.+/i, Icon: SiMedium },
  { id: 'website',   label: 'Website',    placeholder: 'https://yoursite.com',      pattern: null, Icon: Globe },
]

const STEPS = ['Username', 'Profile', 'Links', 'Photo']

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(1)

  const handleBackToLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Step 1
  const [username, setUsername] = useState('')
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [checkMsg, setCheckMsg] = useState('')
  const [reservedUsername, setReservedUsername] = useState<string | null>(null)

  // Step 2
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')

  // Step 3
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({})

  // Step 4
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarPosition, setAvatarPosition] = useState({ x: 50, y: 50 })
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const avatarDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (user?.user_metadata?.full_name) setName(user.user_metadata.full_name)
  }, [user])

  // Fetch reserved username from waitlist/beta list
  useEffect(() => {
    if (!user?.email) return
    fetch(`/api/beta-check?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.reservedUsername) {
          setReservedUsername(data.reservedUsername)
          setUsername(data.reservedUsername)
          setCheckState('available')
          setCheckMsg(`@${data.reservedUsername} is reserved for you`)
        }
      })
      .catch(() => {})
  }, [user?.email])

  const checkUsername = useCallback((value: string) => {
    if (!value) { setCheckState('idle'); setCheckMsg(''); return }
    if (!/^[a-z0-9_]{3,30}$/.test(value)) {
      setCheckState('invalid')
      setCheckMsg(
        value.length < 3 ? 'Must be at least 3 characters.' :
        value.length > 30 ? 'Must be 30 characters or fewer.' :
        'Lowercase letters, numbers, and underscores only.'
      )
      return
    }
    setCheckState('checking')
    fetch('/api/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: value, checkOnly: true }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.available === true) { setCheckState('available'); setCheckMsg(`@${value} is available`) }
        else if (data.available === false) { setCheckState('taken'); setCheckMsg(data.error || 'Username already taken.') }
        else { setCheckState('idle'); setCheckMsg('') }
      })
      .catch(() => { setCheckState('idle'); setCheckMsg('') })
  }, [])

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(lower)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkUsername(lower), 400)
  }

  const handleStep1 = async () => {
    const isReady = reservedUsername ? username === reservedUsername : checkState === 'available'
    if (!username || !isReady) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          name: user?.user_metadata?.full_name ?? '',
          avatar_url: user?.user_metadata?.avatar_url ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save username.'); return }
      setStep(2)
    } catch { setError('Something went wrong.') }
    finally { setSubmitting(false) }
  }

  const handleStep2 = async () => {
    setSubmitting(true); setError('')
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim(), location: location.trim() }),
      })
      setStep(3)
    } catch { setError('Something went wrong.') }
    finally { setSubmitting(false) }
  }

  const handleStep3 = async () => {
    setSubmitting(true); setError('')
    try {
      const toSave = Array.from(selected).filter(id => urls[id]?.trim())
      await Promise.all(
        toSave.map((id, idx) => {
          const p = PLATFORMS.find(pl => pl.id === id)!
          return fetch('/api/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: p.label, url: urls[id].trim(), icon: id, display_order: idx }),
          })
        })
      )
      setStep(4)
    } catch { setError('Something went wrong.') }
    finally { setSubmitting(false) }
  }

  const handleFinish = async () => {
    setSubmitting(true); setError('')
    try {
      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        fd.append('position', JSON.stringify(avatarPosition))
        await fetch('/api/avatar', { method: 'POST', body: fd })
      }
      router.push(`/${username}/edit`)
    } catch { setError('Something went wrong.') }
    finally { setSubmitting(false) }
  }

  const handleAvatarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!avatarPreview) return
    e.preventDefault()
    setIsDraggingAvatar(true)
    avatarDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: avatarPosition.x,
      startPosY: avatarPosition.y,
    }
  }

  const handleAvatarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingAvatar || !avatarDragRef.current || !avatarPreview) return
    const deltaX = ((e.clientX - avatarDragRef.current.startX) / 80) * 100
    const deltaY = ((e.clientY - avatarDragRef.current.startY) / 80) * 100
    setAvatarPosition({
      x: Math.max(0, Math.min(100, avatarDragRef.current.startPosX + deltaX)),
      y: Math.max(0, Math.min(100, avatarDragRef.current.startPosY + deltaY)),
    })
  }

  const handleAvatarMouseUp = () => {
    setIsDraggingAvatar(false)
    avatarDragRef.current = null
  }

  const togglePlatform = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 5) next.add(id)
      return next
    })
  }

  const validateUrl = (platformId: string, url: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId)
    if (!platform?.pattern) return

    if (!url.trim()) {
      setUrlErrors(prev => ({ ...prev, [platformId]: '' }))
      return
    }

    if (!platform.pattern.test(url)) {
      setUrlErrors(prev => ({
        ...prev,
        [platformId]: `Must be a valid ${platform.label} URL (e.g., ${platform.placeholder})`,
      }))
    } else {
      setUrlErrors(prev => ({ ...prev, [platformId]: '' }))
    }
  }

  const hasInvalidUrls = Array.from(selected).some(id => {
    const url = urls[id]
    return url?.trim() && urlErrors[id]
  })

  if (loading) return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#909090]" />
    </div>
  )

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-4 py-10"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <MyntroLogo size="md" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#EBEBEB] bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">

          {/* Step indicators */}
          <div className="mb-7">
            {/* Row 1: dots + connector lines */}
            <div className="flex items-center">
              {STEPS.map((_, i) => {
                const s = i + 1
                const done = s < step
                const active = s === step
                const isLast = i === STEPS.length - 1
                return (
                  <div key={s} className="flex flex-1 items-center">
                    <div className="flex flex-1 justify-center">
                      <div
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300"
                        style={{
                          background: done ? '#8EE600' : active ? '#0F1702' : 'transparent',
                          border: done || active ? 'none' : '2px solid #EBEBEB',
                          color: done ? '#0F1702' : active ? '#fff' : '#C0C0C0',
                        }}
                      >
                        {done ? <Check weight="bold" className="h-3.5 w-3.5" /> : s}
                      </div>
                    </div>
                    {!isLast && (
                      <div
                        className="h-px w-8 flex-shrink-0 transition-all duration-300"
                        style={{ background: done ? '#8EE600' : '#EBEBEB' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            {/* Row 2: labels — mirrors dots row structure so each label centers under its dot */}
            <div className="mt-1.5 flex">
              {STEPS.map((label, i) => {
                const s = i + 1
                const done = s < step
                const active = s === step
                const isLast = i === STEPS.length - 1
                return (
                  <div key={s} className="flex flex-1 items-center">
                    <div className="flex flex-1 justify-center">
                      <span
                        className="text-[10px] font-semibold transition-colors"
                        style={{ color: active ? '#0F1702' : done ? '#4A7A00' : '#C0C0C0' }}
                      >
                        {label}
                      </span>
                    </div>
                    {!isLast && <div className="w-8 flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 1 — Username */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h1
                  className="text-xl font-bold text-[#0F1702]"
                  style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
                >
                  {reservedUsername ? 'Your username is ready' : 'Choose your username'}
                </h1>
                <p className="mt-1 text-sm text-[#909090]">
                  {reservedUsername
                    ? 'We reserved this handle for you from the waitlist.'
                    : "Your public profile URL — choose carefully, this can't be changed."}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#909090]">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-[#C0C0C0]">myntro.me/</span>
                  <input
                    type="text"
                    value={username}
                    onChange={reservedUsername ? undefined : e => handleUsernameChange(e.target.value)}
                    readOnly={!!reservedUsername}
                    placeholder="yourname"
                    maxLength={30}
                    autoFocus={!reservedUsername}
                    autoComplete="off"
                    autoCapitalize="none"
                    className={`w-full rounded-xl border py-3 pl-[6.5rem] pr-10 text-sm text-[#0F1702] outline-none transition ${
                      reservedUsername
                        ? 'border-[#8EE600]/40 bg-[#F5FDED] cursor-default select-none'
                        : 'border-[#E8E8E8] bg-[#FAFAFA] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkState === 'checking' && <CircleNotch className="h-4 w-4 animate-spin text-[#C0C0C0]" />}
                    {checkState === 'available' && <CheckCircle className="h-4 w-4 text-[#4A7A00]" />}
                    {(checkState === 'taken' || checkState === 'invalid') && <XCircle className="h-4 w-4 text-red-500" />}
                  </span>
                </div>
                {checkMsg && (
                  <p className={`mt-1.5 text-xs ${checkState === 'available' ? 'text-[#4A7A00]' : 'text-red-600'}`}>
                    {checkMsg}
                  </p>
                )}
              </div>

              {reservedUsername ? (
                <div className="rounded-xl border border-[#8EE600]/30 bg-[#F5FDED] p-3 text-xs text-[#4A7A00]">
                  This username was reserved for you when you joined the waitlist. It cannot be changed.
                </div>
              ) : (
                <div className="rounded-xl bg-[#FAFAFA] p-3 text-xs text-[#909090]">
                  <ul className="list-inside list-disc space-y-0.5">
                    <li>3–30 characters</li>
                    <li>Lowercase letters, numbers, and underscores only</li>
                    <li>Cannot be changed after you set it</li>
                  </ul>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleStep1}
                disabled={submitting || (reservedUsername ? !username : checkState !== 'available')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1702] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A2E03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <><CircleNotch className="h-4 w-4 animate-spin" /> Saving…</> : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2 — Profile */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1
                  className="text-xl font-bold text-[#0F1702]"
                  style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
                >
                  Set up your profile
                </h1>
                <p className="mt-1 text-sm text-[#909090]">This is what people see when they visit your page.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#909090]">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0F1702] outline-none transition focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#909090]">Bio</label>
                <div className="relative">
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, 300))}
                    placeholder="A short description of who you are…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0F1702] outline-none transition placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
                  />
                  <span className="absolute bottom-2.5 right-3 text-xs text-[#C0C0C0]">{300 - bio.length}</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#909090]">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0F1702] outline-none transition placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleStep2}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1702] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A2E03] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <><CircleNotch className="h-4 w-4 animate-spin" /> Saving…</> : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 3 — Links */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h1
                  className="text-xl font-bold text-[#0F1702]"
                  style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
                >
                  Add your links
                </h1>
                <p className="mt-1 text-sm text-[#909090]">Select up to 5 platforms and paste your profile URLs. You can always add more later.</p>
              </div>

              {/* Platform grid */}
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ id, label, Icon }) => {
                  const active = selected.has(id)
                  const maxed = selected.size >= 5 && !active
                  return (
                    <button
                      key={id}
                      title={label}
                      onClick={() => togglePlatform(id)}
                      disabled={maxed}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                        active
                          ? 'border-[#0F1702] bg-[#0F1702] text-white'
                          : maxed
                          ? 'cursor-not-allowed border-[#EBEBEB] bg-[#FAFAFA] text-[#D0D0D0]'
                          : 'border-[#EBEBEB] bg-[#FAFAFA] text-[#909090] hover:border-[#0F1702] hover:text-[#0F1702]'
                      }`}
                    >
                      <Icon size={16} />
                    </button>
                  )
                })}
              </div>

              {/* URL inputs */}
              {selected.size > 0 && (
                <div className="space-y-2">
                  {Array.from(selected).map(id => {
                    const p = PLATFORMS.find(pl => pl.id === id)!
                    const hasError = !!urlErrors[id]
                    return (
                      <div key={id}>
                        <div className={`flex items-center gap-2 rounded-xl border bg-[#FAFAFA] px-3 py-2.5 ${hasError ? 'border-red-400' : 'border-[#E8E8E8]'}`}>
                          <p.Icon size={14} className="shrink-0 text-[#909090]" />
                          <input
                            type="url"
                            value={urls[id] ?? ''}
                            onChange={e => setUrls(prev => ({ ...prev, [id]: e.target.value }))}
                            onBlur={e => validateUrl(id, e.target.value)}
                            placeholder={p.placeholder}
                            className="flex-1 bg-transparent text-sm text-[#0F1702] outline-none placeholder:text-[#C0C0C0]"
                          />
                        </div>
                        {urlErrors[id] && (
                          <p className="mt-1 text-xs text-red-500">{urlErrors[id]}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleStep3}
                disabled={submitting || (selected.size > 0 && hasInvalidUrls)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1702] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A2E03] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <><CircleNotch className="h-4 w-4 animate-spin" /> Saving…</> : selected.size === 0 ? 'Skip' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 4 — Avatar */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h1
                  className="text-xl font-bold text-[#0F1702]"
                  style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
                >
                  Add a profile photo
                </h1>
                <p className="mt-1 text-sm text-[#909090]">Optional — you can add or change this any time from your edit page.</p>
              </div>

              {/* Avatar picker */}
              <div className="flex items-center gap-5">
                <div
                  onClick={() => !avatarPreview && fileInputRef.current?.click()}
                  onMouseDown={handleAvatarMouseDown}
                  onMouseMove={handleAvatarMouseMove}
                  onMouseUp={handleAvatarMouseUp}
                  onMouseLeave={handleAvatarMouseUp}
                  className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#E0E0E0] bg-[#FAFAFA] transition ${avatarPreview ? 'cursor-grab active:cursor-grabbing hover:border-[#C0C0C0]' : 'cursor-pointer hover:border-[#8EE600]/60'}`}
                >
                  {avatarPreview ? (
                    <div
                      className="h-full w-full"
                      style={{
                        backgroundImage: `url(${avatarPreview})`,
                        backgroundPosition: `${avatarPosition.x}% ${avatarPosition.y}%`,
                        backgroundSize: '150%',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  ) : (
                    <svg className="h-7 w-7 text-[#C0C0C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  )}
                </div>
                <div className="text-sm text-[#909090]">
                  {avatarPreview ? (
                    <>
                      <button onClick={() => fileInputRef.current?.click()} className="font-semibold text-[#0F1702] underline-offset-2 hover:underline">
                        Change photo
                      </button>
                      <p className="mt-0.5 text-xs">Drag to reposition</p>
                    </>
                  ) : (
                    <>
                      <button onClick={() => fileInputRef.current?.click()} className="font-semibold text-[#0F1702] underline-offset-2 hover:underline">
                        Upload a photo
                      </button>
                      <p className="mt-0.5 text-xs">JPEG, PNG, WebP or GIF — max 5 MB</p>
                    </>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setAvatarFile(file)
                  setAvatarPreview(URL.createObjectURL(file))
                }}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleFinish}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1702] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1A2E03] active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? <><CircleNotch className="h-4 w-4 animate-spin" /> Finishing up…</> : avatarFile ? 'Finish' : 'Skip & finish'}
              </button>
            </div>
          )}
        </div>

        {/* Back navigation — below the card */}
        <div className="mt-4 flex justify-center">
          {step === 1 ? (
            <button
              onClick={handleBackToLogin}
              className="flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
