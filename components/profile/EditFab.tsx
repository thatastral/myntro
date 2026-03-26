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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0F1702] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#1A2E03] hover:shadow-xl active:scale-95"
      >
        <PencilSimple className="h-3.5 w-3.5" />
        Edit page
      </Link>
    )
  }

  return null
}
