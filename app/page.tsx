'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'
// ── Hero mount animation ──────────────────────────────────────────────────────
function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const mounted = useMounted()

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-white"
      style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#F0F0F0] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <MyntroLogo size="md" showBeta />
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm font-medium text-[#0F1702] transition-opacity hover:opacity-70"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="group inline-flex h-9 items-center gap-1.5 rounded-full px-5 text-sm font-semibold text-[#0F1702] transition-all hover:opacity-90 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(180deg, #FDFDFD 0%, #8EE600 100%)',
                boxShadow: '0 2px 8px rgba(142,230,0,0.25)',
                willChange: 'transform',
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-24 text-center">
        {/* Radial green glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 600,
            height: 400,
            background: 'radial-gradient(ellipse at center, rgba(142,230,0,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <Link
            href="/waitlist"
            className="group mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-semibold transition-all hover:shadow-sm"
            style={{
              background: '#F0F7E0',
              border: '1px solid #C6F135',
              color: '#3A6200',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 500ms ease 50ms, transform 500ms cubic-bezier(0.25,0.46,0.45,0.94) 50ms',
            }}
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: '#8EE600' }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#8EE600' }} />
            </span>
            Beta is open — secure your username
            <span className="opacity-50 transition-opacity group-hover:opacity-100">→</span>
          </Link>

          <h1
            className="mb-6 text-5xl font-bold leading-[1.12] tracking-tight text-[#0F1702] sm:text-6xl lg:text-7xl"
            style={{
              fontFamily: 'var(--font-funnel-display), sans-serif',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 600ms ease 150ms, transform 600ms cubic-bezier(0.25,0.46,0.45,0.94) 150ms',
            }}
          >
            Your Web3 identity,{' '}
            <span className="relative inline-block">
              all in one link.
              <span
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #FDFDFD 0%, #8EE600 100%)' }}
              />
            </span>
          </h1>

          <p
            className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-[#909090]"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 600ms ease 250ms, transform 600ms cubic-bezier(0.25,0.46,0.45,0.94) 250ms',
            }}
          >
            Share your links, showcase achievements, display community affiliations,
            and let visitors tip you in SOL — all with an AI assistant that knows your story.
          </p>

          <div
            className="flex justify-center"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 600ms ease 400ms, transform 600ms cubic-bezier(0.25,0.46,0.45,0.94) 400ms',
            }}
          >
            <GreenCTA href="/signup">
              Create Your Page — It&apos;s Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </GreenCTA>
          </div>

          {/* Profile card preview */}
          <div
            className="mt-24 w-full"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 700ms ease 550ms, transform 700ms cubic-bezier(0.25,0.46,0.45,0.94) 550ms',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/myntro-card.svg"
              alt="Myntro profile card preview"
              className="mx-auto w-full"
              style={{ maxWidth: 900 }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          {/* Muted logo — #D9DCD4, 180×48.5px */}
          <FooterLogo />

          {/* Built by */}
          <p className="text-sm text-[#C0C0C0]">
            Built with ❤️ by{' '}
            <a
              href="https://myntro.me/thatastral"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0F1702] transition-opacity hover:opacity-70"
            >
              astral
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

// ── Footer logo — muted #D9DCD4, 180×48.5px ──────────────────────────────────

function FooterLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <svg width="24" height="24" viewBox="0 0 55 55" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path
          d="M-0.000976562 14.8511C-0.000976562 6.57424 9.19728 1.61336 16.1134 6.16011L27.4183 13.592L38.7231 6.16011C45.6392 1.61337 54.8375 6.57426 54.8375 14.8511V40.0039C54.8375 45.7482 50.1809 50.4048 44.4366 50.4048H10.3999C4.65563 50.4048 -0.000976562 45.7482 -0.000976562 40.0039V14.8511Z"
          fill="#D9DCD4"
        />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-funnel-display), sans-serif',
          fontSize: 16,
          fontWeight: 700,
          color: '#D9DCD4',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        Myntro
      </span>
    </div>
  )
}

// ── Shared primary green CTA button ──────────────────────────────────────────

function GreenCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-12 items-center gap-2.5 rounded-xl px-8 font-semibold text-[#0F1702]"
      style={{
        fontSize: '16px',
        lineHeight: 1,
        background: 'linear-gradient(180deg, #FDFDFD 0%, #8EE600 100%)',
        boxShadow: '0 2px 12px rgba(142,230,0,0.30)',
        transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(142,230,0,0.45)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(142,230,0,0.30)'
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)'
      }}
    >
      {children}
    </Link>
  )
}
