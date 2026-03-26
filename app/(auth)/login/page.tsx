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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
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
        <div className="rounded-2xl border border-[#EBEBEB] bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-6">
            <h1
              className="text-2xl font-bold text-[#182403]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[#909090]">Sign in to your Myntro account</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#909090]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#182403] outline-none transition placeholder:text-[#C0C0C0] focus:border-[#8EE600] focus:bg-white focus:ring-2 focus:ring-[#8EE600]/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wide text-[#909090]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-[#909090] transition-colors hover:text-[#182403]">
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
                  className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] py-3 pl-4 pr-10 text-sm text-[#182403] outline-none transition placeholder:text-[#C0C0C0] focus:border-[#8EE600] focus:bg-white focus:ring-2 focus:ring-[#8EE600]/20"
                />
                <button
                  type="button"
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
              className="w-full rounded-xl bg-[#182403] py-3 text-sm font-semibold text-white transition-all hover:bg-[#2D3F05] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
            <span className="text-[11px] font-medium text-[#C0C0C0]">or</span>
            <div className="h-px flex-1 bg-[#F0F0F0]" />
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E8E8] bg-white px-4 py-3 text-sm font-medium text-[#182403] transition-all hover:bg-[#FAFAFA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              className="font-semibold text-[#182403] underline-offset-2 hover:underline"
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
