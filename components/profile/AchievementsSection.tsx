import Image from 'next/image'
import { ExternalLink, Trophy } from 'lucide-react'
import type { Achievement } from '@/types'

interface AchievementsSectionProps {
  achievements: Achievement[]
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  if (!achievements.length) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
  const formattedDate = achievement.date
    ? new Date(achievement.date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null

  const content = (
    <div className="group flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      {/* Image or icon */}
      <div className="flex-shrink-0">
        {achievement.image_url ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-xl">
            <Image
              src={achievement.image_url}
              alt={achievement.title}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 leading-tight">
            {achievement.title}
          </h3>
          {achievement.link && (
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-400 dark:text-gray-600 dark:group-hover:text-gray-500" />
          )}
        </div>

        {achievement.description && (
          <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {achievement.description}
          </p>
        )}

        {formattedDate && (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{formattedDate}</p>
        )}
      </div>
    </div>
  )

  if (achievement.link) {
    return (
      <a href={achievement.link} target="_blank" rel="noopener noreferrer" className="no-underline">
        {content}
      </a>
    )
  }

  return content
}
