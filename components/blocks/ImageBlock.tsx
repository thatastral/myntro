'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ArrowsHorizontal } from '@phosphor-icons/react'
import type { Block } from '@/types'

const MIN_H = 100
const MAX_H = 480
const DEFAULT_H = 200

function clampH(n: number) {
  return Math.min(MAX_H, Math.max(MIN_H, n))
}

interface ImageBlockProps {
  block: Block
  onUpdate?: (id: string, content: Record<string, string>) => void
  onUpdateSpan?: (id: string, span: 1 | 2) => void
}

export function ImageBlock({ block, onUpdate, onUpdateSpan }: ImageBlockProps) {
  const { url = '', caption = '', height: storedH } = block.content
  const savedHeight = clampH(parseInt(storedH ?? String(DEFAULT_H), 10))
  const editable = !!onUpdate

  const [isEditing, setIsEditing]       = useState(false)
  const [draftCaption, setDraftCaption] = useState(caption)
  const [draftHeight, setDraftHeight]   = useState(savedHeight)

  // Sync draft when block content changes externally
  useEffect(() => {
    if (!isEditing) {
      setDraftCaption(caption)
      setDraftHeight(savedHeight)
    }
  }, [caption, savedHeight, isEditing])

  // ── Drag-to-resize (mouse) ──────────────────────────────────────
  const dragStartY = useRef(0)
  const dragStartH = useRef(savedHeight)

  const startDrag = useCallback((clientY: number) => {
    dragStartY.current = clientY
    dragStartH.current = draftHeight

    const onMove = (e: MouseEvent) => {
      setDraftHeight(clampH(dragStartH.current + (e.clientY - dragStartY.current)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [draftHeight])

  const startTouchDrag = useCallback((clientY: number) => {
    dragStartY.current = clientY
    dragStartH.current = draftHeight

    const onMove = (e: TouchEvent) => {
      setDraftHeight(clampH(dragStartH.current + (e.touches[0].clientY - dragStartY.current)))
    }
    const onEnd = () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }, [draftHeight])

  // ── Escape to cancel ───────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isEditing]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    onUpdate?.(block.id, { caption: draftCaption, height: String(draftHeight) })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraftCaption(caption)
    setDraftHeight(savedHeight)
    setIsEditing(false)
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ height: `${isEditing ? draftHeight : savedHeight}px` }}
    >
      {/* Image — object-cover ensures proportional fill, never squashes */}
      <Image
        src={url}
        alt={caption || 'Image'}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 300px"
        unoptimized={url.startsWith('blob:')}
      />

      {/* Caption overlay — display mode */}
      {caption && !isEditing && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F1702]/80 to-transparent px-3 pb-3 pt-10">
          <p className="text-xs font-medium leading-relaxed text-white/90">{caption}</p>
        </div>
      )}

      {/* Click-to-edit trigger */}
      {editable && !isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute inset-0 opacity-0 transition-opacity group-hover/block:opacity-100"
          aria-label="Edit image"
        />
      )}

      {/* ── Edit mode ─────────────────────────────────────────── */}
      {isEditing && (
        <>
          <div className="absolute inset-0 bg-black/25" />

          {/* Top bar: width toggle + save/cancel */}
          <div className="absolute left-2 right-2 top-2 z-10 flex items-center gap-2">
            {onUpdateSpan && (
              <button
                onClick={() => onUpdateSpan(block.id, block.span === 1 ? 2 : 1)}
                className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-black/80"
              >
                <ArrowsHorizontal className="h-3 w-3" />
                {block.span === 1 ? '2 col' : '1 col'}
              </button>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={handleCancel}
                className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm hover:bg-black/70"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-full bg-[#8EE600] px-3 py-1 text-[11px] font-semibold text-[#0F1702] hover:bg-[#7FD000]"
              >
                Save
              </button>
            </div>
          </div>

          {/* Caption input */}
          <div className="absolute inset-x-0 bottom-8 px-3">
            <div className="rounded-xl bg-black/40 px-3 py-2 backdrop-blur-sm">
              <input
                value={draftCaption}
                onChange={(e) => setDraftCaption(e.target.value)}
                placeholder="Add a caption…"
                autoFocus
                className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Bottom drag handle for height resize */}
          <div
            onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientY) }}
            onTouchStart={(e) => startTouchDrag(e.touches[0].clientY)}
            className="absolute inset-x-0 bottom-0 flex h-8 cursor-row-resize items-center justify-center bg-black/40 backdrop-blur-sm"
            title="Drag to resize height"
          >
            <div className="h-1 w-10 rounded-full bg-white/70" />
          </div>
        </>
      )}
    </div>
  )
}
