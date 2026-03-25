'use client'

import { useState, useCallback } from 'react'
import { GripVertical, Pencil, Trash2, Plus, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Link } from '@/types'

interface LinkEditorProps {
  links: Link[]
  onAdd: (link: Omit<Link, 'id' | 'user_id' | 'created_at' | 'display_order'>) => Promise<Link>
  onUpdate: (id: string, updates: Partial<Link>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (orderedIds: string[]) => Promise<void>
}

interface LinkFormData {
  title: string
  url: string
  icon: string
}

const EMPTY_FORM: LinkFormData = { title: '', url: '', icon: '' }

export function LinkEditor({ links, onAdd, onUpdate, onDelete, onReorder }: LinkEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<LinkFormData>(EMPTY_FORM)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<LinkFormData>(EMPTY_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.title.trim() || !addForm.url.trim()) return

    setAddLoading(true)
    setAddError(null)

    try {
      let url = addForm.url.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      await onAdd({ title: addForm.title.trim(), url, icon: addForm.icon.trim() || null })
      setAddForm(EMPTY_FORM)
      setShowAddForm(false)
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add link.')
    } finally {
      setAddLoading(false)
    }
  }, [addForm, onAdd])

  const startEdit = (link: Link) => {
    setEditingId(link.id)
    setEditForm({ title: link.title, url: link.url, icon: link.icon ?? '' })
  }

  const handleEditSubmit = useCallback(async (id: string) => {
    if (!editForm.title.trim() || !editForm.url.trim()) return

    setEditLoading(true)
    try {
      let url = editForm.url.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      await onUpdate(id, {
        title: editForm.title.trim(),
        url,
        icon: editForm.icon.trim() || null,
      })
      setEditingId(null)
    } catch {
      // keep form open on error
    } finally {
      setEditLoading(false)
    }
  }, [editForm, onUpdate])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }, [onDelete])

  // Drag-and-drop reordering
  const handleDragStart = (id: string) => setDraggingId(id)
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverId(id)
  }
  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }

    const ordered = [...links]
    const fromIndex = ordered.findIndex((l) => l.id === draggingId)
    const toIndex = ordered.findIndex((l) => l.id === targetId)

    if (fromIndex === -1 || toIndex === -1) return

    const [moved] = ordered.splice(fromIndex, 1)
    ordered.splice(toIndex, 0, moved)

    setDraggingId(null)
    setDragOverId(null)
    await onReorder(ordered.map((l) => l.id))
  }, [draggingId, links, onReorder])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Links
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add link
        </button>
      </div>

      {/* Link list */}
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <div
            key={link.id}
            draggable
            onDragStart={() => handleDragStart(link.id)}
            onDragOver={(e) => handleDragOver(e, link.id)}
            onDrop={(e) => handleDrop(e, link.id)}
            onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
            className={cn(
              'group rounded-xl border bg-white transition-all dark:bg-gray-900',
              dragOverId === link.id && draggingId !== link.id
                ? 'border-blue-300 shadow-md dark:border-blue-700'
                : 'border-gray-200 dark:border-gray-800',
              draggingId === link.id && 'opacity-40',
            )}
          >
            {editingId === link.id ? (
              <form
                onSubmit={(e) => { e.preventDefault(); handleEditSubmit(link.id) }}
                className="flex flex-col gap-2 p-3"
              >
                <input
                  autoFocus
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Title"
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
                />
                <input
                  value={editForm.url}
                  onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
                  >
                    {editLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2 px-3 py-3">
                <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-300 active:cursor-grabbing dark:text-gray-600" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                    {link.title}
                  </span>
                  <span className="truncate text-xs text-gray-400 dark:text-gray-500">
                    {link.url}
                  </span>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => startEdit(link)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  disabled={deletingId === link.id}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  {deletingId === link.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {links.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-800">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No links yet.{' '}
              <button
                onClick={() => setShowAddForm(true)}
                className="font-medium text-gray-600 underline-offset-2 hover:underline dark:text-gray-400"
              >
                Add your first link
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/30 p-3 dark:border-blue-900/40 dark:bg-blue-950/10"
        >
          <input
            autoFocus
            value={addForm.title}
            onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title (e.g. GitHub)"
            required
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
          />
          <input
            value={addForm.url}
            onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://github.com/yourname"
            required
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
          />

          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); setAddError(null) }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addLoading || !addForm.title.trim() || !addForm.url.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
            >
              {addLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add link
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
