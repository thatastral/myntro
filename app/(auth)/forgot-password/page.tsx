'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

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

          <Link
            href="/login"
            className="mb-6 flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F0FBE0]">
                <svg className="h-6 w-6 text-[#4A7A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-base font-semibold text-[#0F1702]">Check your email</h2>
              <p className="text-sm text-[#909090]">
                We sent a password reset link to{' '}
                <span className="font-medium text-[#0F1702]">{email}</span>.
                It expires in 1 hour.
              </p>
              <p className="mt-4 text-xs text-[#C0C0C0]">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => { setSent(false) }}
                  className="underline underline-offset-2 hover:text-[#909090]"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <>
              <h1
                className="mb-2 text-xl font-bold text-[#0F1702]"
                style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
              >
                Forgot your password?
              </h1>
              <p className="mb-6 text-sm text-[#909090]">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-100 border-l-4 border-l-red-400 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] uppercase text-[#909090]">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:bg-white focus:ring-1 focus:ring-[#8EE600]/20"
                  />
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
                      Sending…
                    </span>
                  ) : (
                    'Send reset link'
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
