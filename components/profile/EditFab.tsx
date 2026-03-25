'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { Pencil } from 'lucide-react'

interface EditFabProps {
  username: string
  userId: string
}

export function EditFab({ username, userId }: EditFabProps) {
  const { user, loading } = useAuth()

  if (loading || !user || user.id !== userId) return null

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
