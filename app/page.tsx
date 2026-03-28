'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from '@phosphor-icons/react'
import { MyntroLogo } from '@/components/MyntroLogo'

// ── Scroll-triggered visibility hook ─────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

// ── Hero mount animation ──────────────────────────────────────────────────────
function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}

// ── Feature illustrations ─────────────────────────────────────────────────────

function IllustrationIdentity() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      {/* Card shadow */}
      <rect x="30" y="28" width="140" height="92" rx="14" fill="rgba(15,23,2,0.03)" />
      {/* Card body */}
      <rect x="26" y="24" width="140" height="92" rx="14" fill="white" stroke="rgba(15,23,2,0.08)" strokeWidth="1" />
      {/* Avatar */}
      <circle cx="57" cy="52" r="16" fill="rgba(15,23,2,0.07)" />
      <circle cx="57" cy="48" r="7" fill="rgba(15,23,2,0.18)" />
      <circle cx="57" cy="62" r="10" fill="rgba(15,23,2,0.1)" />
      {/* Name line */}
      <rect x="81" y="44" width="56" height="7" rx="3.5" fill="rgba(15,23,2,0.35)" />
      {/* Handle */}
      <rect x="81" y="55" width="38" height="5" rx="2.5" fill="rgba(15,23,2,0.15)" />
      {/* Divider */}
      <line x1="40" y1="76" x2="152" y2="76" stroke="rgba(15,23,2,0.07)" strokeWidth="1" />
      {/* Bio lines */}
      <rect x="40" y="83" width="112" height="5" rx="2.5" fill="rgba(15,23,2,0.1)" />
      <rect x="40" y="92" width="80" height="5" rx="2.5" fill="rgba(15,23,2,0.07)" />
      {/* Social pills */}
      <rect x="40" y="104" width="26" height="8" rx="4" fill="rgba(15,23,2,0.07)" />
      <rect x="70" y="104" width="26" height="8" rx="4" fill="rgba(15,23,2,0.07)" />
      <rect x="100" y="104" width="26" height="8" rx="4" fill="rgba(15,23,2,0.07)" />
      {/* Verified badge */}
      <circle cx="144" cy="108" r="7" fill="rgba(15,23,2,0.1)" />
      <path d="M141 108l2 2 4-4" stroke="rgba(15,23,2,0.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IllustrationTipping() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes coinFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
          @keyframes trailFade {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
          .coin-anim { animation: coinFloat 2.4s ease-in-out infinite; transform-origin: 100px 70px; }
          .trail-anim { animation: trailFade 2.4s ease-in-out infinite; }
        }
      `}</style>
      {/* Left wallet */}
      <rect x="18" y="50" width="44" height="40" rx="10" fill="white" stroke="rgba(15,23,2,0.1)" strokeWidth="1" />
      <rect x="26" y="62" width="28" height="5" rx="2.5" fill="rgba(15,23,2,0.2)" />
      <rect x="26" y="71" width="18" height="4" rx="2" fill="rgba(15,23,2,0.1)" />
      {/* Right wallet */}
      <rect x="138" y="50" width="44" height="40" rx="10" fill="white" stroke="rgba(15,23,2,0.1)" strokeWidth="1" />
      <rect x="146" y="62" width="28" height="5" rx="2.5" fill="rgba(15,23,2,0.2)" />
      <rect x="146" y="71" width="18" height="4" rx="2" fill="rgba(15,23,2,0.1)" />
      {/* Trail dots */}
      <circle className="trail-anim" cx="80" cy="70" r="3" fill="rgba(15,23,2,0.15)" />
      <circle className="trail-anim" cx="95" cy="68" r="2.5" fill="rgba(15,23,2,0.1)" style={{ animationDelay: '0.2s' }} />
      <circle className="trail-anim" cx="110" cy="70" r="2" fill="rgba(15,23,2,0.07)" style={{ animationDelay: '0.4s' }} />
      {/* Arrow */}
      <path d="M68 70 Q100 52 132 70" stroke="rgba(15,23,2,0.08)" strokeWidth="1" strokeDasharray="4 3" />
      {/* SOL coin */}
      <g className="coin-anim">
        <circle cx="100" cy="62" r="14" fill="rgba(15,23,2,0.07)" stroke="rgba(15,23,2,0.18)" strokeWidth="1" />
        <text x="100" y="67" textAnchor="middle" fontSize="11" fill="rgba(15,23,2,0.55)" fontWeight="700">◎</text>
      </g>
      {/* Labels */}
      <rect x="22" y="96" width="36" height="5" rx="2.5" fill="rgba(15,23,2,0.07)" />
      <rect x="142" y="96" width="36" height="5" rx="2.5" fill="rgba(15,23,2,0.07)" />
    </svg>
  )
}

function IllustrationAI() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          @keyframes dotPop {
            0%, 80%, 100% { transform: scaleY(0.4); opacity: 0.4; }
            40% { transform: scaleY(1); opacity: 1; }
          }
          .cursor-blink { animation: blink 1s step-end infinite; }
          .dot1 { animation: dotPop 1.2s ease-in-out infinite; transform-origin: center; }
          .dot2 { animation: dotPop 1.2s ease-in-out 0.2s infinite; transform-origin: center; }
          .dot3 { animation: dotPop 1.2s ease-in-out 0.4s infinite; transform-origin: center; }
        }
      `}</style>
      {/* User bubble (right) */}
      <rect x="72" y="20" width="104" height="30" rx="12" fill="rgba(15,23,2,0.08)" stroke="rgba(15,23,2,0.06)" strokeWidth="1" />
      <rect x="82" y="30" width="60" height="5" rx="2.5" fill="rgba(15,23,2,0.3)" />
      <rect x="82" y="38" width="42" height="4" rx="2" fill="rgba(15,23,2,0.15)" />
      {/* Bubble tail right */}
      <path d="M170 50 L178 54 L170 50" fill="rgba(15,23,2,0.08)" />

      {/* AI bubble (left) */}
      <rect x="24" y="62" width="116" height="36" rx="12" fill="white" stroke="rgba(15,23,2,0.08)" strokeWidth="1" />
      <rect x="34" y="72" width="76" height="5" rx="2.5" fill="rgba(15,23,2,0.22)" />
      <rect x="34" y="81" width="56" height="4" rx="2" fill="rgba(15,23,2,0.12)" />
      {/* Cursor */}
      <rect className="cursor-blink" x="92" y="81" width="2" height="4" rx="1" fill="rgba(15,23,2,0.5)" />

      {/* Thinking bubble */}
      <rect x="24" y="108" width="56" height="22" rx="10" fill="rgba(15,23,2,0.04)" stroke="rgba(15,23,2,0.07)" strokeWidth="1" />
      <circle className="dot1" cx="40" cy="119" r="3" fill="rgba(15,23,2,0.3)" />
      <circle className="dot2" cx="52" cy="119" r="3" fill="rgba(15,23,2,0.3)" />
      <circle className="dot3" cx="64" cy="119" r="3" fill="rgba(15,23,2,0.3)" />
    </svg>
  )
}

