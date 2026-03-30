'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatCircle, CircleNotch, CheckCircle, X } from '@phosphor-icons/react'

interface FeedbackFabProps {
  username: string
  name: string
  email: string
}

export function FeedbackFab({ username, name }: FeedbackFabProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [workingWell, setWorkingWell] = useState('')
  const [blockers, setBlockers] = useState('')
  const [otherNotes, setOtherNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSubmit = async () => {
    if (!rating || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          working_well: workingWell,
          blockers,
          other_notes: otherNotes,
          username,
          name,
        }),
      })
      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setRating(0)
        setWorkingWell('')
        setBlockers('')
        setOtherNotes('')
      }, 2000)
    } catch {
      // silent — email best-effort
    } finally {
      setSubmitting(false)
    }
  }

  const textareaClass =
    'w-full resize-none rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2 text-sm text-[#0F1702] outline-none placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20'

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Panel */}
      {open && (
        <div className="w-72 rounded-2xl border border-[#E8E8E8] bg-white p-5 shadow-lg">
          {submitted ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <CheckCircle className="h-8 w-8 text-[#4A7A00]" weight="fill" />
              <p className="text-sm font-semibold text-[#0F1702]">Thanks for the feedback!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0F1702]">Share your feedback</p>
                  <p className="text-xs text-[#909090]">Help us improve Myntro</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-[#C0C0C0] transition-colors hover:text-[#0F1702]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Rating */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#0F1702]">Overall rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(star)}
                      className="text-2xl leading-none transition-transform hover:scale-110"
                      style={{ color: star <= (hovered || rating) ? '#8EE600' : '#C0C0C0' }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#0F1702]">What's working well?</p>
                <textarea
                  rows={3}
                  value={workingWell}
                  onChange={(e) => setWorkingWell(e.target.value)}
                  placeholder="Tell us what you love..."
                  className={textareaClass}
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-[#0F1702]">What's blocking you?</p>
                <textarea
                  rows={3}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Any bugs, friction, or missing features..."
                  className={textareaClass}
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-[#0F1702]">Anything else? <span className="text-[#C0C0C0] font-normal">(optional)</span></p>
                <textarea
                  rows={2}
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  placeholder="Other thoughts..."
                  className={textareaClass}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!rating || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1702] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A2E03] disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <CircleNotch className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Submit feedback'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-2 rounded-2xl px-3.5 py-2.5 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
        style={{ background: '#0F1702', boxShadow: '0 2px 12px rgba(15,23,2,0.18)' }}
      >
        <ChatCircle className="h-3.5 w-3.5 shrink-0" style={{ color: '#F1FCDF' }} weight="bold" />
        <span className="text-[13px] font-semibold" style={{ color: '#F1FCDF' }}>Feedback</span>
      </button>
    </div>
  )
}
