'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, PencilSimple, Trash, CircleNotch, Trophy, Check, CaretLeft, CaretRight, CalendarBlank, ArrowSquareOut } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/types'

interface AchievementEditorProps {
  achievements: Achievement[]
  onAdd: (achievement: Omit<Achievement, 'id' | 'user_id' | 'created_at'>) => Promise<Achievement>
  onUpdate: (id: string, updates: Partial<Achievement>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface AchievementFormData {
  title: string
  description: string
  date: string
  link: string
}

const EMPTY_FORM: AchievementFormData = { title: '', description: '', date: '', link: '' }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
}

function LinkPreview({ url }: { url: string }) {
  const domain = getDomain(url)
  if (!domain) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex items-center gap-1.5 self-start rounded-lg border border-[#F0F0F0] bg-[#FAFAFA] px-2.5 py-1.5 transition-colors hover:border-[#E0E0E0] hover:bg-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        width={14}
        height={14}
        className="h-3.5 w-3.5 rounded-sm object-cover"
      />
      <span className="text-[11px] font-medium text-[#909090]">{domain}</span>
      <ArrowSquareOut className="h-3 w-3 text-[#C0C0C0]" />
    </a>
  )
}

// ── Custom date picker (fixed-position modal so it's never clipped) ──────────
function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  const parsed = value ? new Date(value + 'T00:00:00') : null
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth())
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const openCalendar = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const calH = 316
      const spaceBelow = window.innerHeight - r.bottom
      const spaceAbove = r.top
      const top =
        spaceAbove >= calH + 8 || (spaceAbove > spaceBelow && spaceAbove >= calH + 8)
          ? r.top - calH - 6
          : r.bottom + 6
      setPos({ top, left: r.left })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { day: number; month: 'prev' | 'curr' | 'next'; date: Date }[] = []
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    cells.push({ day: d, month: 'prev', date: new Date(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1, d) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: 'curr', date: new Date(viewYear, viewMonth, d) })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: 'next', date: new Date(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1, d) })
  }

  const todayISO = toISO(today)
  const isSelected = (date: Date) => value === toISO(date)
  const isToday = (date: Date) => toISO(date) === todayISO

  const selectDate = (date: Date) => { onChange(toISO(date)); setOpen(false) }

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openCalendar}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors',
          open ? 'border-[#8EE600]/60 ring-1 ring-[#8EE600]/20' : 'border-[#EBEBEB] hover:border-[#D0D0D0]',
        )}
      >
        <span className={displayValue ? 'text-[#0F1702]' : 'text-[#C0C0C0]'}>
          {displayValue ?? 'Pick a date'}
        </span>
        <CalendarBlank className="h-3.5 w-3.5 text-[#C0C0C0]" />
      </button>

      {open && (
        <div
          ref={popRef}
          className="fixed z-[200] w-[256px] overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_8px_40px_rgba(15,23,2,0.14)]"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#F5F5F5] px-4 py-3">
            <span
              className="text-sm font-bold text-[#0F1702]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={prevMonth} className="flex h-6 w-6 items-center justify-center rounded-lg text-[#909090] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F1702]">
                <CaretLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={nextMonth} className="flex h-6 w-6 items-center justify-center rounded-lg text-[#909090] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F1702]">
                <CaretRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 px-3 pt-2.5 pb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="flex items-center justify-center text-[10px] font-semibold tracking-wide text-[#C0C0C0]">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">
            {cells.map((cell, i) => {
              const sel = isSelected(cell.date)
              const tod = isToday(cell.date)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDate(cell.date)}
                  className={cn(
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all',
                    sel && 'bg-[#0F1702] text-white shadow-sm',
                    !sel && tod && 'border border-[#8EE600] font-semibold text-[#0F1702]',
                    !sel && !tod && cell.month === 'curr' && 'text-[#0F1702] hover:bg-[#F5F5F5]',
                    !sel && !tod && cell.month !== 'curr' && 'text-[#D8D8D8] hover:bg-[#F5F5F5]',
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#F5F5F5] px-4 py-2.5">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-xs font-medium text-[#C0C0C0] transition-colors hover:text-[#909090]">
              Clear
            </button>
            <button type="button" onClick={() => selectDate(today)} className="text-xs font-semibold text-[#4A7A00] transition-colors hover:text-[#0F1702]">
              Today
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Achievement form ──────────────────────────────────────────────────────────
function AchievementForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
  submitLabel,
}: {
  initial?: AchievementFormData
  onSubmit: (data: AchievementFormData) => void
  onCancel: () => void
  loading: boolean
  error: string | null
  submitLabel: string
}) {
  const [form, setForm] = useState<AchievementFormData>(initial ?? EMPTY_FORM)
  const update = (field: keyof AchievementFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const linkDomain = getDomain(form.link)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
      className="flex flex-col gap-3 rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Won ETH Global Hackathon"
          required
          maxLength={120}
          className="rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-colors focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Brief description of this achievement…"
          rows={2}
          maxLength={500}
          className="resize-none rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-colors focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">Date</label>
          <DatePicker value={form.date} onChange={(v) => update('date', v)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">
            Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={form.link}
            onChange={(e) => update('link', e.target.value)}
            placeholder="https://…"
            required
            className="rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-colors focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20"
          />
        </div>
      </div>

      {/* Link preview */}
      {linkDomain && (
        <div className="flex items-center gap-2 rounded-xl border border-[#EBEBEB] bg-white px-3 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${linkDomain}&sz=32`}
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 flex-shrink-0 rounded-sm object-cover"
          />
          <span className="flex-1 truncate text-xs text-[#909090]">{form.link}</span>
          <a
            href={form.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <ArrowSquareOut className="h-3.5 w-3.5 text-[#C0C0C0] hover:text-[#0F1702] transition-colors" />
          </a>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#F0F0F0] hover:text-[#0F1702]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !form.title.trim() || !form.link.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#0F1702] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1A2E03] disabled:opacity-40"
        >
          {loading ? <CircleNotch className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export function AchievementEditor({
  achievements,
  onAdd,
  onUpdate,
  onDelete,
}: AchievementEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = useCallback(async (data: AchievementFormData) => {
    setAddLoading(true)
    setAddError(null)
    try {
      await onAdd({
        title: data.title.trim(),
        description: data.description.trim() || null,
        date: data.date || null,
        link: data.link.trim() || null,
        image_url: null,
      })
      setShowAddForm(false)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add achievement.')
    } finally {
      setAddLoading(false)
    }
  }, [onAdd])

  const handleUpdate = useCallback(async (id: string, data: AchievementFormData) => {
    setEditLoading(true)
    try {
      await onUpdate(id, {
        title: data.title.trim(),
        description: data.description.trim() || null,
        date: data.date || null,
        link: data.link.trim() || null,
      })
      setEditingId(null)
    } finally {
      setEditLoading(false)
    }
  }, [onUpdate])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try { await onDelete(id) } finally { setDeletingId(null) }
  }, [onDelete])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#909090]">Achievements</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add achievement
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {achievements.map((achievement) =>
          editingId === achievement.id ? (
            <AchievementForm
              key={achievement.id}
              initial={{
                title: achievement.title,
                description: achievement.description ?? '',
                date: achievement.date ?? '',
                link: achievement.link ?? '',
              }}
              onSubmit={(data) => handleUpdate(achievement.id, data)}
              onCancel={() => setEditingId(null)}
              loading={editLoading}
              error={null}
              submitLabel="Save"
            />
          ) : (
            // ── Card matches public page exactly ──
            <div
              key={achievement.id}
              className={cn(
                'group flex gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-4 transition-all duration-200 ease-out hover:border-[#D5D5D5] hover:shadow-[0_4px_12px_rgba(15,23,2,0.08)] hover:-translate-y-0.5',
                deletingId === achievement.id && 'opacity-40',
              )}
            >
              {/* Icon — matches public page */}
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#EBEBEB] bg-[#F5F5F5]">
                  <Trophy className="h-5 w-5 text-[#0F1702]/40" />
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="font-semibold leading-tight text-[#0F1702]"
                    style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
                  >
                    {achievement.title}
                  </h3>
                  {achievement.link && (
                    <ArrowSquareOut className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#D0D0D0] transition-colors group-hover:text-[#909090]" />
                  )}
                </div>

                {achievement.description && (
                  <p className="mt-1 text-sm leading-relaxed text-[#909090]">{achievement.description}</p>
                )}

                {achievement.date && (
                  <p className="mt-1.5 text-xs text-[#C0C0C0]">
                    {new Date(achievement.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                )}

                {/* Inline link preview */}
                {achievement.link && <LinkPreview url={achievement.link} />}
              </div>

              {/* Edit / delete actions */}
              <div className="flex flex-shrink-0 flex-col items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setEditingId(achievement.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#C0C0C0] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
                >
                  <PencilSimple className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(achievement.id)}
                  disabled={deletingId === achievement.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#C0C0C0] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                >
                  {deletingId === achievement.id
                    ? <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                    : <Trash className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ),
        )}

        {achievements.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-dashed border-[#EBEBEB] py-8 text-center">
            <Trophy className="mx-auto mb-2 h-6 w-6 text-[#D0D0D0]" />
            <p className="text-sm text-[#909090]">
              No achievements yet.{' '}
              <button
                onClick={() => setShowAddForm(true)}
                className="font-medium text-[#0F1702] underline-offset-2 hover:underline"
              >
                Add your first
              </button>
            </p>
          </div>
        )}
      </div>

      {showAddForm && (
        <AchievementForm
          onSubmit={handleAdd}
          onCancel={() => { setShowAddForm(false); setAddError(null) }}
          loading={addLoading}
          error={addError}
          submitLabel="Add achievement"
        />
      )}
    </div>
  )
}
