'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, CaretUp, CaretDown, X } from '@phosphor-icons/react'
import type { User, Link, Block, Achievement, Wallet } from '@/types'

export interface ProfileChecklistProps {
  user: User
  links: Link[]
  blocks: Block[]
  achievements: Achievement[]
  wallets: Wallet[]
}

type Data = ProfileChecklistProps

const ITEMS: { key: string; label: string; scrollTo: string; done: (d: Data) => boolean }[] = [
  { key: 'photo',       label: 'Add a profile photo',  scrollTo: 'tour-avatar',       done: (d) => !!d.user.avatar_url },
  { key: 'bio',         label: 'Write a bio',           scrollTo: 'tour-profile',      done: (d) => !!d.user.bio?.trim() },
  { key: 'link',        label: 'Add a social link',     scrollTo: 'tour-links',        done: (d) => d.links.length > 0 },
  { key: 'block',       label: 'Add a content block',   scrollTo: 'tour-blocks',       done: (d) => d.blocks.length > 0 },
  { key: 'achievement', label: 'Add an achievement',    scrollTo: 'tour-achievements', done: (d) => d.achievements.length > 0 },
  { key: 'wallet',      label: 'Connect a wallet',      scrollTo: 'tour-identity',     done: (d) => d.wallets.length > 0 },
]

const DISMISSED_KEY = 'myntro-checklist-dismissed'

export function ProfileChecklist({ user, links, blocks, achievements, wallets }: ProfileChecklistProps) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(true) // true until localStorage is checked

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
  }, [])

  const data: Data = { user, links, blocks, achievements, wallets }
  const doneCount = ITEMS.filter(item => item.done(data)).length
  const allDone = doneCount === ITEMS.length
  const pct = Math.round((doneCount / ITEMS.length) * 100)

  // Auto-dismiss 2.5s after all items are done
  useEffect(() => {
    if (!allDone || dismissed) return
    const t = setTimeout(() => {
      localStorage.setItem(DISMISSED_KEY, '1')
      setDismissed(true)
    }, 2500)
    return () => clearTimeout(t)
  }, [allDone, dismissed])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (dismissed) return null

  return (
    <div
      className="fixed left-1/2 z-30 -translate-x-1/2 overflow-hidden rounded-t-2xl border border-b-0 border-[#EBEBEB] bg-white shadow-[0_-4px_20px_rgba(15,23,2,0.08)]"
      style={{ bottom: 56, width: 'min(512px, calc(100% - 32px))' }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#0F1702]">
            {allDone ? 'Profile complete' : 'Complete your profile'}
          </span>
          <span className="text-[11px] text-[#C0C0C0]">{doneCount} of {ITEMS.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {expanded
            ? <CaretDown className="h-3.5 w-3.5 text-[#C0C0C0]" />
            : <CaretUp className="h-3.5 w-3.5 text-[#C0C0C0]" />
          }
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); dismiss() }}
            className="flex h-5 w-5 items-center justify-center rounded-full text-[#C0C0C0] transition-colors hover:bg-[#F5F5F5] hover:text-[#909090]"
          >
            <X className="h-3 w-3" />
          </span>
        </div>
      </button>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-[#F0F0F0]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: '#8EE600' }}
        />
      </div>

      {/* Expanded item list */}
      {expanded && (
        <div className="border-t border-[#F5F5F5] pb-2">
          {ITEMS.map(item => {
            const done = item.done(data)
            return (
              <button
                key={item.key}
                onClick={() => { if (!done) scrollTo(item.scrollTo) }}
                disabled={done}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#FAFAFA] disabled:cursor-default"
              >
                {done
                  ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-[#8EE600]" weight="fill" />
                  : <Circle className="h-4 w-4 flex-shrink-0 text-[#D0D0D0]" />
                }
                <span className={`text-sm ${done ? 'text-[#C0C0C0] line-through' : 'text-[#0F1702]'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
