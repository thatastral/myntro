'use client'

import { useEffect } from 'react'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Profile page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center px-4">
        <p className="text-sm text-gray-500 mb-2">Failed to load profile</p>
        <p className="text-xs text-gray-400 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
