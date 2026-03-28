'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, CircleNotch, ArrowRight } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'
import { WaitlistCardInner } from '@/components/waitlist/WaitlistCardInner'
import Link from 'next/link'
import { useWebHaptics } from 'web-haptics/react'

// ── Brand confetti ──────────────────────────────────────────────────────────
const COLORS = [
  '#8EE600', '#8EE600', '#8EE600',   // weighted — brand green is dominant
  '#C6F135', '#C6F135',
  '#D0ED99',
  '#4A7A00',
  '#ffffff', '#ffffff',
  '#0F1702',
]
const SHAPES = ['rect', 'rect', 'rect', 'circle', 'pill'] as const

interface Particle {
  x: number; y: number
  vx: number; vy: number
  angle: number; spin: number
  w: number; h: number
  color: string
  shape: typeof SHAPES[number]
  opacity: number
  decay: number
  waveAmp: number   // horizontal flutter amplitude
  waveFreq: number  // flutter frequency
  waveOffset: number
  tick: number
  delay: number     // frames before particle activates
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function useConfetti(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onDone?: () => void,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const count = 180
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
      const isCircle = shape === 'circle'
      const size = isCircle
        ? 5 + Math.random() * 7
        : 8 + Math.random() * 14
      return {
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 300,          // staggered above viewport
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.3 + Math.random() * 0.9,         // very slow fall
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.05,    // gentle tumble
        w: size,
        h: isCircle ? size : size * 0.45,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape,
        opacity: 0.9 + Math.random() * 0.1,
        decay: 0.003 + Math.random() * 0.004,  // very slow fade
        waveAmp: 0.4 + Math.random() * 1.0,    // flutter left/right
        waveFreq: 0.018 + Math.random() * 0.025,
        waveOffset: Math.random() * Math.PI * 2,
        tick: 0,
        delay: Math.floor(i * 1.4),             // staggered spawn
      }
    })

    let raf: number
    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      let alive = false

      for (const p of particles) {
        if (frame < p.delay) { alive = true; continue }
        if (p.opacity <= 0) continue
        alive = true

        p.tick++
        // flutter: oscillate x with a sin wave
        p.x += p.vx + Math.sin(p.tick * p.waveFreq + p.waveOffset) * p.waveAmp
        p.y += p.vy
        p.vy += 0.012           // very gentle gravity
        p.angle += p.spin

        // only start fading once past 65% of screen height
        if (p.y > canvas.height * 0.65) p.opacity -= p.decay
        // also fade if drifted off sides
        if (p.x < -20 || p.x > canvas.width + 20) p.opacity = 0

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color

        if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === 'pill') {
          const r = p.h / 2
          ctx.beginPath()
          ctx.roundRect(-p.w / 2, -r, p.w, p.h, r)
          ctx.fill()
        } else {
          // rect — slightly rounded for a paper-like look
          ctx.beginPath()
          ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 1.5)
          ctx.fill()
        }
        ctx.restore()
      }

      if (alive) {
        raf = requestAnimationFrame(draw)
      } else {
        onDone?.()
      }
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [canvasRef, onDone])
}

