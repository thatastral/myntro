'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, Trash, CircleNotch, CheckCircle, Users, Check, X, Camera, PencilSimple, Clock, UploadSimple, Link as LinkIcon } from '@phosphor-icons/react'
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
      <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">Community logo</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#EBEBEB] bg-[#FAFAFA] transition-colors hover:border-[#D5D5D5]"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="logo" className="h-full w-full object-cover" />
        ) : (
          <Camera className="h-4 w-4 text-[#C0C0C0]" />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <CircleNotch className="h-4 w-4 animate-spin text-[#909090]" />
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
          className="text-[10px] text-[#909090] underline-offset-2 hover:underline"
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
        <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">Proof</label>
        <div className="flex rounded-lg border border-[#EBEBEB] bg-[#FAFAFA] p-0.5">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === 'url'
                ? 'bg-white text-[#0F1702] shadow-sm'
                : 'text-[#909090] hover:text-[#0F1702]'
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
                ? 'bg-white text-[#0F1702] shadow-sm'
                : 'text-[#909090] hover:text-[#0F1702]'
            }`}
          >
            <UploadSimple className="h-3 w-3" />
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
          className="rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-colors focus:border-[#8EE600] focus:ring-2 focus:ring-[#8EE600]/20"
        />
      ) : (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2.5 text-sm text-[#909090] transition-colors hover:border-[#D5D5D5] hover:bg-[#F5F5F5] disabled:opacity-50"
          >
            {uploading ? (
              <><CircleNotch className="h-4 w-4 animate-spin" />Uploading…</>
            ) : uploadName ? (
              <><Check className="h-4 w-4 text-[#4A7A00]" /><span className="truncate max-w-[200px] text-[#4A7A00]">{uploadName}</span></>
            ) : (
              <><UploadSimple className="h-4 w-4" />Click to upload image or PDF</>
            )}
          </button>
          {uploadName && (
            <button
              type="button"
              onClick={() => { onChange(''); setUploadName(null) }}
              className="mt-1 text-[10px] text-[#909090] underline-offset-2 hover:underline"
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
      <p className="text-[10px] text-[#C0C0C0]">
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
      className="flex flex-col gap-3 rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-4"
    >
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">
            Community logo <span className="text-red-500">*</span>
          </label>
          <LogoUpload value={form.logo_url} onChange={(url) => update('logo_url', url)} />
          {!form.logo_url && isNew && (
            <p className="text-[10px] text-red-500">Required</p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">
              Community / DAO / Protocol <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={form.community_name}
              onChange={(e) => update('community_name', e.target.value)}
              placeholder="e.g. Developer DAO, Bankless"
              required
              maxLength={100}
              className="rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-colors focus:border-[#8EE600] focus:ring-2 focus:ring-[#8EE600]/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#909090]">Role</label>
            <input
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              placeholder="Member, Contributor, Core team…"
              maxLength={60}
              className="rounded-lg border border-[#EBEBEB] bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-colors focus:border-[#8EE600] focus:ring-2 focus:ring-[#8EE600]/20"
            />
          </div>
        </div>
      </div>

      <ProofInput value={form.proof_link} onChange={(val) => update('proof_link', val)} />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <p className="text-xs text-[#C0C0C0]">
        Verification badges are awarded manually by the Myntro team after review.
      </p>

      <div className="flex items-center justify-between">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
          >
            <Trash className="h-3 w-3" />
            Delete
          </button>
        ) : <span />}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#F0F0F0] hover:text-[#0F1702]"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F1702] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1A2E03] disabled:opacity-40"
          >
            {loading ? <CircleNotch className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4A7A00]">
          Community Affiliations
        </h3>
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
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
                  'group flex items-center gap-2.5 rounded-xl border border-[#EBEBEB] bg-white px-3 py-2.5 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
                  deletingId === a.id && 'opacity-40',
                )}
              >
                {/* Logo thumbnail */}
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-[#F5F5F5]">
                  {a.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#C0C0C0]">
                      {a.community_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium text-[#0F1702]">
                    {a.community_name}
                  </span>
                  {a.role && (
                    <span className="text-xs text-[#909090]">{a.role}</span>
                  )}
                </div>

                {a.verified ? (
                  <span className="flex items-center gap-1 rounded-full bg-[#F0FBE0] px-2 py-0.5 text-[10px] font-semibold text-[#4A7A00]">
                    <CheckCircle className="h-3 w-3" />
                    Approved
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                )}

                <button
                  onClick={() => { setEditingId(a.id); setShowAddForm(false); setEditError(null) }}
                  disabled={!!deletingId}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[#C0C0C0] opacity-0 transition-all hover:bg-[#FAFAFA] hover:text-[#0F1702] group-hover:opacity-100"
                  aria-label={`Edit ${a.community_name}`}
                >
                  <PencilSimple className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {affiliations.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed border-[#EBEBEB] py-8 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-[#D0D0D0]" />
          <p className="text-sm text-[#909090]">
            No affiliations yet.{' '}
            <button
              onClick={() => setShowAddForm(true)}
              className="font-medium text-[#0F1702] underline-offset-2 hover:underline"
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
