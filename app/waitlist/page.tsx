'use client'

import { useState, useRef, useCallback } from 'react'
import { CheckCircle, XCircle, CircleNotch, ArrowRight, Check } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'
import Link from 'next/link'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function WaitlistPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [checkMsg, setCheckMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkUsername = useCallback((value: string) => {
    if (!value) { setCheckState('idle'); setCheckMsg(''); return }
    if (!USERNAME_REGEX.test(value)) {
      setCheckState('invalid')
      setCheckMsg(
        value.length < 3 ? 'At least 3 characters.' :
        value.length > 30 ? '30 characters max.' :
        'Lowercase letters, numbers, underscores only.',
      )
      return
    }
    setCheckState('checking')
    fetch(`/api/waitlist?username=${encodeURIComponent(value)}`, { method: 'HEAD' })
      .then((r) => {
        if (r.status === 200) { setCheckState('available'); setCheckMsg(`@${value} is available`) }
        else if (r.status === 409) { setCheckState('taken'); setCheckMsg('Already taken or reserved.') }
        else { setCheckState('idle'); setCheckMsg('') }
      })
      .catch(() => { setCheckState('idle'); setCheckMsg('') })
  }, [])

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(lower)
    setError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkUsername(lower), 420)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (checkState !== 'available' || !email.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return <SuccessScreen username={username} />

  const canSubmit = checkState === 'available' && email.trim().length > 0 && !submitting

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif', background: '#FAFAF8' }}
    >
      {/* Subtle background texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, rgba(142,230,0,0.06) 0%, transparent 50%),
                            radial-gradient(circle at 75% 80%, rgba(24,36,3,0.04) 0%, transparent 50%)`,
        }}
      />

      {/* Nav */}
      <header className="relative flex items-center justify-between px-6 py-5">
        <MyntroLogo size="md" />
        <Link
          href="/login"
          className="text-sm text-[#909090] transition-colors hover:text-[#182403]"
        >
          Sign in
        </Link>
      </header>

      {/* Main content */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">

          {/* Eyebrow */}
          <div className="mb-5 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase"
              style={{ background: '#F0F7E0', color: '#4A7A00', border: '1px solid rgba(142,230,0,0.3)', letterSpacing: '0.06em' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8EE600] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#8EE600]" />
              </span>
              Private Beta
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1
              className="mb-4 text-[44px] font-bold leading-[1.08] tracking-tight text-[#182403]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              Claim your<br />username early.
            </h1>
            <p className="mx-auto max-w-[320px] text-[15px] leading-relaxed text-[#909090]">
              Reserve your unique Myntro handle before the public launch. First come, first served.
            </p>
          </div>

          {/* Form */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'white',
              border: '1px solid rgba(24,36,3,0.07)',
              boxShadow: '0 2px 24px rgba(24,36,3,0.06), 0 1px 2px rgba(24,36,3,0.04)',
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

              {/* Username */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#182403]">
                  Your username
                </label>
                <div
                  className="flex overflow-hidden rounded-xl transition-all duration-200"
                  style={{
                    border: `1.5px solid ${
                      checkState === 'available' ? '#8EE600'
                      : checkState === 'taken' || checkState === 'invalid' ? '#FCA5A5'
                      : '#E8E8E8'
                    }`,
                    boxShadow: checkState === 'available'
                      ? '0 0 0 3px rgba(142,230,0,0.12)'
                      : 'none',
                  }}
                >
                  <span
                    className="flex h-11 shrink-0 items-center border-r px-3 text-sm font-medium select-none"
                    style={{ color: '#C0C0C0', background: '#FAFAFA', borderColor: 'rgba(24,36,3,0.06)' }}
                  >
                    myntro.xyz/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="yourname"
                    maxLength={30}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[#182403] placeholder-[#D0D0D0] outline-none"
                  />
                  <div className="flex h-11 w-9 shrink-0 items-center justify-center">
                    {checkState === 'checking' && (
                      <CircleNotch className="h-3.5 w-3.5 animate-spin text-[#C0C0C0]" />
                    )}
                    {checkState === 'available' && (
                      <CheckCircle className="h-4 w-4 text-[#4A7A00]" weight="fill" />
                    )}
                    {(checkState === 'taken' || checkState === 'invalid') && (
                      <XCircle className="h-4 w-4 text-red-400" weight="fill" />
                    )}
                  </div>
                </div>
                {checkMsg && (
                  <p
                    className="mt-1.5 text-[11px] font-medium"
                    style={{ color: checkState === 'available' ? '#4A7A00' : '#EF4444' }}
                  >
                    {checkMsg}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#182403]">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com"
                  required
                  className="h-11 w-full rounded-xl px-3 text-sm text-[#182403] placeholder-[#D0D0D0] outline-none transition-all duration-200"
                  style={{ border: '1.5px solid #E8E8E8', background: 'white' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#8EE600'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(142,230,0,0.12)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#E8E8E8'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-600">
                  {error}
                </p>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(24,36,3,0.05)', margin: '2px 0' }} />

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-[#182403] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  fontSize: 15,
                  background: canSubmit
                    ? 'linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)'
                    : '#F0F0F0',
                  boxShadow: canSubmit ? '0 3px 16px rgba(142,230,0,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {submitting ? (
                  <CircleNotch className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Secure my username
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Trust note */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#C0C0C0]">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" fill="currentColor" fillOpacity="0.6" />
            </svg>
            No spam. You&apos;ll only hear from us when it&apos;s time to claim your page.
          </div>
        </div>
      </main>
    </div>
  )
}

function SuccessScreen({ username }: { username: string }) {
  return (
    <div
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif', background: '#FAFAF8' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 40%, rgba(142,230,0,0.08) 0%, transparent 60%)`,
        }}
      />

      {/* Nav */}
      <header className="relative flex items-center px-6 py-5">
        <MyntroLogo size="md" />
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div
            className="mx-auto mb-7 flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
            style={{
              background: 'linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)',
              boxShadow: '0 8px 32px rgba(142,230,0,0.35)',
            }}
          >
            <Check className="h-9 w-9 text-[#182403]" weight="bold" />
          </div>

          <h1
            className="mb-3 text-[36px] font-bold tracking-tight text-[#182403]"
            style={{ fontFamily: 'var(--font-funnel-display), sans-serif', lineHeight: 1.1 }}
          >
            You&apos;re in.
          </h1>

          <p className="mb-6 text-[15px] leading-relaxed text-[#909090]">
            We&apos;ve reserved your spot. You&apos;ll get an email
            when it&apos;s time to activate your page.
          </p>

          {/* Reserved URL chip */}
          <div
            className="mx-auto mb-8 inline-flex items-center gap-2 rounded-xl px-4 py-2.5"
            style={{
              background: '#F0F7E0',
              border: '1px solid rgba(142,230,0,0.35)',
            }}
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-[#4A7A00]" weight="bold" />
            <span className="text-sm text-[#4A7A00]">
              <span className="opacity-60">myntro.xyz/</span>
              <span className="font-semibold">{username}</span>
              <span className="ml-1.5 rounded-full bg-[#D6F0A0] px-2 py-0.5 text-[10px] font-semibold text-[#3A6200]">reserved</span>
            </span>
          </div>

          <div>
            <Link
              href="/"
              className="text-sm text-[#C0C0C0] transition-colors hover:text-[#182403]"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