function IllustrationBadges() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-full">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes badgePulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
          .badge-pulse { animation: badgePulse 3s ease-in-out infinite; }
          .badge-pulse-2 { animation: badgePulse 3s ease-in-out 1s infinite; }
          .badge-pulse-3 { animation: badgePulse 3s ease-in-out 2s infinite; }
        }
      `}</style>
      {/* Connection lines */}
      <line x1="100" y1="70" x2="58" y2="44" stroke="rgba(15,23,2,0.07)" strokeWidth="1" />
      <line x1="100" y1="70" x2="142" y2="44" stroke="rgba(15,23,2,0.07)" strokeWidth="1" />
      <line x1="100" y1="70" x2="58" y2="96" stroke="rgba(15,23,2,0.07)" strokeWidth="1" />
      <line x1="100" y1="70" x2="142" y2="96" stroke="rgba(15,23,2,0.07)" strokeWidth="1" />

      {/* Center badge */}
      <circle cx="100" cy="70" r="22" fill="rgba(15,23,2,0.07)" stroke="rgba(15,23,2,0.14)" strokeWidth="1.5" />
      <path d="M91 70l5 5 12-12" stroke="rgba(15,23,2,0.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Outer badges */}
      <g className="badge-pulse">
        <circle cx="58" cy="40" r="16" fill="white" stroke="rgba(15,23,2,0.1)" strokeWidth="1" />
        <path d="M52 40l3.5 3.5 8-8" stroke="rgba(15,23,2,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="badge-pulse-2">
        <circle cx="142" cy="40" r="16" fill="white" stroke="rgba(15,23,2,0.1)" strokeWidth="1" />
        <path d="M136 40l3.5 3.5 8-8" stroke="rgba(15,23,2,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="badge-pulse-3">
        <circle cx="58" cy="100" r="16" fill="white" stroke="rgba(15,23,2,0.1)" strokeWidth="1" />
        <path d="M52 100l3.5 3.5 8-8" stroke="rgba(15,23,2,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="badge-pulse">
        <circle cx="142" cy="100" r="16" fill="white" stroke="rgba(15,23,2,0.1)" strokeWidth="1" />
        <path d="M136 100l3.5 3.5 8-8" stroke="rgba(15,23,2,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Logo text below each outer badge */}
      <rect x="44" y="60" width="28" height="4" rx="2" fill="rgba(15,23,2,0.07)" />
      <rect x="128" y="60" width="28" height="4" rx="2" fill="rgba(15,23,2,0.07)" />
    </svg>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    label: '01',
    title: 'Digital identity',
    description: 'A clean profile with bio, links, location, and community affiliation badges.',
    illustration: <IllustrationIdentity />,
  },
  {
    label: '02',
    title: 'Solana tipping',
    description: 'Receive SOL, USDC, or USDT tips directly from visitors — no middleman.',
    illustration: <IllustrationTipping />,
  },
  {
    label: '03',
    title: 'AI assistant',
    description: 'Upload your CV and let an AI answer visitor questions about your background.',
    illustration: <IllustrationAI />,
  },
  {
    label: '04',
    title: 'Community badges',
    description: 'Display your DAO and protocol affiliations with verified community logos.',
    illustration: <IllustrationBadges />,
  },
]

function FeaturesSection() {
  const { ref, inView } = useInView()
  return (
    <section style={{ background: '#F7F7F5' }}>
      <div className="mx-auto max-w-5xl px-6 py-24">
        {/* Heading */}
        <div
          ref={ref}
          className="mb-14 text-center transition-all duration-700"
          style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(24px)' }}
        >
          <h2
            className="mb-3 text-3xl font-extrabold tracking-[-0.02em] text-[#0F1702] sm:text-4xl"
            style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
          >
            Everything in one place
          </h2>
          <p className="mx-auto max-w-md text-sm text-[#909090]">
            Your complete Web3 identity, beautifully presented.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={i * 100} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  feature,
  delay,
  inView,
}: {
  feature: (typeof FEATURES)[0]
  delay: number
  inView: boolean
}) {
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl transition-all duration-200 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 700ms ease, transform 700ms cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms, box-shadow 200ms ease-out, translate 200ms ease-out`,
        background: 'white',
        border: '1px solid rgba(15,23,2,0.07)',
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,23,2,0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Illustration area */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: 148, padding: '16px 12px 8px', background: '#F7F7F5' }}
      >
        {feature.illustration}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(15,23,2,0.06)' }} />

      {/* Text */}
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <span className="text-[10px] font-semibold tracking-widest text-[#C0C0C0]">
          {feature.label}
        </span>
        <h3
          className="text-sm font-semibold text-[#0F1702]"
          style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
        >
          {feature.title}
        </h3>
        <p className="text-xs leading-relaxed text-[#909090]">
          {feature.description}
        </p>
      </div>
    </div>
  )
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

          <p
            className="mt-12 text-xs text-[#C0C0C0]"
            style={{
              opacity: mounted ? 1 : 0,
              transition: 'opacity 600ms ease 500ms',
            }}
          >
            Free to create. No credit card required.
          </p>
        </div>
      </main>

      {/* Features */}
      <FeaturesSection />

      {/* CTA band */}
      <section className="border-t border-[#F0F0F0] bg-white px-6 py-20 text-center">
        <h2
          className="mb-4 text-3xl font-bold text-[#0F1702] sm:text-4xl"
          style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
        >
          Ready to own your identity?
        </h2>
        <p className="mx-auto mb-8 max-w-md text-[#909090]">
          Join creators, builders, and contributors who use Myntro to share everything in one link.
        </p>
        <GreenCTA href="/signup">
          Get your Myntro
          <ArrowRight className="h-4 w-4" />
        </GreenCTA>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-[#C0C0C0] sm:flex-row">
          <MyntroLogo size="sm" />
          <span>© 2026 Myntro. Built on Solana.</span>
        </div>
      </footer>
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
