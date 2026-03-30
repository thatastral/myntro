'use client'

import { useEffect } from 'react'

export function ProfileTracker({ username }: { username: string }) {
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, event_type: 'profile_view' }),
    }).catch(() => {})
  }, [username])
  return null
}
