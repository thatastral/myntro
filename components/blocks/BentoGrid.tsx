'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  StickyNote, Link2, Music, Youtube, Image as ImageIcon,
  X, Plus, Loader2, GripVertical, FolderPlus, Pencil, Check,
  Layers,
} from 'lucide-react'
import type { Block, BlockType, Section } from '@/types'
import { NoteBlock } from './NoteBlock'
import { LinkBlock } from './LinkBlock'
import { SpotifyBlock } from './SpotifyBlock'
import { YoutubeBlock } from './YoutubeBlock'
import { ImageBlock } from './ImageBlock'

// ── Block renderer ─────────────────────────────────────────────────

export function BlockRenderer({ block, username, onUpdate }: { block: Block; username?: string; onUpdate?: (id: string, content: Record<string, string>) => void }) {
  switch (block.type) {
    case 'note':    return <NoteBlock block={block} username={username} onUpdate={onUpdate} />
    case 'link':    return <LinkBlock block={block} />
    case 'spotify': return <SpotifyBlock block={block} />
    case 'youtube': return <YoutubeBlock block={block} />
    case 'image':   return <ImageBlock block={block} />
    default:        return null
  }
}

// ── Read-only bento grid (public profile) ─────────────────────────

function ReadOnlySectionBlock({ section, blocks, username }: { section: Section; blocks: Block[]; username?: string }) {
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {section.title}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {blocks.map((block) => (
          <div key={block.id} className={block.span === 2 ? 'col-span-2' : 'col-span-1'}>
      <BlockRenderer block={block} username={username} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BentoGrid({ blocks, sections, username }: { blocks: Block[]; sections: Section[]; username?: string }) {
  const freeBlocks = blocks.filter((b) => !b.section_id).sort((a, b) => a.display_order - b.display_order)
  const sortedSections = [...sections].sort((a, b) => a.display_order - b.display_order)

  if (blocks.length === 0 && sections.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      {freeBlocks.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {freeBlocks.map((block) => (
            <div key={block.id} className={block.span === 2 ? 'col-span-2' : 'col-span-1'}>
      <BlockRenderer block={block} username={username} />
            </div>
          ))}
        </div>
      )}
      {sortedSections.map((section) => (
        <ReadOnlySectionBlock
          key={section.id}
          section={section}
          username={username}
          blocks={blocks.filter((b) => b.section_id === section.id).sort((a, b) => a.display_order - b.display_order)}
        />
      ))}
    </div>
  )
}

// ── Note colors ────────────────────────────────────────────────────

const NOTE_COLORS = [
  { id: 'default', label: 'White',  cls: 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700' },
  { id: 'yellow',  label: 'Yellow', cls: 'bg-amber-100 border-amber-300' },
  { id: 'teal',    label: 'Teal',   cls: 'bg-teal-100 border-teal-300' },
  { id: 'pink',    label: 'Pink',   cls: 'bg-pink-100 border-pink-300' },
  { id: 'purple',  label: 'Purple', cls: 'bg-purple-100 border-purple-300' },
]

// ── Block type config ──────────────────────────────────────────────

const BLOCK_TYPES: { type: BlockType; label: string; Icon: React.ElementType; defaultSpan: 1 | 2 }[] = [
  { type: 'note',    label: 'Note',    Icon: StickyNote, defaultSpan: 1 },
  { type: 'link',    label: 'Link',    Icon: Link2,      defaultSpan: 1 },
  { type: 'spotify', label: 'Spotify', Icon: Music,      defaultSpan: 2 },
  { type: 'youtube', label: 'YouTube', Icon: Youtube,    defaultSpan: 2 },
  { type: 'image',   label: 'Image',   Icon: ImageIcon,  defaultSpan: 1 },
]

// ── Premade section templates ──────────────────────────────────────

const SECTION_TEMPLATES = [
  { title: 'Projects' },
  { title: 'Featured Work' },
  { title: 'Currently' },
  { title: 'Studio' },
  { title: 'Bookmarks' },
]

// ── Sortable block wrapper ─────────────────────────────────────────

function SortableBlockItem({
  block,
  onDelete,
  onUpdate,
  activeId,
  username,
}: {
  block: Block
  onDelete?: (id: string) => void
  onUpdate?: (id: string, content: Record<string, string>) => void
  activeId: string | null
  username?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    data: { type: 'block' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/block relative ${block.span === 2 ? 'col-span-2' : 'col-span-1'} ${isDragging ? 'scale-[1.02] shadow-xl' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-20 hidden h-6 w-6 cursor-grab items-center justify-center rounded-md bg-black/60 text-white shadow-lg transition-transform active:cursor-grabbing group-hover/block:flex hover:scale-110"
      >
        <GripVertical className="h-3 w-3" />
      </div>

      <BlockRenderer block={block} username={username} onUpdate={onUpdate} />

      {onDelete && activeId !== block.id && (
        <button
          onClick={() => onDelete(block.id)}
          className="absolute right-2 top-2 z-20 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-transform hover:scale-110 hover:bg-red-600 group-hover/block:flex"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ── Droppable empty section placeholder ───────────────────────────

function EmptyDropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `droppable-${id}` })
  return (
    <div
      ref={setNodeRef}
      className={`col-span-2 flex h-16 items-center justify-center rounded-xl border-2 border-dashed text-xs transition-colors ${
        isOver
          ? 'border-gray-400 bg-gray-50 text-gray-400 dark:border-gray-500 dark:bg-gray-800/50 dark:text-gray-500'
          : 'border-gray-200 text-gray-300 dark:border-gray-800 dark:text-gray-700'
      }`}
    >
      Drop blocks here
    </div>
  )
}

// ── Sortable section wrapper ───────────────────────────────────────

function SortableSectionItem({
  section,
  blocks,
  onDelete,
  onDeleteBlock,
  onRename,
  onUpdate,
  activeId,
  activeBlockType,
  username,
}: {
  section: Section
  blocks: Block[]
  onDelete: (id: string) => void
  onDeleteBlock: (id: string) => void
  onRename: (id: string, title: string) => void
  onUpdate?: (id: string, content: Record<string, string>) => void
  activeId: string | null
  activeBlockType: 'block' | 'section' | null
  username?: string
}) {
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(section.title)
  const [collapsed, setCollapsed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { type: 'section' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  const commitRename = () => {
    setEditing(false)
    if (titleDraft.trim() && titleDraft !== section.title) {
      onRename(section.id, titleDraft.trim())
    } else {
      setTitleDraft(section.title)
    }
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const blockIds = blocks.map((b) => b.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow dark:border-gray-700 dark:bg-gray-900 ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 group/section">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 transition-transform duration-200 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Section drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {editing ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              ref={inputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setTitleDraft(section.title); setEditing(false) } }}
              maxLength={60}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600 outline-none focus:border-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            />
            <button onClick={commitRename} className="text-gray-400 hover:text-gray-600">
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {section.title}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="hidden text-gray-300 hover:text-gray-500 dark:text-gray-700 dark:hover:text-gray-500 group-hover/section:block"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}

        <button
          onClick={() => onDelete(section.id)}
          className="hidden text-gray-300 hover:text-red-500 dark:text-gray-700 group-hover/section:block"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Blocks within section */}
      {!collapsed && (
        <SortableContext items={blockIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3">
            {blocks.length === 0 ? (
              <EmptyDropZone id={section.id} />
            ) : (
              blocks.map((block) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  onDelete={onDeleteBlock}
                  onUpdate={onUpdate}
                  activeId={activeId}
                  username={username}
                />
              ))
            )}
          </div>
        </SortableContext>
      )}

      {collapsed && blocks.length > 0 && (
        <p className="text-xs text-gray-400">{blocks.length} block{blocks.length !== 1 ? 's' : ''} hidden</p>
      )}
    </div>
  )
}

// ── BlocksEditor ───────────────────────────────────────────────────

interface BlocksEditorProps {
  blocks: Block[]
  sections: Section[]
  username?: string
  onAdd: (type: BlockType, content: Record<string, string>, span: 1 | 2, sectionId?: string | null) => Promise<Block>
  onUpdate?: (id: string, content: Record<string, string>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddSection: (title: string) => Promise<Section>
  onUpdateSection: (id: string, title: string) => Promise<void>
  onDeleteSection: (id: string) => Promise<void>
  onReorderBlocks: (updates: { id: string; section_id: string | null; display_order: number }[]) => Promise<void>
  onReorderSections: (orderedIds: string[]) => Promise<void>
}

export function BlocksEditor({
  blocks,
  sections,
  username,
  onAdd,
  onUpdate,
  onDelete,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onReorderBlocks,
  onReorderSections,
}: BlocksEditorProps) {
  const [activeBlockType, setActiveBlockType] = useState<BlockType | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSectionMenu, setShowSectionMenu] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageUploading, setImageUploading] = useState(false)

  // Block form state
  const [noteText, setNoteText] = useState('')
  const [noteColor, setNoteColor] = useState('default')
  const [noteFont, setNoteFont] = useState('sans-serif')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkDesc, setLinkDesc] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')

  // dnd state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<'block' | 'section' | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Local containers state for smooth drag
  const buildContainers = useCallback(() => {
    const sorted = [...sections].sort((a, b) => a.display_order - b.display_order)
    const result: Record<string, string[]> = {
      free: blocks
        .filter((b) => !b.section_id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((b) => b.id),
    }
    for (const s of sorted) {
      result[s.id] = blocks
        .filter((b) => b.section_id === s.id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((b) => b.id)
    }
    return result
  }, [blocks, sections])

  const [containers, setContainers] = useState<Record<string, string[]>>(buildContainers)
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    [...sections].sort((a, b) => a.display_order - b.display_order).map((s) => s.id),
  )

  // Sync when props change (but not during drag)
  useEffect(() => {
    if (!isDragging) {
      setContainers(buildContainers())
      setSectionOrder(
        [...sections].sort((a, b) => a.display_order - b.display_order).map((s) => s.id),
      )
    }
  }, [blocks, sections, isDragging, buildContainers])

  const findContainerOf = (itemId: string): string | null => {
    for (const [cId, items] of Object.entries(containers)) {
      if (items.includes(itemId)) return cId
    }
    return null
  }

  // Resolves any over-target id to a container id ('free' | sectionId | null)
  const resolveContainer = (overId: string): string | null => {
    if (overId in containers) return overId                    // dragging directly over a container
    if (overId.startsWith('droppable-')) {                    // EmptyDropZone
      const sId = overId.replace('droppable-', '')
      return sId in containers ? sId : null
    }
    return findContainerOf(overId)                            // dragging over a sibling block
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 15 } }),
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
    setActiveDragType(active.data.current?.type ?? 'block')
    setIsDragging(true)
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || activeDragType === 'section') return

    const activeItemId = String(active.id)
    const overId = String(over.id)

    const activeContainer = findContainerOf(activeItemId)
    const overContainer = resolveContainer(overId)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      // Same container — track intra-container reorder so handleDragEnd can persist it
      setContainers((prev) => {
        const items = [...(prev[activeContainer] ?? [])]
        const oldIdx = items.indexOf(activeItemId)
        const newIdx = items.indexOf(overId)
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev
        return { ...prev, [activeContainer]: arrayMove(items, oldIdx, newIdx) }
      })
      return
    }

    // Cross-container move
    setContainers((prev) => {
      const activeItems = [...(prev[activeContainer] ?? [])]
      const overItems = [...(prev[overContainer] ?? [])]

      const fromIdx = activeItems.indexOf(activeItemId)
      if (fromIdx === -1) return prev

      const overIdx = overItems.indexOf(overId)
      const insertAt = overIdx === -1 ? overItems.length : overIdx

      activeItems.splice(fromIdx, 1)
      overItems.splice(insertAt, 0, activeItemId)

      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems }
    })
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setActiveDragType(null)
    setIsDragging(false)

    if (!over) return

    const activeItemId = String(active.id)
    const overId = String(over.id)

    if (activeDragType === 'section') {
      if (activeItemId === overId) return
      const oldIdx = sectionOrder.indexOf(activeItemId)
      const newIdx = sectionOrder.indexOf(overId)
      if (oldIdx === -1 || newIdx === -1) return
      const newOrder = arrayMove(sectionOrder, oldIdx, newIdx)
      setSectionOrder(newOrder)
      await onReorderSections(newOrder)
      return
    }

    // Block drag end
    const activeContainer = findContainerOf(activeItemId)
    const overContainer = resolveContainer(overId)

    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      // Visual reorder already tracked in onDragOver — just persist current state
      const items = containers[activeContainer]
      if (!items?.length) return
      await onReorderBlocks(
        items.map((id, idx) => ({
          id,
          section_id: activeContainer === 'free' ? null : activeContainer,
          display_order: idx,
        })),
      )
    } else {
      // Cross-container: containers already updated in onDragOver, just persist both
      const fromItems = containers[activeContainer]
      const toItems = containers[overContainer]
      await onReorderBlocks([
        ...toItems.map((id, idx) => ({
          id,
          section_id: overContainer === 'free' ? null : overContainer,
          display_order: idx,
        })),
        ...fromItems.map((id, idx) => ({
          id,
          section_id: activeContainer === 'free' ? null : activeContainer,
          display_order: idx,
        })),
      ])
    }
  }

  const toggleBlockType = (type: BlockType) => {
    setActiveBlockType((prev) => (prev === type ? null : type))
    setShowSectionMenu(false)
  }

  const resetAndClose = () => {
    setActiveBlockType(null)
    setNoteText(''); setNoteColor('default'); setNoteFont('sans-serif')
    setLinkUrl(''); setLinkTitle(''); setLinkDesc('')
    setSpotifyUrl(''); setYoutubeUrl('')
  }

  const handleSave = async () => {
    if (!activeBlockType) return
    setSaving(true)
    const defaultSpan = BLOCK_TYPES.find((b) => b.type === activeBlockType)?.defaultSpan ?? 1
    try {
      if (activeBlockType === 'note') {
        if (!noteText.trim()) return
        await onAdd('note', { text: noteText.trim(), color: noteColor, font_family: noteFont }, defaultSpan)
      } else if (activeBlockType === 'link') {
        if (!linkUrl.trim()) return
        await onAdd('link', { url: linkUrl.trim(), title: linkTitle.trim(), description: linkDesc.trim() }, defaultSpan)
      } else if (activeBlockType === 'spotify') {
        if (!spotifyUrl.trim()) return
        await onAdd('spotify', { url: spotifyUrl.trim() }, defaultSpan)
      } else if (activeBlockType === 'youtube') {
        if (!youtubeUrl.trim()) return
        await onAdd('youtube', { url: youtubeUrl.trim() }, defaultSpan)
      }
      resetAndClose()
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.avatar_url) {
        await onAdd('image', { url: data.avatar_url, caption: '' }, 1)
      }
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const handleAddSection = async (title: string) => {
    setShowSectionMenu(false)
    setAddingSection(false)
    setSectionTitle('')
    await onAddSection(title)
  }

  // Active block for DragOverlay
  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null
  const activeSection = activeId ? sections.find((s) => s.id === activeId) : null

  const sortedSections = sectionOrder
    .map((id) => sections.find((s) => s.id === id))
    .filter(Boolean) as Section[]

  const freeBlockIds = containers.free ?? []
  const freeBlocks = freeBlockIds
    .map((id) => blocks.find((b) => b.id === id))
    .filter(Boolean) as Block[]

  return (
    <div className="flex flex-col gap-6 pb-32">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Free blocks */}
        {freeBlocks.length > 0 && (
          <SortableContext items={freeBlockIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {freeBlocks.map((block) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  activeId={activeId}
                  username={username}
                />
              ))}
            </div>
          </SortableContext>
        )}

        {/* Sections */}
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-6">
            {sortedSections.map((section) => {
              const sectionBlockIds = containers[section.id] ?? []
              const sectionBlocks = sectionBlockIds
                .map((id) => blocks.find((b) => b.id === id))
                .filter(Boolean) as Block[]
              return (
                <SortableSectionItem
                  key={section.id}
                  section={section}
                  blocks={sectionBlocks}
                  onDelete={onDeleteSection}
                  onDeleteBlock={onDelete}
                  onRename={onUpdateSection}
                  onUpdate={onUpdate}
                  activeId={activeId}
                  activeBlockType={activeDragType}
                  username={username}
                />
              )
            })}
          </div>
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeBlock && (
            <div className={`opacity-90 ${activeBlock.span === 2 ? 'col-span-2' : ''}`}>
              <BlockRenderer block={activeBlock} username={username} />
            </div>
          )}
          {activeSection && (
            <div className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
              {activeSection.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Add-block form panel */}
      {activeBlockType && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {activeBlockType === 'note' && (
            <div className="space-y-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value.slice(0, 400))}
                placeholder="Write your note…"
                rows={4}
                autoFocus
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Font:</span>
                  <select
                    value={noteFont}
                    onChange={(e) => setNoteFont(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    style={{ fontFamily: noteFont }}
                  >
                    <option value="sans-serif">Sans-serif</option>
                    <option value="serif">Serif</option>
                    <option value="cursive">Cursive</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Color:</span>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setNoteColor(c.id)}
                      title={c.label}
                      className={`h-5 w-5 rounded-full border-2 transition-transform ${c.cls} ${noteColor === c.id ? 'scale-125 border-gray-900 dark:border-gray-100' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeBlockType === 'link' && (
            <div className="space-y-2">
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" autoFocus
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50" />
              <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Title (optional)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50" />
              <input type="text" value={linkDesc} onChange={(e) => setLinkDesc(e.target.value)} placeholder="Description (optional)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50" />
            </div>
          )}

          {activeBlockType === 'spotify' && (
            <input type="url" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/… or playlist/…" autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50" />
          )}

          {activeBlockType === 'youtube' && (
            <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=… or youtu.be/…" autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50" />
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button onClick={resetAndClose} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </button>
          </div>
        </div>
      )}

      {/* Section menu */}
      {showSectionMenu && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Add section</p>
          <div className="flex flex-col gap-1">
            {SECTION_TEMPLATES.map((t) => (
              <button
                key={t.title}
                onClick={() => handleAddSection(t.title)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Layers className="h-3.5 w-3.5 text-gray-400" />
                {t.title}
              </button>
            ))}
            <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
            {addingSection ? (
              <div className="flex items-center gap-2 px-1">
                <input
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sectionTitle.trim()) handleAddSection(sectionTitle.trim())
                    if (e.key === 'Escape') { setAddingSection(false); setSectionTitle('') }
                  }}
                  placeholder="Section name…"
                  autoFocus
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
                />
                <button
                  onClick={() => { if (sectionTitle.trim()) handleAddSection(sectionTitle.trim()) }}
                  disabled={!sectionTitle.trim()}
                  className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSection(true)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Custom name…
              </button>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => { setShowSectionMenu(false); setAddingSection(false); setSectionTitle('') }}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Floating bottom nav pill */}
      <div className="fixed bottom-[60px] left-0 right-0 z-50 flex justify-center px-4 pb-1">
        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {BLOCK_TYPES.map(({ type, label, Icon }) => (
            <button
              key={type}
              title={`Add ${label}`}
              onClick={() => {
                if (type === 'image') { imageInputRef.current?.click(); return }
                setShowSectionMenu(false)
                toggleBlockType(type)
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                activeBlockType === type
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}

          {/* Divider */}
          <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Section button */}
          <button
            title="Add section"
            onClick={() => {
              setActiveBlockType(null)
              setShowSectionMenu((v) => !v)
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              showSectionMenu
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hidden image input */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      {imageUploading && (
        <div className="fixed bottom-[120px] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
        </div>
      )}
    </div>
  )
}