// ───────────────────────────────────────────────────────────────────────────

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
  const [usernameFocused, setUsernameFocused] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const { trigger: haptic } = useWebHaptics()

  useEffect(() => {
    if (checkState === 'available') {
      haptic('success')
      usernameInputRef.current?.blur()
      emailInputRef.current?.focus()
    } else if (checkState === 'taken') {
      haptic('error')
    }
  }, [checkState, haptic])

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
        if (r.status === 200) {
          setCheckState('available')
          setCheckMsg(`@${value} is available`)
        } else if (r.status === 409) { setCheckState('taken'); setCheckMsg('Already taken or reserved.') }
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

  const canSubmit = checkState === 'available' && EMAIL_REGEX.test(email.trim()) && !submitting

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
                            radial-gradient(circle at 75% 80%, rgba(15,23,2,0.04) 0%, transparent 50%)`,
        }}
      />

      {/* Nav */}
      <header className="relative flex items-center justify-center px-6 pt-10 pb-4">
        <MyntroLogo size="md" />
      </header>

      {/* Main content */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pt-4 pb-12">
        <div className="w-full max-w-[440px]">

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1
              className="mb-4 text-[44px] font-bold leading-[1.08] tracking-tight text-[#0F1702]"
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
              border: '1px solid rgba(15,23,2,0.07)',
              boxShadow: '0 2px 24px rgba(15,23,2,0.06), 0 1px 2px rgba(15,23,2,0.04)',
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">

              {/* Username */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#0F1702]">
                  Your username
                </label>
                <div
                  className="flex overflow-hidden rounded-xl transition-all duration-200"
                  style={{
                    border: `1.5px solid ${
                      checkState === 'available' && usernameFocused ? '#8EE600'
                      : checkState === 'taken' || checkState === 'invalid' ? '#FCA5A5'
                      : '#E8E8E8'
                    }`,
                    boxShadow: checkState === 'available' && usernameFocused
                      ? '0 0 0 3px rgba(142,230,0,0.12)'
                      : 'none',
                  }}
                >
                  <span
                    className="flex h-11 shrink-0 items-center border-r px-3 text-sm font-medium select-none"
                    style={{ color: '#C0C0C0', background: '#FAFAFA', borderColor: 'rgba(15,23,2,0.06)' }}
                  >
                    myntro.me/
                  </span>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onFocus={() => { setUsernameFocused(true); haptic('light') }}
                    onBlur={() => setUsernameFocused(false)}
                    placeholder="yourname"
                    maxLength={30}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[#0F1702] placeholder-[#D0D0D0] outline-none"
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
                <label className="mb-1.5 block text-xs font-semibold text-[#0F1702]">
                  Email address
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@example.com"
                  required
                  className="h-11 w-full rounded-xl px-3 text-sm text-[#0F1702] placeholder-[#D0D0D0] outline-none transition-all duration-200"
                  style={{ border: '1.5px solid #E8E8E8', background: 'white' }}
                  onFocus={(e) => { haptic('light'); e.currentTarget.style.borderColor = '#8EE600'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(142,230,0,0.12)' }}
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
              <div style={{ height: 1, background: 'rgba(15,23,2,0.05)', margin: '2px 0' }} />

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                onClick={() => canSubmit && haptic('buzz')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-[#0F1702] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [glazeReady, setGlazeReady] = useState(false)
  const { trigger: haptic } = useWebHaptics()
  useConfetti(canvasRef, () => setGlazeReady(true))

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)
    const ny = -(e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)
    setTilt({ x: nx * 9, y: ny * 9 })
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif', background: '#FAFAF8' }}
    >
      <style>{`
        @keyframes cardIntro {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardGlaze {
          0%   { opacity: 0; transform: translateX(-130%); }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(130%); }
        }
      `}</style>

      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 40%, rgba(142,230,0,0.08) 0%, transparent 60%)`,
        }}
      />

      {/* Nav */}
      <header className="relative flex items-center justify-center px-6 pt-10 pb-4">
        <MyntroLogo size="md" />
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="w-full max-w-[500px] flex flex-col items-center gap-6">

          {/* Outer tilt wrapper — perspective lives here, no overflow-hidden */}
          <div
            ref={cardRef}
            style={{
              position: 'relative',
              width: '100%',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.18s ease-out',
              transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              willChange: 'transform',
              cursor: 'default',
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Inner card — overflow-hidden for border SVG + content clipping */}
            <div
              className="relative w-full overflow-hidden rounded-3xl bg-white"
              style={{
                aspectRatio: '401/228',
                boxShadow: '0 2px 20px rgba(15,23,2,0.06), 0 1px 4px rgba(15,23,2,0.04)',
                animation: 'cardIntro 0.6s ease-out forwards',
              }}
            >
              <WaitlistCardInner username={username} />

              {/* Glaze sweep — plays once after intro completes */}
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl"
                aria-hidden="true"
                style={{
                  background: 'linear-gradient(108deg, transparent 15%, rgba(255,255,255,0.82) 45%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0.82) 55%, transparent 85%)',
                  animation: glazeReady ? 'cardGlaze 2.2s ease-in-out forwards' : 'none',
                  opacity: 0,
                }}
              />
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-[#909090]">
            We&apos;ve reserved your spot. You&apos;ll get an email
            when it&apos;s time to activate your page.
          </p>

          <div className="flex flex-col items-center gap-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('join me on myntro.me👀')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptic('light')}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.97]"
              style={{ background: '#0F1702' }}
            >
              {/* X logo */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                <path d="M8.303 5.93 13.394 0h-1.205L7.759 5.147 4.21 0H0l5.34 7.783L0 14h1.205l4.67-5.436L9.79 14H14L8.303 5.93Zm-1.653 1.924-.541-.775L1.64.98h1.853l3.474 4.968.541.775 4.513 6.453h-1.853L6.65 7.854Z"/>
              </svg>
              Share on X
            </a>
            <Link
              href="/"
              className="text-sm text-[#C0C0C0] transition-colors hover:text-[#0F1702]"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
