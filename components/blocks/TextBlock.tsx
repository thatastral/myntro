'use client'

import { useState } from 'react'
import { X, TextAlignLeft, TextAlignCenter, TextAlignRight } from '@phosphor-icons/react'
import type { Block } from '@/types'

const FONT_MAP: Record<string, string> = {
  'dm-sans':        'var(--font-dm-sans), sans-serif',
  'funnel-display': 'var(--font-funnel-display), sans-serif',
  'mono':           'var(--font-mono), monospace',
}

const SIZE_MAP: Record<string, string> = {
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
}

type Align = 'left' | 'center' | 'right'

interface Draft {
  text: string
  bold: string
  italic: string
  size: string
  align: string
  font_family: string
}

function buildStyle(d: Draft): React.CSSProperties {
  return {
    fontWeight:  d.bold   === 'true' ? 700 : 400,
    fontStyle:   d.italic === 'true' ? 'italic' : 'normal',
    fontSize:    SIZE_MAP[d.size] ?? SIZE_MAP.md,
    textAlign:   d.align as Align,
    fontFamily:  FONT_MAP[d.font_family] ?? FONT_MAP['dm-sans'],
    lineHeight:  1.55,
  }
}

interface TextBlockProps {
  block: Block
  onUpdate?: (id: string, content: Record<string, string>) => void
}

export function TextBlock({ block, onUpdate }: TextBlockProps) {
  const {
    text = '',
    bold = 'false',
    italic = 'false',
    size = 'md',
    align = 'left',
    font_family = 'dm-sans',
  } = block.content

  const initial: Draft = { text, bold, italic, size, align, font_family }
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(initial)

  const set = <K extends keyof Draft>(key: K, val: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: val }))

  const toggle = (key: 'bold' | 'italic') =>
    setDraft((d) => ({ ...d, [key]: d[key] === 'true' ? 'false' : 'true' }))

  const handleSave = () => {
    onUpdate?.(block.id, { ...draft })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDraft(initial)
    setIsEditing(false)
  }

  const activeBtn = 'border-[#0F1702] bg-[#0F1702] text-white'
  const inactiveBtn = 'border-[#EBEBEB] text-[#909090] hover:border-[#D5D5D5] hover:text-[#0F1702]'

  return (
    <>
      {/* Block display */}
      <div
        className={`relative min-h-[80px] rounded-2xl border border-[#EBEBEB] bg-white p-4 ${onUpdate ? 'cursor-pointer transition-colors hover:border-[#D5D5D5]' : ''}`}
        onClick={() => onUpdate && setIsEditing(true)}
      >
        {text ? (
          <p style={buildStyle(initial)} className="whitespace-pre-wrap text-[#0F1702]">
            {text}
          </p>
        ) : (
          <p className="text-sm text-[#C0C0C0]">Add text…</p>
        )}
      </div>

      {/* Edit modal */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel() }}
        >
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">

            {/* Live preview */}
            <div className="relative min-h-[80px] bg-[#FAFAFA] p-4">
              {draft.text ? (
                <p style={buildStyle(draft)} className="whitespace-pre-wrap text-[#0F1702] min-h-[32px]">
                  {draft.text}
                </p>
              ) : (
                <p className="text-sm text-[#C0C0C0]">Preview…</p>
              )}
              <button
                onClick={handleCancel}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-black/50 hover:bg-black/20"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 p-4">
              {/* Textarea */}
              <textarea
                value={draft.text}
                onChange={(e) => set('text', e.target.value)}
                placeholder="Write something…"
                autoFocus
                rows={3}
                className="w-full resize-none rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-3 text-sm text-[#0F1702] outline-none placeholder:text-[#C0C0C0] transition-colors focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20"
              />

              {/* Formatting toolbar */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Bold */}
                <button
                  onClick={() => toggle('bold')}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${draft.bold === 'true' ? activeBtn : inactiveBtn}`}
                >
                  B
                </button>

                {/* Italic */}
                <button
                  onClick={() => toggle('italic')}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border text-sm italic transition-colors ${draft.italic === 'true' ? activeBtn : inactiveBtn}`}
                >
                  I
                </button>

                <div className="h-4 w-px bg-[#EBEBEB]" />

                {/* Size */}
                {(['sm', 'md', 'lg'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => set('size', s)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${draft.size === s ? activeBtn : inactiveBtn}`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}

                <div className="h-4 w-px bg-[#EBEBEB]" />

                {/* Alignment */}
                <button
                  onClick={() => set('align', 'left')}
                  title="Align left"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${draft.align === 'left' ? activeBtn : inactiveBtn}`}
                >
                  <TextAlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => set('align', 'center')}
                  title="Align center"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${draft.align === 'center' ? activeBtn : inactiveBtn}`}
                >
                  <TextAlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => set('align', 'right')}
                  title="Align right"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${draft.align === 'right' ? activeBtn : inactiveBtn}`}
                >
                  <TextAlignRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Font family */}
              <select
                value={draft.font_family}
                onChange={(e) => set('font_family', e.target.value)}
                className="rounded-xl border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs text-[#0F1702] outline-none transition-colors focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20"
              >
                <option value="dm-sans">DM Sans (default)</option>
                <option value="funnel-display">Funnel Display</option>
                <option value="mono">Monospace</option>
              </select>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-xl bg-[#0F1702] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A2E03]"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
