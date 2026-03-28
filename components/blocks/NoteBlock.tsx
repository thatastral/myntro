'use client'

import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import type { Block } from '@/types'

// Sticky note palette — soft pastels
const COLORS: Record<string, string> = {
  yellow:  '#FFF5A0',
  sky:     '#B8E4F2',
  purple:  '#C5C0F0',
  lime:    '#C8ED6A',
  orange:  '#FFB84D',
  pink:    '#F9A8C9',
  teal:    '#9DE8E0',
  white:   '#F8F8F4',
}

// Tape: same hue, more saturated
const TAPE_COLORS: Record<string, string> = {
  yellow:  '#E8D040',
  sky:     '#68C0D8',
  purple:  '#9080D8',
  lime:    '#90C820',
  orange:  '#E89030',
  pink:    '#E880B8',
  teal:    '#40B8B0',
  white:   '#D0D0D8',
}

const FOLD = 36

const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'Sans',    family: 'system-ui, sans-serif' },
  { value: 'serif',      label: 'Serif',   family: 'Georgia, serif' },
  { value: 'cursive',    label: 'Cursive', family: 'cursive' },
  { value: 'monospace',  label: 'Mono',    family: 'monospace' },
]

// Subtle rotation — mostly near-straight, derived from block ID
function getNoteRotation(id: string): number {
  const n = parseInt(id.replace(/-/g, '').slice(-4), 16)
  const angles = [-1.5, -1, -0.5, 0, 0, 0, 0.5, 1, 1.5]
  return angles[n % angles.length]
}

// clipPath that cuts the bottom-right corner
const makeClipPath = (fold: number) =>
  `polygon(0 0, 100% 0, 100% calc(100% - ${fold}px), calc(100% - ${fold}px) 100%, 0 100%)`

const CLIP = makeClipPath(FOLD)

interface NoteBlockProps {
  block: Block
  username?: string
  onUpdate?: (blockId: string, content: { text: string; color: string; font_family: string }) => void
}

export function NoteBlock({ block, username, onUpdate }: NoteBlockProps) {
  const { text, color = 'yellow', font_family = 'sans-serif' } = block.content

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const [editColor, setEditColor] = useState(color)
  const [editFont, setEditFont] = useState(font_family)

  const bgColor    = COLORS[color]      ?? COLORS.yellow
  const tapeColor  = TAPE_COLORS[color] ?? TAPE_COLORS.yellow
  const fontFamily = FONT_OPTIONS.find(f => f.value === font_family)?.family ?? 'system-ui, sans-serif'
  const rotation   = getNoteRotation(block.id)

  const handleSave = () => {
    if (onUpdate && (editText !== text || editColor !== color || editFont !== font_family)) {
      onUpdate(block.id, { text: editText, color: editColor, font_family: editFont })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditText(text)
    setEditColor(color)
    setEditFont(font_family)
    setIsEditing(false)
  }

  return (
    <>
      {/* ── Note card ── */}
      <div
        className="relative min-h-[180px] cursor-pointer select-none overflow-visible"
        style={{ transform: `rotate(${rotation}deg)` }}
        onClick={() => onUpdate && setIsEditing(true)}
      >
        {/* Tape — overlaps top edge */}
        <div
          className="absolute z-10"
          style={{
            top: -8, left: 14,
            width: 52, height: 22,
            backgroundColor: tapeColor,
            transform: 'rotate(-12deg)',
            borderRadius: 2,
          }}
        />

        {/*
          Paper background — absolute inset-0 so it has real pixel dimensions,
          allowing clipPath percentages to resolve correctly.
          The clipped corner becomes transparent, revealing whatever is behind.
        */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: bgColor,
            clipPath: CLIP,
            boxShadow: '3px 4px 14px rgba(0,0,0,0.16), 1px 1px 3px rgba(0,0,0,0.08)',
          }}
        />

        {/* Content — natural height drives the parent's height */}
        <div
          className="relative z-[1] flex flex-col p-5 pb-10 pt-8"
          style={{ fontFamily }}
        >
          {text ? (
            <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-black/65">
              {text}
            </p>
          ) : (
            <p className="flex-1 text-sm text-black/25">Write a note…</p>
          )}
          {username && (
            <p className="mt-2 text-xs text-black/35">— {username}</p>
          )}
        </div>

      </div>

      {/* ── Edit modal — fixed overlay, never disrupts grid ── */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
        >
          <div className="w-80 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">

            {/* Live preview */}
            <div className="relative overflow-visible" style={{ minHeight: 148 }}>
              {/* Paper bg */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: COLORS[editColor] ?? COLORS.yellow,
                  clipPath: CLIP,
                }}
              />
              {/* Tape preview */}
              <div
                className="absolute z-10"
                style={{
                  top: 4, left: 14,
                  width: 52, height: 22,
                  backgroundColor: TAPE_COLORS[editColor] ?? TAPE_COLORS.yellow,
                  transform: 'rotate(-12deg)',
                  borderRadius: 2,
                }}
              />
              {/* Content */}
              <div
                className="relative z-[1] flex flex-col p-5 pb-10 pt-10"
                style={{ fontFamily: FONT_OPTIONS.find(f => f.value === editFont)?.family ?? 'system-ui, sans-serif' }}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/65 min-h-[40px]">
                  {editText || <span className="text-black/25">Preview…</span>}
                </p>
              </div>
              {/* Close */}
              <button
                onClick={handleCancel}
                className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-black/60 hover:bg-black/25"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 p-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Write your note…"
                autoFocus
                rows={3}
                className="w-full resize-none rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-3 text-sm text-[#0F1702] outline-none placeholder:text-[#C0C0C0] focus:border-[#D5D5D5]"
              />

              {/* Color swatches */}
              <div className="flex items-center gap-2">
                {Object.entries(COLORS).map(([key, hex]) => (
                  <button
                    key={key}
                    onClick={() => setEditColor(key)}
                    title={key}
                    className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: hex,
                      outline: editColor === key ? '2.5px solid #0F1702' : '2.5px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>

              {/* Font + actions */}
              <div className="flex items-center justify-between gap-2">
                <select
                  value={editFont}
                  onChange={(e) => setEditFont(e.target.value)}
                  className="rounded-lg border border-[#EBEBEB] bg-white px-2 py-1 text-xs text-[#0F1702] outline-none"
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={handleCancel}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#909090] hover:bg-[#F5F5F5]">
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="rounded-lg bg-[#0F1702] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1A2E03]">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { FONT_OPTIONS }
