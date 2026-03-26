'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { Pencil, Sparkles } from 'lucide-react'

interface EditFabProps {
  username: string
  userId: string
}

export function EditFab({ username, userId }: EditFabProps) {
  const { user, loading } = useAuth()

  if (loading) return null

  // Owner — show Edit button
  if (user?.id === userId) {
    return (
      <Link
        href={`/${username}/edit`}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-gray-700 hover:shadow-xl active:scale-95 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit page
      </Link>
    )
  }

  // Signed-in but not the owner — show nothing
  if (user) return null

  // Unauthenticated visitor — show "Get your Myntro" CTA
  return (
    <Link
      href={`/signup?ref=${username}`}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-green-400 hover:shadow-xl active:scale-95"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Get your Myntro
    </Link>
  )
}
