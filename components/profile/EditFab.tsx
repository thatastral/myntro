'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { PencilSimple } from '@phosphor-icons/react'

interface EditFabProps {
  username: string
  userId: string
}

export function EditFab({ username, userId }: EditFabProps) {
  const { user, loading } = useAuth()

  if (loading) return null

  // Owner — show edit button
  if (user && user.id === userId) {
    return (
      <Link
        href={`/${username}/edit`}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#182403] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#2D3F05] hover:shadow-xl active:scale-95"
      >
        <PencilSimple className="h-3.5 w-3.5" />
        Edit page
      </Link>
    )
  }

  // Unauthenticated visitor — "Get your Myntro" CTA
  if (!user) {
    return (
      <Link
        href={`/signup?ref=${username}`}
        className="fixed bottom-6 right-6 z-50 inline-flex h-12 items-center rounded-xl px-6 font-semibold text-[#182403] transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
        style={{
          fontSize: '16px',
          lineHeight: 1,
          background: 'linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)',
          boxShadow: '0 4px 20px rgba(142,230,0,0.4), 0 1px 0 rgba(255,255,255,0.6) inset',
        }}
      >
        Get your Myntro
      </Link>
    )
  }

  return null
}
