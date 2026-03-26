'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Sparkle, Lightning } from '@phosphor-icons/react'
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
  const [aiOpen, setAiOpen] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Top row: Avatar + actions */}
        <div className="flex items-start justify-between">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-[#F0F0F0]">
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
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#C0C0C0]">
                {(user.name || user.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {walletAddress && (
              <button
                onClick={() => setTipOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#EBEBEB] bg-white px-3 py-2 text-xs font-semibold text-[#182403] transition-all hover:border-[#D0D0D0] hover:bg-[#FAFAFA]"
              >
                <Lightning className="h-3.5 w-3.5 text-[#909090]" />
                <span className="hidden sm:inline">Tip</span>
              </button>
            )}

            <button
              onClick={() => setAiOpen(true)}
              aria-label="Ask AI about this profile"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#182403] transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
              style={{
                background: 'linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)',
                boxShadow: '0 2px 12px rgba(142,230,0,0.35), 0 1px 0 rgba(255,255,255,0.6) inset',
              }}
            >
              <Sparkle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </div>

        {/* Name + affiliation badges + handle */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className="text-2xl font-bold tracking-tight text-[#182403]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              {user.name || user.username}
            </h1>

            {user.featured_affiliation_id && (
              <div className="flex items-center gap-1.5">
                {affiliations.filter((a) => a.id === user.featured_affiliation_id && a.verified).map((a) => (
                  <div key={a.id} className="group relative">
                    <div className="h-7 w-7 overflow-hidden rounded-lg border border-[#EBEBEB] bg-[#F5F5F5] shadow-sm">
                      {a.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#C0C0C0]">
                          {a.community_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#182403] px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3 w-3 text-[#8EE600] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.707 6.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L7 8.086l3.293-3.293a1 1 0 011.414 1.414z" />
                        </svg>
                        <span>{a.role ? `${a.role} · ${a.community_name}` : `Member · ${a.community_name}`}</span>
                      </div>
                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#182403]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[#909090]">@{user.username}</p>
        </div>

        {user.bio && (
          <p className="max-w-sm text-sm leading-relaxed text-[#909090]">
            {user.bio}
          </p>
        )}

        {user.location && (
          <div className="flex items-center gap-1.5 text-xs text-[#909090]">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{user.location}</span>
          </div>
        )}
      </div>

      <AIChatSidebar
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        username={user.username}
        ownerName={user.name || user.username}
      />

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
