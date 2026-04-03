'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get('next') ?? '/onboarding'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('username')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        setError('Signed in, but failed to load your profile. Please try again.')
        setLoading(false)
        return
      }

      router.push(profile?.username ? `/${profile.username}/edit` : '/onboarding')
      router.refresh()
    }
  }

  const handleGoogleSignIn = () => {
    setGoogleLoading(true)
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-4"
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
          `}</style>
          <div className="mb-6">
            <h1
              className="text-2xl font-bold text-[#0F1702]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[#909090]">Sign in to your Myntro account</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 border-l-4 border-l-red-400"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[11px] font-semibold tracking-[0.06em] text-[#909090] uppercase">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-[#909090] transition-colors hover:text-[#0F1702]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0F1702] py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease',
                willChange: 'transform',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,2,0.20)'
                  e.currentTarget.style.background = '#1A2E03'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.background = '#0F1702'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
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
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[#0F1702] underline-offset-2 hover:underline"
            >
              Sign up free
            </Link>
          </p>
        </div>
      </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#8EE600]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
