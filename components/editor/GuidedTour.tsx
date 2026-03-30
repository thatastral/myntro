'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Check } from '@phosphor-icons/react'

const STEPS = [
  { id: 'welcome',      target: null,               title: 'Welcome to your Myntro',  body: 'Quick tour — takes 30 seconds. Skip any time.' },
  { id: 'avatar',       target: 'tour-avatar',       title: 'Profile photo',            body: 'Tap to upload your photo. First impressions count.' },
  { id: 'profile',      target: 'tour-profile',      title: 'Edit inline',              body: 'Tap your name, bio, or location to edit it directly.' },
  { id: 'links',        target: 'tour-links',        title: 'Your links',               body: 'Add your socials and website so people can find you.' },
  { id: 'blocks',       target: 'tour-blocks',       title: 'Content blocks',           body: 'Add notes, links, Spotify, YouTube — your story, your way.' },
  { id: 'achievements', target: 'tour-achievements', title: 'Achievements',             body: 'Switch here to add projects, awards, and milestones.' },
  { id: 'identity',     target: 'tour-identity',     title: 'CV & Wallet',              body: 'Upload your CV to power your AI. Connect a wallet to receive tips.' },
  { id: 'analytics',    target: 'tour-analytics',    title: 'Analytics',                body: "Track views, tips, and who's visiting your page." },
]

interface Rect { top: number; left: number; width: number; height: number }

interface GuidedTourProps {
  onFinish: () => void
}

function getTooltipPos(spot: Rect): { top: number; left: number } {
  const PAD = 14
  const TH = 168
  const TW = 320

  const spaceBelow = window.innerHeight - (spot.top + spot.height)
  const spaceAbove = spot.top

  let top: number
  if (spaceBelow >= TH + PAD) {
    top = spot.top + spot.height + PAD
  } else if (spaceAbove >= TH + PAD) {
    top = spot.top - TH - PAD
  } else {
    top = Math.max(PAD, window.innerHeight - TH - PAD)
  }

  let left = spot.left
  if (left + TW + PAD > window.innerWidth) left = window.innerWidth - TW - PAD
  if (left < PAD) left = PAD
  return { top, left }
}

export function GuidedTour({ onFinish }: GuidedTourProps) {
  const [step, setStep] = useState(0)
  const [spot, setSpot] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const current = STEPS[step]

  const measure = useCallback(() => {
    if (!current.target) { setSpot(null); setTooltipPos(null); return }
    const el = document.getElementById(current.target)
    if (!el) { setSpot(null); setTooltipPos(null); return }
    const r = el.getBoundingClientRect()
    const pad = 10
    const sr: Rect = {
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    }
    setSpot(sr)
    setTooltipPos(getTooltipPos(sr))
  }, [current.target])

  useEffect(() => {
    if (!current.target) { setSpot(null); setTooltipPos(null); return }
    const el = document.getElementById(current.target)
    if (!el) { setSpot(null); setTooltipPos(null); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(measure, 380)
    return () => clearTimeout(t)
  }, [step, current.target, measure])

  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const goNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else onFinish()
  }
  const goBack = () => { if (step > 0) setStep(s => s - 1) }

  if (!mounted) return null

  const isWelcome = !current.target
  const isLast = step === STEPS.length - 1

  return createPortal(
    <>
      {/* Dim overlay — blocks all page interaction */}
      <div
        className="fixed inset-0 z-[9000]"
        style={{ background: 'rgba(15,23,2,0.55)' }}
      />

      {/* Spotlight hole */}
      {spot && (
        <div
          className="fixed z-[9001] rounded-[14px]"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: '0 0 0 9999px rgba(15,23,2,0.55)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[9010] w-[320px] rounded-2xl border border-[#EBEBEB] bg-white p-5 shadow-[0_8px_32px_rgba(15,23,2,0.18)]"
        style={
          isWelcome
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : tooltipPos
              ? { top: tooltipPos.top, left: tooltipPos.left }
              : { visibility: 'hidden' }
        }
      >
        {/* Top row */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] text-[#C0C0C0]">
            {isWelcome ? 'Myntro tour' : `Step ${step} of ${STEPS.length - 1}`}
          </span>
          <button
            onClick={onFinish}
            className="text-[11px] text-[#C0C0C0] transition-colors hover:text-[#909090]"
          >
            Skip tour →
          </button>
        </div>

        <h3
          className="mb-1.5 text-[15px] font-bold text-[#0F1702]"
          style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
        >
          {current.title}
        </h3>
        <p className="mb-5 text-[13px] leading-relaxed text-[#909090]">
          {current.body}
        </p>

        {/* Step dots */}
        <div className="mb-4 flex items-center gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 16 : 4,
                background: i === step ? '#0F1702' : '#E0E0E0',
              }}
            />
          ))}
        </div>

        {/* Nav row */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-xs text-[#C0C0C0] transition-colors hover:text-[#909090]"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          ) : <span />}

          <button
            onClick={goNext}
            className="flex items-center gap-1.5 rounded-xl bg-[#0F1702] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1A2E03] active:scale-[0.97]"
          >
            {isLast ? (
              <><Check className="h-3 w-3" /> Done</>
            ) : (
              <>Next <ArrowRight className="h-3 w-3" /></>
            )}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
