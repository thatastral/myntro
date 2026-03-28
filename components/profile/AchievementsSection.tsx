import Image from 'next/image'
import { ArrowSquareOut, Trophy } from '@phosphor-icons/react'
import type { Achievement } from '@/types'

interface AchievementsSectionProps {
  achievements: Achievement[]
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
  const formattedDate = achievement.date
    ? new Date(achievement.date).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null

  const content = (
    <div className="group flex gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-4 transition-all duration-200 ease-out hover:border-[#D5D5D5] hover:shadow-[0_4px_12px_rgba(15,23,2,0.08)] hover:-translate-y-0.5">
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] border border-[#EBEBEB]">
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
          <p className="mt-1 text-sm leading-relaxed text-[#909090]">
            {achievement.description}
          </p>
        )}

        {formattedDate && (
          <p className="mt-1.5 text-xs text-[#C0C0C0]">{formattedDate}</p>
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
