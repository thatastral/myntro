'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Globe } from 'lucide-react'
import {
  SiX, SiSnapchat, SiYoutube, SiTiktok, SiInstagram,
  SiFacebook, SiGithub, SiPinterest, SiMedium,
} from 'react-icons/si'
import { FaLinkedinIn } from 'react-icons/fa'
import { useAuth } from '@/hooks/useAuth'

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

  // Step 1
  const [username, setUsername] = useState('')
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [checkMsg, setCheckMsg] = useState('')

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
        if (data.available) { setCheckState('available'); setCheckMsg(`@${value} is available`) }
        else { setCheckState('taken'); setCheckMsg(data.error || 'Username already taken.') }
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
    if (!username || checkState !== 'available') return
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
    <div className="flex min-h-screen items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 dark:bg-gray-950">
      <div className="w-full max-w-md">

        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Myntro</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">

          {/* Step indicators */}
          <div className="mb-6 flex items-center gap-2">
            {STEPS.map((label, i) => {
              const s = i + 1
              const done = s < step
              const active = s === step
              return (
                <div key={s} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`h-1 w-full rounded-full transition-colors ${done || active ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  <span className={`text-[10px] ${active ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-600'}`}>{label}</span>
                </div>
              )
            })}
          </div>

          {/* Step 1 — Username */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Choose your username</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your public profile URL — choose carefully, this can&apos;t be changed.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-gray-400">myntro.me/</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="yourname"
                    maxLength={30}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-[6.5rem] pr-10 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:focus:border-gray-500 dark:focus:bg-gray-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkState === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    {checkState === 'available' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {(checkState === 'taken' || checkState === 'invalid') && <XCircle className="h-4 w-4 text-red-500" />}
                  </span>
                </div>
                {checkMsg && (
                  <p className={`mt-1.5 text-xs ${checkState === 'available' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {checkMsg}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <ul className="list-inside list-disc space-y-0.5">
                  <li>3–30 characters</li>
                  <li>Lowercase letters, numbers, and underscores only</li>
                  <li>Cannot be changed after you set it</li>
                </ul>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                onClick={handleStep1}
                disabled={submitting || checkState !== 'available'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2 — Profile */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Set up your profile</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This is what people see when they visit your page.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Display name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:focus:border-gray-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <div className="relative">
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, 300))}
                    placeholder="A short description of who you are…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:focus:border-gray-500"
                  />
                  <span className="absolute bottom-2.5 right-3 text-xs text-gray-400">{300 - bio.length}</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:focus:border-gray-500 dark:placeholder:text-gray-500"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Back
                </button>
                <button
                  onClick={handleStep2}
                  disabled={submitting}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Links */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Add your links</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select up to 5 platforms and paste your profile URLs. You can always add more later.</p>
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
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        active
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                          : maxed
                          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600'
                          : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600'
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
                        <div className={`flex items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 dark:bg-gray-800 ${hasError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
                          <p.Icon size={14} className="shrink-0 text-gray-400" />
                          <input
                            type="url"
                            value={urls[id] ?? ''}
                            onChange={e => setUrls(prev => ({ ...prev, [id]: e.target.value }))}
                            onBlur={e => validateUrl(id, e.target.value)}
                            placeholder={p.placeholder}
                            className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-50"
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

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Back
                </button>
                <button
                  onClick={handleStep3}
                  disabled={submitting || (selected.size > 0 && hasInvalidUrls)}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : selected.size === 0 ? 'Skip' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Avatar */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Add a profile photo</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Optional — you can add or change this any time from your edit page.</p>
              </div>

              {/* Avatar picker */}
              <div className="flex items-center gap-5">
                <div
                  onClick={() => !avatarPreview && fileInputRef.current?.click()}
                  onMouseDown={handleAvatarMouseDown}
                  onMouseMove={handleAvatarMouseMove}
                  onMouseUp={handleAvatarMouseUp}
                  onMouseLeave={handleAvatarMouseUp}
                  className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition dark:border-gray-700 dark:bg-gray-800 ${avatarPreview ? 'cursor-grab active:cursor-grabbing hover:border-gray-400 hover:bg-gray-100 dark:hover:border-gray-600' : 'cursor-pointer hover:border-gray-400 hover:bg-gray-100 dark:hover:border-gray-600'}`}
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
                    <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {avatarPreview ? (
                    <>
                      <button onClick={() => fileInputRef.current?.click()} className="font-medium text-gray-900 hover:underline dark:text-gray-100">
                        Change photo
                      </button>
                      <p className="mt-0.5 text-xs">Drag to reposition</p>
                    </>
                  ) : (
                    <>
                      <button onClick={() => fileInputRef.current?.click()} className="font-medium text-gray-900 hover:underline dark:text-gray-100">
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

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Finishing up…</> : avatarFile ? 'Finish' : 'Skip & finish'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
