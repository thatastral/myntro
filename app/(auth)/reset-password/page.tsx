'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
  }
}

function isPasswordValid(password: string) {
  const v = validatePassword(password)
  return v.length && v.uppercase && v.number && v.special
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
      else setError('Invalid or expired reset link. Please request a new one.')
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid(password)) {
      setError('Password must be 8+ characters with an uppercase letter, number, and special character (!@#$%^&*).')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  const requirements = validatePassword(password)

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-white px-4"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <Link href="/">
            <MyntroLogo size="md" />
          </Link>
        </div>

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

          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FBE0]">
                <svg className="h-6 w-6 text-[#4A7A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-base font-semibold text-[#0F1702]">Password updated</h2>
              <p className="text-sm text-[#909090]">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1
                className="mb-6 text-xl font-bold text-[#0F1702]"
                style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
              >
                Reset your password
              </h1>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-100 border-l-4 border-l-red-400 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                  {error.includes('expired') && (
                    <span>
                      {' '}
                      <Link href="/forgot-password" className="underline underline-offset-2">
                        Request a new link
                      </Link>
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] uppercase text-[#909090]">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      disabled={!sessionReady}
                      placeholder="Create a strong password"
                      className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] py-3 pl-4 pr-10 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C0C0C0] transition-colors hover:text-[#909090]"
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1">
                      {[
                        { key: 'length', label: '8+ characters' },
                        { key: 'uppercase', label: 'Uppercase letter' },
                        { key: 'number', label: 'Number' },
                        { key: 'special', label: 'Special character' },
                      ].map(({ key, label }) => {
                        const met = requirements[key as keyof typeof requirements]
                        return (
                          <div key={key} className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${met ? 'text-[#4A7A00]' : 'text-[#C0C0C0]'}`}>
                            <span className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 text-[8px] ${met ? 'bg-[#8EE600] text-white' : 'bg-[#E8E8E8] text-[#C0C0C0]'}`}>
                              {met ? '✓' : '○'}
                            </span>
                            {label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] uppercase text-[#909090]">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={!sessionReady}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] py-3 pl-4 pr-10 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C0C0C0] transition-colors hover:text-[#909090]"
                    >
                      {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !sessionReady}
                  className="w-full rounded-xl bg-[#0F1702] py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease',
                    willChange: 'transform',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && sessionReady) {
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
                      Updating…
                    </span>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
