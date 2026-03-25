'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, Trash2, Loader2, CheckCircle, Users, Check, X, Camera, Pencil, Clock, Upload, Link as LinkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Affiliation } from '@/types'

interface AffiliationEditorProps {
  affiliations: Affiliation[]
  onAdd: (affiliation: Omit<Affiliation, 'id' | 'user_id' | 'created_at' | 'verified'>) => Promise<Affiliation>
  onUpdate: (id: string, updates: Omit<Affiliation, 'id' | 'user_id' | 'created_at' | 'verified'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface AffiliationFormData {
  community_name: string
  role: string
  logo_url: string
  proof_link: string
}

const EMPTY_FORM: AffiliationFormData = {
  community_name: '',
  role: '',
  logo_url: '',
  proof_link: '',
}

function affiliationToForm(a: Affiliation): AffiliationFormData {
  return {
    community_name: a.community_name,
    role: a.role ?? '',
    logo_url: a.logo_url ?? '',
    proof_link: a.proof_link ?? '',
  }
}

function LogoUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/affiliations/logo', { method: 'POST', body: form })
      const data = await res.json()
      if (data.logo_url) onChange(data.logo_url)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [onChange])

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Community logo</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="logo" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        )}
        {value && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-4 w-4 text-white" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={handleFile}
        />
      </button>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[10px] text-gray-400 underline-offset-2 hover:underline"
        >
          Remove
        </button>
      )}
    </div>
  )
}

function ProofInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [mode, setMode] = useState<'url' | 'upload'>('url')
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isUploadedFile = value && !value.startsWith('http') === false && uploadName

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/affiliations/proof', { method: 'POST', body: form })
      const data = await res.json()
      if (data.proof_url) {
        onChange(data.proof_url)
        setUploadName(file.name)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [onChange])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Proof</label>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === 'url'
                ? 'bg-white text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-200'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <LinkIcon className="h-3 w-3" />
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-white text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-200'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Upload className="h-3 w-3" />
            Upload
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={uploadName ? '' : value}
          onChange={(e) => { setUploadName(null); onChange(e.target.value) }}
          placeholder="Link to membership proof (Discord, NFT, etc.)"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
        />
      ) : (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
            ) : uploadName ? (
              <><Check className="h-4 w-4 text-green-500" /><span className="truncate max-w-[200px] text-green-600 dark:text-green-400">{uploadName}</span></>
            ) : (
              <><Upload className="h-4 w-4" />Click to upload image or PDF</>
            )}
          </button>
          {uploadName && (
            <button
              type="button"
              onClick={() => { onChange(''); setUploadName(null) }}
              className="mt-1 text-[10px] text-gray-400 underline-offset-2 hover:underline"
            >
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Screenshot, NFT link, Discord role, or any proof of membership. Max 5 MB.
      </p>
    </div>
  )
}

function AffiliationForm({
  initialData = EMPTY_FORM,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  loading,
  error,
  isNew = false,
}: {
  initialData?: AffiliationFormData
  submitLabel: string
  onSubmit: (data: AffiliationFormData) => void
  onCancel: () => void
  onDelete?: () => void
  loading: boolean
  error: string | null
  isNew?: boolean
}) {
  const [form, setForm] = useState<AffiliationFormData>(initialData)
  const update = (field: keyof AffiliationFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const canSubmit = form.community_name.trim() && (!isNew || form.logo_url.trim())

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}
      className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50/30 p-4 dark:border-violet-900/40 dark:bg-violet-950/10"
    >
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Community logo <span className="text-red-500">*</span>
          </label>
          <LogoUpload value={form.logo_url} onChange={(url) => update('logo_url', url)} />
          {!form.logo_url && isNew && (
            <p className="text-[10px] text-red-500">Required</p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Community / DAO / Protocol <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={form.community_name}
              onChange={(e) => update('community_name', e.target.value)}
              placeholder="e.g. Developer DAO, Bankless"
              required
              maxLength={100}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Role</label>
            <input
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              placeholder="Member, Contributor, Core team…"
              maxLength={60}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
            />
          </div>
        </div>
      </div>

      <ProofInput value={form.proof_link} onChange={(val) => update('proof_link', val)} />

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Verification badges are awarded manually by the Myntro team after review.
      </p>

      <div className="flex items-center justify-between">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        ) : <span />}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

export function AffiliationEditor({ affiliations, onAdd, onUpdate, onDelete }: AffiliationEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = useCallback(
    async (data: AffiliationFormData) => {
      setAddLoading(true)
      setAddError(null)
      try {
        await onAdd({
          community_name: data.community_name.trim(),
          role: data.role.trim() || null,
          logo_url: data.logo_url || null,
          proof_link: data.proof_link.trim() || null,
        })
        setShowAddForm(false)
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : 'Failed to add affiliation.')
      } finally {
        setAddLoading(false)
      }
    },
    [onAdd],
  )

  const handleUpdate = useCallback(
    async (id: string, data: AffiliationFormData) => {
      setEditLoading(true)
      setEditError(null)
      try {
        await onUpdate(id, {
          community_name: data.community_name.trim(),
          role: data.role.trim() || null,
          logo_url: data.logo_url || null,
          proof_link: data.proof_link.trim() || null,
        })
        setEditingId(null)
      } catch (err: unknown) {
        setEditError(err instanceof Error ? err.message : 'Failed to update affiliation.')
      } finally {
        setEditLoading(false)
      }
    },
    [onUpdate],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id)
      setEditingId(null)
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
          Community Affiliations
        </h3>
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Add affiliation
          </button>
        )}
      </div>

      {/* Badge list */}
      {affiliations.length > 0 && (
        <div className="flex flex-col gap-2">
          {affiliations.map((a) => {
            if (editingId === a.id) {
              return (
                <AffiliationForm
                  key={a.id}
                  initialData={affiliationToForm(a)}
                  submitLabel="Save changes"
                  onSubmit={(data) => handleUpdate(a.id, data)}
                  onCancel={() => { setEditingId(null); setEditError(null) }}
                  onDelete={() => handleDelete(a.id)}
                  loading={editLoading}
                  error={editError}
                />
              )
            }

            return (
              <div
                key={a.id}
                className={cn(
                  'group flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-900',
                  deletingId === a.id && 'opacity-40',
                )}
              >
                {/* Logo thumbnail */}
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  {a.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400">
                      {a.community_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {a.community_name}
                  </span>
                  {a.role && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{a.role}</span>
                  )}
                </div>

                {a.verified ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Approved
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                )}

                <button
                  onClick={() => { setEditingId(a.id); setShowAddForm(false); setEditError(null) }}
                  disabled={!!deletingId}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-300 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  aria-label={`Edit ${a.community_name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {affiliations.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-800">
          <Users className="mx-auto mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No affiliations yet.{' '}
            <button
              onClick={() => setShowAddForm(true)}
              className="font-medium text-gray-600 underline-offset-2 hover:underline dark:text-gray-400"
            >
              Add your first
            </button>
          </p>
        </div>
      )}

      {showAddForm && (
        <AffiliationForm
          submitLabel="Add badge"
          onSubmit={handleAdd}
          onCancel={() => { setShowAddForm(false); setAddError(null) }}
          loading={addLoading}
          error={addError}
          isNew
        />
      )}
    </div>
  )
}
