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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0F1702] px-4 py-3 text-sm font-semibold text-white"
        style={{
          boxShadow: '0 4px 16px rgba(15,23,2,0.18)',
          animation: 'fabIn 500ms cubic-bezier(0.34,1.56,0.64,1) 500ms both',
          transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease',
          willChange: 'transform',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,2,0.25)'
          e.currentTarget.style.background = '#1A2E03'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,2,0.18)'
          e.currentTarget.style.background = '#0F1702'
        }}
      >
        <style>{`
          @keyframes fabIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <PencilSimple className="h-3.5 w-3.5" />
        Edit page
      </Link>
    )
  }

  return null
}
