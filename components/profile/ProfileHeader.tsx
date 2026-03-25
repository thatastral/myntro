'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Sun, Moon, Sparkles, Zap } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { AIChatSidebar } from '@/components/profile/AIChatWidget'
import dynamic from 'next/dynamic'
import type { User, Affiliation } from '@/types'

const TipModal = dynamic(
  () => import('@/components/profile/TipModal').then((m) => m.TipModal),
  { ssr: false },
)

interface ProfileHeaderProps {
  user: User
  walletAddress?: string | null
  affiliations?: Affiliation[]
}

export function ProfileHeader({ user, walletAddress, affiliations = [] }: ProfileHeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [aiOpen, setAiOpen] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Top row: Avatar + actions */}
        <div className="flex items-start justify-between">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.name || user.username}
                fill
                className="object-cover"
                sizes="80px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400 dark:text-gray-500">
                {(user.name || user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Tip button — secondary, shown only if wallet connected */}
            {walletAddress && (
              <button
                onClick={() => setTipOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-amber-800 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Tip</span>
              </button>
            )}

            {/* AI button — primary */}
            <button
              onClick={() => setAiOpen(true)}
              aria-label="Ask AI about this profile"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 dark:shadow-violet-900/40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Name + affiliation badges + handle */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              {user.name || user.username}
            </h1>

            {/* Only show the featured affiliation if it's verified — nothing otherwise */}
            {user.featured_affiliation_id && (
              <div className="flex items-center gap-1.5">
                {affiliations.filter((a) => a.id === user.featured_affiliation_id && a.verified).map((a) => (
                  <div key={a.id} className="group relative">
                    {/* Logo square */}
                    <div className="h-7 w-7 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      {a.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.logo_url}
                          alt={a.community_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400 dark:text-gray-500">
                          {a.community_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-700">
                      <div className="flex items-center gap-1.5">
                        {a.verified && (
                          <svg className="h-3 w-3 text-blue-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.707 6.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L7 8.086l3.293-3.293a1 1 0 011.414 1.414z" />
                          </svg>
                        )}
                        <span>
                          {a.role
                            ? `${a.role} · ${a.community_name}`
                            : `Member · ${a.community_name}`}
                        </span>
                      </div>
                      {/* Arrow */}
                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">@{user.username}</p>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {user.bio}
          </p>
        )}

        {/* Location */}
        {user.location && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{user.location}</span>
          </div>
        )}
      </div>

      {/* AI Chat Sidebar */}
      <AIChatSidebar
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        username={user.username}
        ownerName={user.name || user.username}
      />

      {/* Tip Modal */}
      {walletAddress && (
        <TipModal
          open={tipOpen}
          onClose={() => setTipOpen(false)}
          ownerName={user.name || user.username}
          walletAddress={walletAddress}
        />
      )}
    </>
  )
}
