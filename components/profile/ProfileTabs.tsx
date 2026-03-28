'use client'

import { useState } from 'react'
import { AchievementsSection } from './AchievementsSection'
import { BentoGrid } from '@/components/blocks/BentoGrid'
import type { Achievement, Block, Section } from '@/types'

interface ProfileTabsProps {
  blocks: Block[]
  sections: Section[]
  achievements: Achievement[]
  username?: string
}

export function ProfileTabs({ blocks, sections, achievements, username }: ProfileTabsProps) {
  const [tab, setTab] = useState<'me' | 'achievements'>('me')

  return (
    <div className="flex flex-col gap-4">
      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex items-center gap-1 self-start rounded-full border border-[#EBEBEB] bg-[#FAFAFA] p-1"
      >
        {(['me', 'achievements'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`tabpanel-${t}`}
            id={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
              tab === t
                ? 'bg-[#0F1702] text-white shadow-sm'
                : 'text-[#909090] hover:text-[#0F1702]'
            }`}
          >
            {t === 'me' ? 'Me' : 'Achievements'}
          </button>
        ))}
      </div>

      {tab === 'me' && (
        <div
          id="tabpanel-me"
          role="tabpanel"
          aria-labelledby="tab-me"
          style={{ animation: 'tabFadeIn 120ms ease forwards' }}
        >
          <style>{`
            @keyframes tabFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <BentoGrid blocks={blocks} sections={sections} username={username} />
        </div>
      )}
      {tab === 'achievements' && achievements.length > 0 && (
        <div
          id="tabpanel-achievements"
          role="tabpanel"
          aria-labelledby="tab-achievements"
          style={{ animation: 'tabFadeIn 120ms ease forwards' }}
        >
          <AchievementsSection achievements={achievements} />
        </div>
      )}
    </div>
  )
}
