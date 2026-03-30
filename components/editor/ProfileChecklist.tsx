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
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
  }, [])

  const data: Data = { user, links, blocks, achievements, wallets }
  const doneCount = ITEMS.filter(item => item.done(data)).length
  const allDone = doneCount === ITEMS.length
  const pct = Math.round((doneCount / ITEMS.length) * 100)

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
    setExpanded(false)
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-[76px] left-5 z-50" style={{ width: 220 }}>
      {/* Expanded list — opens upward */}
      {expanded && (
        <div className="mb-2 overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_4px_20px_rgba(15,23,2,0.10)]">
          {ITEMS.map(item => {
            const done = item.done(data)
            return (
              <button
                key={item.key}
                onClick={() => { if (!done) scrollTo(item.scrollTo) }}
                disabled={done}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[#FAFAFA] first:rounded-t-2xl last:rounded-b-2xl disabled:cursor-default"
              >
                {done
                  ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[#8EE600]" weight="fill" />
                  : <Circle className="h-3.5 w-3.5 flex-shrink-0 text-[#D0D0D0]" />
                }
                <span className={`text-xs ${done ? 'text-[#C0C0C0] line-through' : 'text-[#0F1702]'}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Collapsed pill — matches Customisation badge style */}
      <div className="flex items-center gap-2 rounded-2xl border border-[#E8E8E8] bg-white px-3.5 py-2.5 shadow-md">
        {/* Progress bar */}
        <div className="h-1 w-14 flex-shrink-0 overflow-hidden rounded-full bg-[#F0F0F0]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: '#8EE600' }}
          />
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex flex-1 items-center gap-1.5 text-left"
        >
          <span className="text-[13px] font-semibold text-[#0F1702]">
            {allDone ? 'Complete' : `${doneCount}/${ITEMS.length}`}
          </span>
          {expanded
            ? <CaretDown className="h-3 w-3 text-[#C0C0C0]" />
            : <CaretUp className="h-3 w-3 text-[#C0C0C0]" />
          }
        </button>

        <button
          onClick={dismiss}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[#C0C0C0] transition-colors hover:bg-[#F5F5F5] hover:text-[#909090]"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}
