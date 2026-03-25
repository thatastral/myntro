'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, X, Sparkles, StopCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'What projects have they worked on?',
  'What are their main skills?',
  'What communities are they part of?',
  'What achievements do they have?',
]

interface AIChatSidebarProps {
  open: boolean
  onClose: () => void
  username: string
  ownerName: string
}

export function AIChatSidebar({ open, onClose, username, ownerName }: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const sendMessage = useCallback(async (text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || streaming) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          question: trimmed,
          history: messages.slice(-10),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.error ?? 'Something went wrong. Please try again.',
          }
          return updated
        })
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No stream')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        const snapshot = fullText
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: snapshot }
          return updated
        })
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Failed to get a response. Please try again.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming, username])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const handleClose = () => {
    abortRef.current?.abort()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Sidebar panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[420px] dark:bg-gray-950 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Ask about {ownerName}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                AI-powered · DeepSeek
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/30">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  Ask me anything about {ownerName}
                </p>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  Skills, projects, experience, communities — I know it all.
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-sm text-gray-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-800 dark:hover:bg-violet-950/30 dark:hover:text-violet-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                      msg.role === 'user'
                        ? 'bg-gray-900 dark:bg-gray-100'
                        : 'bg-violet-600'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-3.5 w-3.5 text-white dark:text-gray-900" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                        : 'rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Thinking…
                      </span>
                    ) : null)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-gray-100 p-4 dark:border-gray-800">
          <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 transition-colors focus-within:border-violet-300 focus-within:bg-white dark:border-gray-700 dark:bg-gray-900 dark:focus-within:border-violet-700 dark:focus-within:bg-gray-950">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${ownerName}…`}
              disabled={streaming}
              rows={1}
              maxLength={1000}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none disabled:opacity-60 dark:text-gray-50 dark:placeholder-gray-500"
              style={{ overflowY: 'auto' }}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
              >
                <StopCircle className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-600">
            Press Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </>
  )
}
