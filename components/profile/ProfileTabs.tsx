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
      <div className="flex items-center gap-1 self-start rounded-full border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
        {(['me', 'achievements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t === 'me' ? 'Me' : 'Achievements'}
          </button>
        ))}
      </div>

      {tab === 'me' && <BentoGrid blocks={blocks} sections={sections} username={username} />}
      {tab === 'achievements' && achievements.length > 0 && (
        <AchievementsSection achievements={achievements} />
      )}
    </div>
  )
}
