'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ArrowSquareOut, Trophy } from '@phosphor-icons/react'
import type { Achievement } from '@/types'

interface AchievementsSectionProps {
  achievements: Achievement[]
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
}

function LinkPopup({ url, x, y }: { url: string; x: number; y: number }) {
  const domain = getDomain(url)
  const popupWidth = 288
  const popupHeight = 210
  const offset = 20

  let top = y - popupHeight - offset
  let left = x + offset

  if (top < 8) top = y + offset
  if (left + popupWidth + 8 > window.innerWidth) left = x - popupWidth - offset
  if (left < 8) left = 8

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] w-[288px] overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_12px_48px_rgba(15,23,2,0.18)]"
      style={{ top, left }}
    >
      <div className="relative h-[160px] w-full overflow-hidden bg-[#F0F0F0]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=576&h=320`}
          alt=""
          className="h-full w-full object-cover object-top"
        />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/60 to-transparent" />
      </div>
      <div className="flex items-center gap-2 border-t border-[#F5F5F5] px-3 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
        />
        <span className="flex-1 truncate text-xs font-medium text-[#0F1702]">{domain}</span>
        <ArrowSquareOut className="h-3.5 w-3.5 flex-shrink-0 text-[#C0C0C0]" />
      </div>
    </div>,
    document.body,
  )
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  if (!achievements.length) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#909090]">
        Achievements
      </h2>
      <div className="grid gap-3">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  )
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [visible, setVisible] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!achievement.link) return
    setCursor({ x: e.clientX, y: e.clientY })
    if (!visible) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), 250)
    }
  }, [achievement.link, visible])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    setCursor(null)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const formattedDate = achievement.date
    ? new Date(achievement.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  const card = (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group flex gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-4 transition-all duration-200 ease-out hover:border-[#D5D5D5] hover:shadow-[0_4px_12px_rgba(15,23,2,0.08)] hover:-translate-y-0.5"
    >
      <div className="flex-shrink-0">
        {achievement.image_url ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-xl">
            <Image src={achievement.image_url} alt={achievement.title} fill className="object-cover" sizes="48px" />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#EBEBEB] bg-[#F5F5F5]">
            <Trophy className="h-5 w-5 text-[#0F1702]/40" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold leading-tight text-[#0F1702]"
            style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
          >
            {achievement.title}
          </h3>
          {achievement.link && (
            <ArrowSquareOut className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#D0D0D0] transition-colors group-hover:text-[#909090]" />
          )}
        </div>

        {achievement.description && (
          <p className="mt-1 text-sm leading-relaxed text-[#909090]">{achievement.description}</p>
        )}

        {formattedDate && (
          <p className="mt-1.5 text-xs text-[#C0C0C0]">{formattedDate}</p>
        )}
      </div>

      {visible && cursor && achievement.link && (
        <LinkPopup url={achievement.link} x={cursor.x} y={cursor.y} />
      )}
    </div>
  )

  if (achievement.link) {
    return (
      <a href={achievement.link} target="_blank" rel="noopener noreferrer" className="no-underline">
        {card}
      </a>
    )
  }

  return card
}
