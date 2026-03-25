'use client'

import { useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Trophy, Check } from 'lucide-react'
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

const EMPTY_FORM: AchievementFormData = {
  title: '',
  description: '',
  date: '',
  link: '',
}

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

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
      className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/10"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Won ETH Global Hackathon"
          required
          maxLength={120}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Brief description of this achievement…"
          rows={2}
          maxLength={500}
          className="resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update('date', e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Link</label>
          <input
            type="url"
            value={form.link}
            onChange={(e) => update('link', e.target.value)}
            placeholder="https://…"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !form.title.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

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

  const handleAdd = useCallback(
    async (data: AchievementFormData) => {
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
    },
    [onAdd],
  )

  const handleUpdate = useCallback(
    async (id: string, data: AchievementFormData) => {
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
    },
    [onUpdate],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id)
      try {
        await onDelete(id)
      } finally {
        setDeletingId(null)
      }
    },
    [onDelete],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Achievements
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
            <div
              key={achievement.id}
              className={cn(
                'group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900',
                deletingId === achievement.id && 'opacity-40',
              )}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {achievement.title}
                </span>
                {achievement.description && (
                  <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {achievement.description}
                  </span>
                )}
                {achievement.date && (
                  <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(achievement.date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setEditingId(achievement.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(achievement.id)}
                  disabled={deletingId === achievement.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  {deletingId === achievement.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ),
        )}

        {achievements.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-800">
            <Trophy className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No achievements yet.{' '}
              <button
                onClick={() => setShowAddForm(true)}
                className="font-medium text-gray-600 underline-offset-2 hover:underline dark:text-gray-400"
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
