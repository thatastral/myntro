'use client'

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type KeyboardEvent,
} from 'react'
import { cn } from '@/lib/utils'

interface InlineEditorProps {
  value: string
  onSave: (value: string) => Promise<void> | void
  placeholder?: string
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  multiline?: boolean
  maxLength?: number
  disabled?: boolean
}

export function InlineEditor({
  value,
  onSave,
  placeholder = 'Click to edit…',
  className,
  as: Tag = 'p',
  multiline = false,
  maxLength,
  disabled = false,
}: InlineEditorProps) {
  const ref = useRef<HTMLElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedValue = useRef(value)

  // Sync content when value prop changes externally
  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.textContent = value
      savedValue.current = value
    }
  }, [value])

  const handleBlur = useCallback(async () => {
    if (!ref.current) return

    const newValue = ref.current.textContent?.trim() ?? ''

    if (newValue === savedValue.current) return

    if (maxLength && newValue.length > maxLength) {
      ref.current.textContent = savedValue.current
      setError(`Max ${maxLength} characters.`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(newValue)
      savedValue.current = newValue
    } catch {
      // Revert to last saved value on error
      if (ref.current) {
        ref.current.textContent = savedValue.current
      }
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }, [onSave, maxLength])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault()
        ref.current?.blur()
      }
      if (e.key === 'Escape') {
        if (ref.current) {
          ref.current.textContent = savedValue.current
        }
        ref.current?.blur()
      }
    },
    [multiline],
  )

  const handleInput = useCallback(() => {
    if (!maxLength || !ref.current) return
    const text = ref.current.textContent ?? ''
    if (text.length > maxLength) {
      // Truncate to maxLength
      ref.current.textContent = text.slice(0, maxLength)
      // Move cursor to end
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    setError(null)
  }, [maxLength])

  return (
    <div className="group relative">
      <Tag
        ref={ref as React.RefObject<never>}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        data-placeholder={placeholder}
        className={cn(
          'outline-none transition-colors',
          !disabled && [
            'cursor-text rounded-md px-1 -mx-1',
            'hover:bg-gray-50 dark:hover:bg-gray-800/60',
            'focus:bg-gray-50 dark:focus:bg-gray-800/60',
            'focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-700',
          ],
          saving && 'opacity-60',
          // Placeholder via CSS when empty
          'empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:dark:text-gray-600',
          className,
        )}
      >
        {value || undefined}
      </Tag>

      {/* Saving/error indicator */}
      <div className="absolute -bottom-5 left-0 text-xs">
        {saving && <span className="text-gray-400">Saving…</span>}
        {error && <span className="text-red-500">{error}</span>}
      </div>
    </div>
  )
}
