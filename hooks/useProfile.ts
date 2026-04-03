'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProfileData, User, Link, Achievement, Affiliation, Block, BlockType, Section } from '@/types'

interface UseProfileReturn {
  profile: ProfileData | null
  loading: boolean
  error: string | null
  refetch: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  addLink: (link: Omit<Link, 'id' | 'user_id' | 'created_at' | 'display_order'>) => Promise<Link>
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>
  deleteLink: (id: string) => Promise<void>
  reorderLinks: (orderedIds: string[]) => Promise<void>
  addAchievement: (achievement: Omit<Achievement, 'id' | 'user_id' | 'created_at'>) => Promise<Achievement>
  updateAchievement: (id: string, updates: Partial<Achievement>) => Promise<void>
  deleteAchievement: (id: string) => Promise<void>
  addAffiliation: (affiliation: Omit<Affiliation, 'id' | 'user_id' | 'created_at' | 'verified'>) => Promise<Affiliation>
  updateAffiliation: (id: string, updates: Omit<Affiliation, 'id' | 'user_id' | 'created_at' | 'verified'>) => Promise<void>
  deleteAffiliation: (id: string) => Promise<void>
  addBlock: (type: BlockType, content: Record<string, string>, span: 1 | 2, sectionId?: string | null) => Promise<Block>
  updateBlock: (id: string, content: Record<string, string>) => Promise<void>
  updateBlockSpan: (id: string, span: 1 | 2) => Promise<void>
  deleteBlock: (id: string) => Promise<void>
  reorderBlocks: (updates: { id: string; section_id: string | null; display_order: number }[]) => Promise<void>
  addSection: (title: string) => Promise<Section>
  updateSection: (id: string, title: string) => Promise<void>
  deleteSection: (id: string) => Promise<void>
  reorderSections: (orderedIds: string[]) => Promise<void>
}

