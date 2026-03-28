'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeSlash, Check, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MyntroLogo } from '@/components/MyntroLogo'

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'football', 'shadow', '123123', '654321', 'superman', 'qazwsx',
  'michael', 'password1', 'welcome', 'welcome1', 'admin', 'login', 'passw0rd',
  'hello', 'charlie', 'donald', '1234', '12345', '123456789', '1234567890'
]

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase()),
  }
}

function isPasswordValid(password: string) {
  const v = validatePassword(password)
  return v.length && v.uppercase && v.number && v.special && v.notCommon
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const router = useRouter()

  const requirements = useMemo(() => validatePassword(password), [password])
  const allRequirementsMet = useMemo(() => isPasswordValid(password), [password])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!allRequirementsMet) {
      setError('Please meet all password requirements.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  const showRequirements = passwordFocused && password.length > 0

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-4 py-10"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Link href="/">
            <MyntroLogo size="md" />
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-[#EBEBEB] bg-white p-8"
          style={{
            boxShadow: '0 2px 16px rgba(15,23,2,0.08)',
            borderTop: '2px solid #F5F5F5',
            animation: 'authCardIn 400ms cubic-bezier(0.25,0.46,0.45,0.94) forwards',
          }}
        >
          <style>{`
            @keyframes authCardIn {
              from { opacity: 0; transform: translateY(12px) scale(0.99); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes requirementsIn {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes checkPop {
              0% { transform: scale(0); }
              60% { transform: scale(1.2); }
              100% { transform: scale(1); }
            }
          `}</style>
          <div className="mb-6">
            <h1
              className="text-2xl font-bold text-[#0F1702]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              Create your page
            </h1>
            <p className="mt-1 text-sm text-[#909090]">Free forever. No credit card required.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-100 border-l-4 border-l-red-400 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#909090] uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#909090] uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] py-3 pl-4 pr-10 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C0C0C0] transition-colors hover:text-[#909090]"
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {showRequirements && (
                <div
                  className="mt-2.5 grid grid-cols-2 gap-1"
                  style={{ animation: 'requirementsIn 200ms ease forwards' }}
                >
                  <Requirement label="8+ characters" met={requirements.length} />
                  <Requirement label="Uppercase letter" met={requirements.uppercase} />
                  <Requirement label="Number" met={requirements.number} />
                  <Requirement label="Special character" met={requirements.special} />
                  <Requirement label="Not common" met={requirements.notCommon} />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-[#909090] uppercase">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] py-3 pl-4 pr-10 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C0C0C0] transition-colors hover:text-[#909090]"
                >
                  {showConfirmPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet}
              className="relative h-12 w-full overflow-hidden rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                fontSize: '16px',
                lineHeight: 1,
                background: loading || !allRequirementsMet ? '#E8E8E8' : '#0F1702',
                color: loading || !allRequirementsMet ? '#909090' : 'white',
                transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                if (!loading && allRequirementsMet) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,2,0.20)'
                  e.currentTarget.style.background = '#1A2E03'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.background = allRequirementsMet ? '#0F1702' : '#E8E8E8'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#F0F0F0]" />
            <span className="rounded-full border border-[#EBEBEB] bg-white px-3 py-0.5 text-[11px] font-medium text-[#C0C0C0]">
              or
            </span>
            <div className="h-px flex-1 bg-[#F0F0F0]" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E8E8] bg-white px-4 py-3 text-sm font-medium text-[#0F1702] transition-all hover:bg-[#F7F7F7] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#909090]" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p className="mt-6 text-center text-sm text-[#909090]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#0F1702] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Requirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${met ? 'text-[#4A7A00]' : 'text-[#C0C0C0]'}`}>
      <span
        className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${met ? 'bg-[#8EE600]' : 'bg-[#E8E8E8]'}`}
        style={met ? { animation: 'checkPop 250ms cubic-bezier(0.34,1.56,0.64,1) forwards' } : undefined}
      >
        {met ? <Check className="h-2 w-2 text-white" strokeWidth={3} /> : <X className="h-2 w-2 text-[#C0C0C0]" strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87z" fill="#4285F4" />
      <path d="M8 16c2.16 0 3.97-.71 5.3-1.94l-2.59-2.01a5.02 5.02 0 01-2.71.75c-2.08 0-3.84-1.4-4.47-3.29H.88v2.08A8 8 0 008 16z" fill="#34A853" />
      <path d="M3.53 9.51A4.8 4.8 0 013.28 8c0-.52.09-1.03.25-1.51V4.41H.88A8 8 0 000 8c0 1.29.31 2.51.88 3.59l2.65-2.08z" fill="#FBBC05" />
      <path d="M8 3.2c1.17 0 2.22.4 3.05 1.2l2.29-2.29A8 8 0 00.88 4.41L3.53 6.5C4.16 4.6 5.92 3.2 8 3.2z" fill="#EA4335" />
    </svg>
  )
}
