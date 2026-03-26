'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface JoinCTAProps {
  username: string
  userId: string
}

export function JoinCTA({ username, userId }: JoinCTAProps) {
  const { user, loading } = useAuth()

  if (loading || (user && user.id === userId)) return null

  return (
    <Link
      href={`/signup?ref=${username}`}
      className="flex h-12 w-full items-center justify-center rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
      style={{
        background: '#0F1702',
        color: '#F1FCDF',
        fontSize: 15,
        boxShadow: '0 2px 12px rgba(15,23,2,0.18)',
      }}
    >
      Join @{username} on Myntro
    </Link>
  )
}