export function useProfile(username: string): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!username) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/profile?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Profile not found')
        return res.json()
      })
      .then((data: ProfileData) => {
        if (!cancelled) {
          setProfile({ ...data, sections: data.sections ?? [] })
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [username, refreshKey])

  const updateProfile = useCallback(
    async (updates: Partial<User>) => {
      let snapshot: ProfileData | null = null
      setProfile((prev) => {
        snapshot = prev
        return prev ? { ...prev, user: { ...prev.user, ...updates } } : prev
      })

      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to update profile')
        }
        const data = await res.json()
        setProfile((prev) => (prev ? { ...prev, user: data.user } : prev))
      } catch (err) {
        setProfile(snapshot)
        throw err
      }
    },
    [],
  )

  const addLink = useCallback(
    async (link: Omit<Link, 'id' | 'user_id' | 'created_at' | 'display_order'>): Promise<Link> => {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(link),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add link')
      }
      const data = await res.json()
      setProfile((prev) =>
        prev ? { ...prev, links: [...prev.links, data.link] } : prev,
      )
      return data.link
    },
    [],
  )

  const updateLink = useCallback(async (id: string, updates: Partial<Link>) => {
    const res = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to update link')
    }
    const data = await res.json()
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            links: prev.links.map((l) => (l.id === id ? data.link : l)),
          }
        : prev,
    )
  }, [])

  const deleteLink = useCallback(async (id: string) => {
    const res = await fetch(`/api/links?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to delete link')
    }
    setProfile((prev) =>
      prev ? { ...prev, links: prev.links.filter((l) => l.id !== id) } : prev,
    )
  }, [])

  const reorderLinks = useCallback(async (orderedIds: string[]) => {
    setProfile((prev) => {
      if (!prev) return prev
      const linkMap = new Map(prev.links.map((l) => [l.id, l]))
      const reordered = orderedIds
        .map((id, index) => {
          const link = linkMap.get(id)
          return link ? { ...link, display_order: index } : null
        })
        .filter(Boolean) as Link[]
      return { ...prev, links: reordered }
    })

    await Promise.all(
      orderedIds.map((id, index) =>
        fetch('/api/links', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, display_order: index }),
        }),
      ),
    )
  }, [])

  const addAchievement = useCallback(
    async (achievement: Omit<Achievement, 'id' | 'user_id' | 'created_at'>): Promise<Achievement> => {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(achievement),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add achievement')
      }
      const data = await res.json()
      setProfile((prev) =>
        prev
          ? { ...prev, achievements: [data.achievement, ...prev.achievements] }
          : prev,
      )
      return data.achievement
    },
    [],
  )

  const updateAchievement = useCallback(
    async (id: string, updates: Partial<Achievement>) => {
      const res = await fetch('/api/achievements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update achievement')
      }
      const data = await res.json()
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              achievements: prev.achievements.map((a) =>
                a.id === id ? data.achievement : a,
              ),
            }
          : prev,
      )
    },
    [],
  )

  const deleteAchievement = useCallback(async (id: string) => {
    const res = await fetch(`/api/achievements?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to delete achievement')
    }
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            achievements: prev.achievements.filter((a) => a.id !== id),
          }
        : prev,
    )
  }, [])

  const addAffiliation = useCallback(
    async (affiliation: Omit<Affiliation, 'id' | 'user_id' | 'created_at' | 'verified'>): Promise<Affiliation> => {
      const res = await fetch('/api/affiliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(affiliation),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add affiliation')
      }
      const data = await res.json()
      setProfile((prev) =>
        prev ? { ...prev, affiliations: [...prev.affiliations, data.affiliation] } : prev,
      )
      return data.affiliation
    },
    [],
  )

  const updateAffiliation = useCallback(
    async (id: string, updates: Omit<Affiliation, 'id' | 'user_id' | 'created_at' | 'verified'>) => {
      const res = await fetch('/api/affiliations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update affiliation')
      }
      const data = await res.json()
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              affiliations: prev.affiliations.map((a) =>
                a.id === id ? data.affiliation : a,
              ),
            }
          : prev,
      )
    },
    [],
  )

  const deleteAffiliation = useCallback(async (id: string) => {
    const res = await fetch(`/api/affiliations?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to delete affiliation')
    }
    setProfile((prev) =>
      prev ? { ...prev, affiliations: prev.affiliations.filter((a) => a.id !== id) } : prev,
    )
  }, [])

  const addBlock = useCallback(async (
    type: BlockType,
    content: Record<string, string>,
    span: 1 | 2,
    sectionId: string | null = null,
  ): Promise<Block> => {
    const res = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, span, section_id: sectionId }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to add block')
    }
    const data = await res.json()
    setProfile((prev) => prev ? { ...prev, blocks: [...prev.blocks, data.block] } : prev)
    return data.block
  }, [])

  const updateBlock = useCallback(async (id: string, content: Record<string, string>) => {
    setProfile((prev) =>
      prev
        ? { ...prev, blocks: prev.blocks.map((b) => (b.id === id ? { ...b, content: { ...b.content, ...content } } : b)) }
        : prev,
    )
    const res = await fetch(`/api/blocks?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      setRefreshKey((k) => k + 1)
    }
  }, [])

  const updateBlockSpan = useCallback(async (id: string, span: 1 | 2) => {
    setProfile((prev) =>
      prev
        ? { ...prev, blocks: prev.blocks.map((b) => (b.id === id ? { ...b, span } : b)) }
        : prev,
    )
    const res = await fetch(`/api/blocks?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ span }),
    })
    if (!res.ok) {
      setRefreshKey((k) => k + 1)
    }
  }, [])

  const deleteBlock = useCallback(async (id: string) => {
    setProfile((prev) => prev ? { ...prev, blocks: prev.blocks.filter((b) => b.id !== id) } : prev)
    const res = await fetch(`/api/blocks?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setRefreshKey((k) => k + 1)
    }
  }, [])

  const reorderBlocks = useCallback(async (
    updates: { id: string; section_id: string | null; display_order: number }[],
  ) => {
    // Optimistic update
    setProfile((prev) => {
      if (!prev) return prev
      const blockMap = new Map(prev.blocks.map((b) => [b.id, b]))
      for (const u of updates) {
        const b = blockMap.get(u.id)
        if (b) blockMap.set(u.id, { ...b, section_id: u.section_id, display_order: u.display_order })
      }
      return { ...prev, blocks: [...blockMap.values()] }
    })

    await Promise.all(
      updates.map(({ id, section_id, display_order }) =>
        fetch(`/api/blocks?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section_id, display_order }),
        }),
      ),
    )
  }, [])

  const addSection = useCallback(async (title: string): Promise<Section> => {
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'Failed to add section')
    }
    const data = await res.json()
    setProfile((prev) =>
      prev ? { ...prev, sections: [...prev.sections, data.section] } : prev,
    )
    return data.section
  }, [])

  const updateSection = useCallback(async (id: string, title: string) => {
    setProfile((prev) =>
      prev
        ? { ...prev, sections: prev.sections.map((s) => (s.id === id ? { ...s, title } : s)) }
        : prev,
    )
    await fetch(`/api/sections?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }, [])

  const deleteSection = useCallback(async (id: string) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.filter((s) => s.id !== id),
            // Blocks in this section become free (section_id → null handled by DB CASCADE SET NULL)
            blocks: prev.blocks.map((b) => (b.section_id === id ? { ...b, section_id: null } : b)),
          }
        : prev,
    )
    await fetch(`/api/sections?id=${id}`, { method: 'DELETE' })
  }, [])

  const reorderSections = useCallback(async (orderedIds: string[]) => {
    setProfile((prev) => {
      if (!prev) return prev
      const sMap = new Map(prev.sections.map((s) => [s.id, s]))
      const reordered = orderedIds
        .map((id, idx) => {
          const s = sMap.get(id)
          return s ? { ...s, display_order: idx } : null
        })
        .filter(Boolean) as Section[]
      return { ...prev, sections: reordered }
    })

    await Promise.all(
      orderedIds.map((id, idx) =>
        fetch(`/api/sections?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: idx }),
        }),
      ),
    )
  }, [])

  return {
    profile,
    loading,
    error,
    refetch,
    updateProfile,
    addLink,
    updateLink,
    deleteLink,
    reorderLinks,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    addAffiliation,
    updateAffiliation,
    deleteAffiliation,
    addBlock,
    updateBlock,
    updateBlockSpan,
    deleteBlock,
    reorderBlocks,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
  }
}
