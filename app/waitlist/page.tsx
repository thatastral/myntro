'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, CircleNotch, ArrowRight } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'
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
        <MyntroLogo size="md" iconColor="#8EE600" />
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
        <MyntroLogo size="md" iconColor="#8EE600" />
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
              {/* Dashed border — 10px inset from card edge on all sides, 16px dash/gap, rx=14 */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 401 228"
                fill="none"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <rect
                  x="10.75" y="10.75"
                  width="379.5" height="206.5"
                  rx="14"
                  stroke="#0F1702"
                  strokeOpacity="0.08"
                  strokeDasharray="16 16"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Content + watermark in a single absolute column so gaps are exact */}
              <div className="absolute inset-0 flex flex-col items-center" style={{ paddingTop: '19%' }}>

                {/* "reserved!" pill — 11px, DM Sans */}
                <span
                  className="rounded-full px-3.5 py-1 font-semibold"
                  style={{
                    fontSize: '11px',
                    background: '#D0ED99',
                    color: '#0F1702',
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                    lineHeight: 1.4,
                  }}
                >
                  reserved!
                </span>

                {/* URL row — 14px below pill, font 32px, gap 6px to badge */}
                <div
                  className="flex items-center"
                  style={{ marginTop: 14, gap: 6 }}
                >
                  <span style={{
                    fontSize: 'clamp(28px, 5.5vw, 32px)',
                    color: '#0F1702',
                    fontFamily: 'var(--font-funnel-display), sans-serif',
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}>
                    <span style={{ opacity: 0.38 }}>myntro.me/</span>
                    <span style={{ fontWeight: 700 }}>{username}</span>
                  </span>

                  {/* Squircle badge */}
                  <svg width="34" height="34" viewBox="313 79.5 33 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <defs>
                      <linearGradient id="badgeSg" x1="329.5" y1="71.4628" x2="329.5" y2="116.115" gradientUnits="userSpaceOnUse">
                        <stop stopColor="white" />
                        <stop offset="1" stopColor="#8EE600" />
                      </linearGradient>
                    </defs>
                    <path d="M326.361 83.0398C327.987 81.0638 331.013 81.0638 332.639 83.0398V83.0398C333.499 84.0851 334.823 84.6336 336.171 84.5028V84.5028C338.718 84.2554 340.857 86.3948 340.61 88.9419V88.9419C340.479 90.2894 341.028 91.6136 342.073 92.4738V92.4738C344.049 94.1 344.049 97.1256 342.073 98.7517V98.7517C341.028 99.612 340.479 100.936 340.61 102.284V102.284C340.857 104.831 338.718 106.97 336.171 106.723V106.723C334.823 106.592 333.499 107.14 332.639 108.186V108.186C331.013 110.162 327.987 110.162 326.361 108.186V108.186C325.501 107.14 324.177 106.592 322.829 106.723V106.723C320.282 106.97 318.143 104.831 318.39 102.284V102.284C318.521 100.936 317.972 99.612 316.927 98.7517V98.7517C314.951 97.1256 314.951 94.1 316.927 92.4738V92.4738C317.972 91.6136 318.521 90.2894 318.39 88.9419V88.9419C318.143 86.3948 320.282 84.2554 322.829 84.5028V84.5028C324.177 84.6336 325.501 84.0851 326.361 83.0398V83.0398Z" fill="url(#badgeSg)" />
                    <path d="M326.748 83.3574C328.174 81.6248 330.826 81.6248 332.252 83.3574C333.219 84.5313 334.706 85.147 336.219 85C338.453 84.7831 340.33 86.6598 340.113 88.8936C339.966 90.4067 340.581 91.8943 341.755 92.8604C343.488 94.2865 343.488 96.9391 341.755 98.3652C340.581 99.3313 339.966 100.819 340.113 102.332C340.33 104.566 338.453 106.442 336.219 106.226C334.706 106.079 333.219 106.694 332.252 107.868C330.826 109.601 328.174 109.601 326.748 107.868C325.781 106.694 324.294 106.079 322.781 106.226C320.547 106.442 318.67 104.566 318.887 102.332C319.034 100.819 318.419 99.3313 317.245 98.3652C315.512 96.9391 315.512 94.2865 317.245 92.8604C318.419 91.8943 319.034 90.4067 318.887 88.8936C318.67 86.6598 320.547 84.7831 322.781 85C324.294 85.147 325.781 84.5313 326.748 83.3574Z" stroke="#0F1702" strokeOpacity="0.02" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M334.886 92.1682C335.027 92.3088 335.106 92.4996 335.106 92.6985C335.106 92.8973 335.027 93.0881 334.886 93.2287L329.265 98.8502C329.191 98.9245 329.102 98.9835 329.005 99.0237C328.908 99.0639 328.804 99.0846 328.699 99.0846C328.594 99.0846 328.49 99.0639 328.393 99.0237C328.296 98.9835 328.208 98.9245 328.133 98.8502L325.34 96.0577C325.269 95.9885 325.212 95.9058 325.172 95.8143C325.133 95.7228 325.112 95.6243 325.111 95.5248C325.11 95.4252 325.129 95.3264 325.167 95.2342C325.205 95.1421 325.261 95.0583 325.331 94.9879C325.401 94.9175 325.485 94.8618 325.577 94.8241C325.67 94.7864 325.768 94.7674 325.868 94.7683C325.967 94.7691 326.066 94.7898 326.157 94.8291C326.249 94.8684 326.332 94.9256 326.401 94.9972L328.699 97.2952L333.825 92.1682C333.895 92.0985 333.978 92.0432 334.069 92.0055C334.16 91.9678 334.257 91.9484 334.356 91.9484C334.454 91.9484 334.552 91.9678 334.643 92.0055C334.734 92.0432 334.817 92.0985 334.886 92.1682Z" fill="white" />
                  </svg>
                </div>

                {/* Myntro watermark — centered, gradient fade */}
                <div
                  className="pointer-events-none select-none self-stretch overflow-hidden"
                  aria-hidden="true"
                  style={{
                    marginTop: 16,
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 20%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.05) 72%, rgba(0,0,0,0) 88%)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 20%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.05) 72%, rgba(0,0,0,0) 88%)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-funnel-display), sans-serif',
                      fontSize: '155px',
                      fontWeight: 700,
                      color: '#0F1702',
                      opacity: 0.12,
                      lineHeight: 0.85,
                      display: 'block',
                      textAlign: 'center',
                      letterSpacing: '-2px',
                    }}
                  >
                    Myntro
                  </span>
                </div>
              </div>

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
