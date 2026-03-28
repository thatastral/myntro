'use client'

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { UploadSimple, FileText, CheckCircle, XCircle, CircleNotch, X, Link as LinkIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'
type Mode = 'file' | 'url'

interface CVUploadProps {
  onSuccess?: (documentId: string, fileUrl: string) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.txt'
const MAX_SIZE_MB = 10

const URL_PLACEHOLDERS = [
  'https://read.cv/yourname',
  'https://linkedin.com/in/yourname',
  'https://standard.resume/yourname',
  'https://yourportfolio.com',
]

export function CVUpload({ onSuccess }: CVUploadProps) {
  const [mode, setMode] = useState<Mode>('file')

  // File upload state
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  // URL state
  const [urlValue, setUrlValue] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null)

  const reset = () => {
    setState('idle')
    setProgress(0)
    setFileName(null)
    setError(null)
    setSuccessMessage(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only PDF, DOC, DOCX, and TXT files are supported.'
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_SIZE_MB} MB.`
    return null
  }

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) { setState('error'); setError(validationError); return }

    setState('uploading')
    setFileName(file.name)
    setProgress(0)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90))
      })

      xhr.addEventListener('load', () => {
        setProgress(100)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            setState('success')
            const chars = data.chars_extracted ? ` · ${data.chars_extracted.toLocaleString()} chars extracted` : ''
            setSuccessMessage(`CV processed${chars}`)
            onSuccess?.(data.document_id, data.file_url)
          } catch {
            setState('error')
            setError('Unexpected server response.')
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText)
            setState('error')
            setError(data.error ?? 'Upload failed.')
          } catch {
            setState('error')
            setError('Upload failed. Please try again.')
          }
        }
        resolve()
      })

      xhr.addEventListener('error', () => { setState('error'); setError('Network error. Please check your connection.'); resolve() })
      xhr.addEventListener('abort', () => { setState('idle'); setProgress(0); resolve() })

      xhr.open('POST', '/api/cv')
      xhr.send(formData)
    })
  }, [onSuccess])

  const handleUrlSubmit = useCallback(async () => {
    const trimmed = urlValue.trim()
    if (!trimmed) return
    setUrlLoading(true)
    setUrlError(null)
    setUrlSuccess(null)

    try {
      const res = await fetch('/api/cv/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUrlError(data.error ?? 'Failed to import from URL.')
      } else {
        const chars = data.chars_extracted ? ` · ${data.chars_extracted.toLocaleString()} chars extracted` : ''
        setUrlSuccess(`Imported from ${data.source ?? 'URL'}${chars}`)
        onSuccess?.(data.document_id, trimmed)
        setUrlValue('')
      }
    } catch {
      setUrlError('Network error. Please try again.')
    } finally {
      setUrlLoading(false)
    }
  }, [urlValue, onSuccess])

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); if (state !== 'uploading') setState('dragging') }
  const handleDragLeave = () => { if (state === 'dragging') setState('idle') }
  const handleDrop = (e: DragEvent) => { e.preventDefault(); if (state === 'uploading') return; const file = e.dataTransfer.files[0]; if (file) uploadFile(file) }
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) uploadFile(file) }
  const cancelUpload = () => xhrRef.current?.abort()

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1 flex items-center gap-2">
        <UploadSimple className="h-4 w-4 text-[#C0C0C0]" />
        <h3 className="text-sm font-semibold text-[#0F1702]">CV / Resume</h3>
      </div>
      <div className="flex items-center justify-between">
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-[#EBEBEB] bg-[#FAFAFA] p-0.5">
          <button
            onClick={() => setMode('file')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              mode === 'file'
                ? 'bg-white text-[#0F1702] shadow-sm'
                : 'text-[#C0C0C0] hover:text-[#909090]',
            )}
          >
            <UploadSimple className="h-3 w-3" />
            Upload file
          </button>
          <button
            onClick={() => setMode('url')}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              mode === 'url'
                ? 'bg-white text-[#0F1702] shadow-sm'
                : 'text-[#C0C0C0] hover:text-[#909090]',
            )}
          >
            <LinkIcon className="h-3 w-3" />
            From URL
          </button>
        </div>
      </div>

      {mode === 'file' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => state === 'idle' && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all',
            state === 'idle' && 'cursor-pointer border-[#EBEBEB] hover:border-[#D5D5D5] hover:bg-[#FAFAFA]/50',
            state === 'dragging' && 'border-[#8EE600] bg-[#F0FBE0]/30',
            state === 'uploading' && 'cursor-default border-[#EBEBEB]',
            state === 'success' && 'cursor-default border-[#8EE600]/40 bg-[#F0FBE0]/30',
            state === 'error' && 'cursor-pointer border-red-300 bg-red-50/30',
          )}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={handleInputChange} />

          {state === 'idle' && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F5]">
                <UploadSimple className="h-5 w-5 text-[#909090]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F1702]">
                  Drop your CV here, or <span className="text-[#4A7A00]">browse</span>
                </p>
                <p className="mt-0.5 text-xs text-[#C0C0C0]">PDF, DOC, DOCX, TXT — up to {MAX_SIZE_MB} MB</p>
              </div>
            </>
          )}

          {state === 'dragging' && (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D0ED99]/50">
                <UploadSimple className="h-5 w-5 text-[#4A7A00]" />
              </div>
              <p className="text-sm font-medium text-[#4A7A00]">Drop to upload</p>
            </>
          )}

          {state === 'uploading' && (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F5F5]">
                <FileText className="h-5 w-5 text-[#909090]" />
              </div>
              <div className="w-full max-w-xs">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="max-w-[180px] truncate text-xs text-[#909090]">{fileName}</span>
                  <span className="text-xs font-medium text-[#0F1702]">{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EBEBEB]">
                  <div className="h-full rounded-full bg-[#0F1702] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#909090]">
                <CircleNotch className="h-4 w-4 animate-spin" />
                Extracting and indexing…
              </div>
              <button onClick={(e) => { e.stopPropagation(); cancelUpload() }} className="text-xs text-[#C0C0C0] underline-offset-2 hover:underline">Cancel</button>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-10 w-10 text-[#4A7A00]" />
              <div>
                <p className="text-sm font-medium text-[#4A7A00]">CV uploaded successfully</p>
                {successMessage && <p className="mt-0.5 text-xs text-[#4A7A00]/70">{successMessage}</p>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); reset() }} className="mt-1 flex items-center gap-1 text-xs text-[#C0C0C0] underline-offset-2 hover:underline">
                <X className="h-3 w-3" />
                Upload a different file
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-10 w-10 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600">Upload failed</p>
                {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); reset() }} className="mt-1 text-xs text-[#C0C0C0] underline-offset-2 hover:underline">Try again</button>
            </div>
          )}
        </div>
      ) : (
        /* URL mode */
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => { setUrlValue(e.target.value); setUrlError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && !urlLoading && handleUrlSubmit()}
              placeholder={URL_PLACEHOLDERS[0]}
              disabled={urlLoading}
              className="flex-1 rounded-xl border border-[#EBEBEB] bg-white px-3 py-2.5 text-sm text-[#0F1702] outline-none transition-all duration-150 placeholder:text-[#C0C0C0] focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20 disabled:opacity-50"
            />
            <button
              onClick={handleUrlSubmit}
              disabled={urlLoading || !urlValue.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[#0F1702] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1A2E03] disabled:opacity-40"
            >
              {urlLoading ? <CircleNotch className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              {urlLoading ? 'Importing…' : 'Import'}
            </button>
          </div>

          <p className="text-xs text-[#C0C0C0]">
            Works with read.cv, LinkedIn, Standard Resume, personal portfolio sites, and more.
          </p>

          {urlError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-xs text-red-600">{urlError}</p>
            </div>
          )}

          {urlSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-[#8EE600]/30 bg-[#F0FBE0]/50 px-3 py-2.5">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-[#4A7A00]" />
              <p className="text-xs text-[#4A7A00]">{urlSuccess}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
