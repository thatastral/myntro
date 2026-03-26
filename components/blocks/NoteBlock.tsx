'use client'

import { useState } from 'react'
import type { Block } from '@/types'

const COLOR_MAP: Record<string, string> = {
  yellow:  'bg-amber-50   border-amber-200   dark:bg-amber-950/30  dark:border-amber-800',
  teal:    'bg-teal-50    border-teal-200    dark:bg-teal-950/30   dark:border-teal-800',
  pink:    'bg-pink-50    border-pink-200    dark:bg-pink-950/30   dark:border-pink-800',
  purple:  'bg-purple-50  border-purple-200  dark:bg-purple-950/30 dark:border-purple-800',
  orange:  'bg-orange-50  border-orange-200  dark:bg-orange-950/30 dark:border-orange-800',
  sky:     'bg-sky-50     border-sky-200     dark:bg-sky-950/30    dark:border-sky-800',
  green:   'bg-green-50   border-green-200   dark:bg-green-950/30  dark:border-green-800',
  default: 'bg-gray-50    border-gray-200    dark:bg-gray-800/60   dark:border-gray-700',
}

const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'Sans-serif', family: 'var(--font-clash-grotesk), system-ui, sans-serif' },
  { value: 'serif', label: 'Serif', family: 'Georgia, serif' },
  { value: 'cursive', label: 'Cursive', family: 'var(--font-architects-daughter), cursive' },
  { value: 'monospace', label: 'Mono', family: 'var(--font-geist-mono), monospace' },
]

interface NoteBlockProps {
  block: Block
  username?: string
  onUpdate?: (blockId: string, content: { text: string; color: string; font_family: string }) => void
}

export function NoteBlock({ block, username, onUpdate }: NoteBlockProps) {
  const { text, color = 'default', font_family = 'sans-serif' } = block.content
  const cls = COLOR_MAP[color] ?? COLOR_MAP.default
  const fontOption = FONT_OPTIONS.find(f => f.value === font_family) ?? FONT_OPTIONS[0]
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const [editColor, setEditColor] = useState(color)
  const [editFont, setEditFont] = useState(font_family)

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

  if (isEditing) {
    const editColorClass = COLOR_MAP[editColor] ?? COLOR_MAP.default
    const editFontOption = FONT_OPTIONS.find(f => f.value === editFont) ?? FONT_OPTIONS[0]

    return (
      <div className="flex flex-col gap-3">
        {/* Live preview */}
        <div 
          className={`flex min-h-[100px] flex-col rounded-2xl border p-4 shadow-sm ${editColorClass}`}
          style={{ 
            fontFamily: editFontOption.family,
            transform: 'rotate(-1deg)',
          }}
        >
          <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-[#0F1702]">
            {editText || 'Preview text...'}
          </p>
          {username && (
            <p className="mt-2 text-xs text-[#909090]">
              - {username}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#EBEBEB] bg-white p-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Write your note..."
            className="w-full resize-none rounded-lg border border-[#EBEBEB] bg-[#FAFAFA] p-2 text-sm text-[#0F1702] outline-none focus:border-[#8EE600] focus:ring-2 focus:ring-[#8EE600]/20"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <select
              value={editFont}
              onChange={(e) => setEditFont(e.target.value)}
              className="rounded-lg border border-[#EBEBEB] bg-white px-2 py-1 text-xs text-[#0F1702]"
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              {Object.entries(COLOR_MAP).map(([key, colorCls]) => (
                <button
                  key={key}
                  onClick={() => setEditColor(key)}
                  className={`h-5 w-5 rounded-full border-2 transition-transform ${colorCls} ${editColor === key ? 'scale-125 border-[#0F1702]' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg px-3 py-1 text-xs text-[#909090] hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-[#0F1702] px-3 py-1 text-xs font-medium text-white hover:bg-[#1A2E03]"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`flex h-full min-h-[120px] cursor-pointer flex-col rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${cls}`}
      style={{ 
        fontFamily: fontOption.family,
        transform: 'rotate(-1deg)',
      }}
      onClick={() => onUpdate && setIsEditing(true)}
    >
      <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-[#0F1702]">
        {text}
      </p>
      {username && (
        <p className="mt-2 text-xs text-[#909090]">
          - {username}
        </p>
      )}
    </div>
  )
}

export { FONT_OPTIONS }
