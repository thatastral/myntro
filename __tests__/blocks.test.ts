/**
 * Blocks & sections logic unit tests
 */

import type { Block, Section } from '../types'

// ── Container resolution (mirrors resolveContainer in BentoGrid.tsx) ─

function resolveContainer(
  overId: string,
  containers: Record<string, string[]>,
): string | null {
  if (overId in containers) return overId
  if (overId.startsWith('droppable-')) {
    const sId = overId.replace('droppable-', '')
    return sId in containers ? sId : null
  }
  for (const [cId, items] of Object.entries(containers)) {
    if (items.includes(overId)) return cId
  }
  return null
}

describe('resolveContainer', () => {
  const containers: Record<string, string[]> = {
    free: ['block-1', 'block-2'],
    'section-abc': ['block-3', 'block-4'],
    'section-xyz': [],
  }

  it('resolves a container key directly', () => {
    expect(resolveContainer('free', containers)).toBe('free')
    expect(resolveContainer('section-abc', containers)).toBe('section-abc')
  })

  it('resolves a droppable- zone to its section', () => {
    expect(resolveContainer('droppable-section-abc', containers)).toBe('section-abc')
    expect(resolveContainer('droppable-section-xyz', containers)).toBe('section-xyz')
  })

  it('returns null for unknown droppable- zone', () => {
    expect(resolveContainer('droppable-nonexistent', containers)).toBeNull()
  })

  it('resolves a block id to its container', () => {
    expect(resolveContainer('block-1', containers)).toBe('free')
    expect(resolveContainer('block-3', containers)).toBe('section-abc')
  })

  it('returns null for unknown block id', () => {
    expect(resolveContainer('block-99', containers)).toBeNull()
  })
})

// ── Block filtering helpers ───────────────────────────────────────

function getFreeBlocks(blocks: Block[]) {
  return blocks
    .filter((b) => !b.section_id)
    .sort((a, b) => a.display_order - b.display_order)
}

function getSectionBlocks(blocks: Block[], sectionId: string) {
  return blocks
    .filter((b) => b.section_id === sectionId)
    .sort((a, b) => a.display_order - b.display_order)
}

const mockBlocks: Block[] = [
  { id: 'b1', user_id: 'u1', section_id: null, type: 'note', content: { text: 'hi' }, display_order: 1, span: 1, created_at: '' },
  { id: 'b2', user_id: 'u1', section_id: null, type: 'link', content: { url: 'https://example.com' }, display_order: 0, span: 2, created_at: '' },
  { id: 'b3', user_id: 'u1', section_id: 'sec-1', type: 'note', content: { text: 'in section' }, display_order: 0, span: 1, created_at: '' },
  { id: 'b4', user_id: 'u1', section_id: 'sec-1', type: 'image', content: { url: 'https://img.com/a.png' }, display_order: 1, span: 1, created_at: '' },
]

describe('Block filtering', () => {
  it('returns only free blocks sorted by display_order', () => {
    const free = getFreeBlocks(mockBlocks)
    expect(free.map((b) => b.id)).toEqual(['b2', 'b1'])
  })

  it('returns only section blocks sorted by display_order', () => {
    const section = getSectionBlocks(mockBlocks, 'sec-1')
    expect(section.map((b) => b.id)).toEqual(['b3', 'b4'])
  })

  it('returns empty array for section with no blocks', () => {
    expect(getSectionBlocks(mockBlocks, 'sec-999')).toEqual([])
  })
})

// ── Section sorting ───────────────────────────────────────────────

const mockSections: Section[] = [
  { id: 'sec-2', user_id: 'u1', title: 'Projects', display_order: 1, created_at: '' },
  { id: 'sec-1', user_id: 'u1', title: 'Featured', display_order: 0, created_at: '' },
  { id: 'sec-3', user_id: 'u1', title: 'Bookmarks', display_order: 2, created_at: '' },
]

describe('Section sorting', () => {
  it('sorts sections by display_order', () => {
    const sorted = [...mockSections].sort((a, b) => a.display_order - b.display_order)
    expect(sorted.map((s) => s.id)).toEqual(['sec-1', 'sec-2', 'sec-3'])
  })
})

// ── OG image URL extraction helper (mirrors fetchOgImage regex) ───

function extractOgImage(html: string): string | null {
  const og =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
  if (og) return og
  const tw =
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1]
  return tw ?? null
}

describe('OG image extraction', () => {
  it('extracts og:image (property then content order)', () => {
    const html = `<meta property="og:image" content="https://example.com/img.png">`
    expect(extractOgImage(html)).toBe('https://example.com/img.png')
  })

  it('extracts og:image (content then property order)', () => {
    const html = `<meta content="https://example.com/img2.png" property="og:image">`
    expect(extractOgImage(html)).toBe('https://example.com/img2.png')
  })

  it('falls back to twitter:image', () => {
    const html = `<meta name="twitter:image" content="https://example.com/tw.png">`
    expect(extractOgImage(html)).toBe('https://example.com/tw.png')
  })

  it('returns null when no OG or twitter image', () => {
    const html = `<html><head><title>No image</title></head></html>`
    expect(extractOgImage(html)).toBeNull()
  })

  it('prefers og:image over twitter:image', () => {
    const html = `
      <meta property="og:image" content="https://og.com/img.png">
      <meta name="twitter:image" content="https://tw.com/img.png">
    `
    expect(extractOgImage(html)).toBe('https://og.com/img.png')
  })
})
