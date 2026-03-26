'use client'

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { PaperPlaneRight, User, CircleNotch, X, StopCircle } from '@phosphor-icons/react'

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

// Myntro icon mark — just the SVG shape, no wordmark
function MyntroMark({ size, gradId, clipId }: { size: number; gradId: string; clipId: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 55 55"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="27.4183" y1="-6.45572" x2="27.4183" y2="56.1765" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="#8EE600" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect width="54.8377" height="54.8377" fill="white" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M-0.000976562 14.8511C-0.000976562 6.57424 9.19728 1.61336 16.1134 6.16011L27.4183 13.592L38.7231 6.16011C45.6392 1.61337 54.8375 6.57426 54.8375 14.8511V40.0039C54.8375 45.7482 50.1809 50.4048 44.4366 50.4048H10.3999C4.65563 50.4048 -0.000976562 45.7482 -0.000976562 40.0039V14.8511Z"
          fill={`url(#${gradId})`}
        />
      </g>
    </svg>
  )
}

// Self-contained avatar that generates its own unique gradient IDs
function MyntroAvatar({ containerSize, markSize, rounded = 'xl' }: {
  containerSize: number
  markSize: number
  rounded?: 'full' | 'xl' | '2xl'
}) {
  const uid = useId().replace(/:/g, '')
  const borderRadius = rounded === 'full' ? '50%' : rounded === '2xl' ? '16px' : '10px'
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{ width: containerSize, height: containerSize, background: '#182403', borderRadius }}
    >
      <MyntroMark size={markSize} gradId={`mg_${uid}`} clipId={`mc_${uid}`} />
    </div>
  )
}

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
  const [inputFocused, setInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose() }
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
        body: JSON.stringify({ username, question: trimmed, history: messages.slice(-10) }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: err.error ?? 'Something went wrong. Please try again.' }
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
        updated[updated.length - 1] = { role: 'assistant', content: 'Failed to get a response. Please try again.' }
        return updated
      })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, streaming, username])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleStop = () => { abortRef.current?.abort(); setStreaming(false) }
  const handleClose = () => { abortRef.current?.abort(); onClose() }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ background: 'rgba(24,36,3,0.22)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={handleClose}
      />

      {/* Floating panel — 16px gap from top, bottom, right */}
      <div
        className={`fixed z-50 flex flex-col bg-white transition-all duration-300 ease-out ${open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}
        style={{
          top: 16,
          bottom: 16,
          right: 16,
          width: 'min(400px, calc(100vw - 32px))',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(24,36,3,0.12), 0 2px 8px rgba(24,36,3,0.08), 0 0 0 1px rgba(24,36,3,0.06)',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-3">
            <MyntroAvatar containerSize={38} markSize={28} rounded="xl" />
            <div>
              <p className="text-sm font-semibold text-[#182403]">Ask about {ownerName}</p>
              <p className="text-xs text-[#C0C0C0]">AI-powered · Myntro</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#C0C0C0] transition-all hover:bg-[#F5F5F5] hover:text-[#182403]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages / Empty state */}
        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              {/* Logo mark — large */}
              <div style={{ boxShadow: '0 4px 24px rgba(24,36,3,0.18)', borderRadius: 20 }}>
                <MyntroAvatar containerSize={72} markSize={52} rounded="2xl" />
              </div>

              <div className="space-y-1">
                <p className="text-base font-semibold text-[#182403]">Ask me anything about {ownerName}</p>
                <p className="text-sm text-[#909090]">Skills, projects, experience, communities — I know it all.</p>
              </div>

              {/* Suggestion chips */}
              <div className="w-full space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="group w-full flex items-center justify-between rounded-xl border border-[#EBEBEB] bg-white px-4 py-3 text-left text-sm text-[#182403] transition-all hover:-translate-y-0.5 hover:border-[#C6F135]/70 hover:bg-[#F8FDE8] hover:shadow-[0_2px_12px_rgba(142,230,0,0.12)]"
                  >
                    <span>{s}</span>
                    <PaperPlaneRight
                      className="h-3.5 w-3.5 flex-shrink-0 text-[#C0C0C0] transition-colors group-hover:text-[#4A7A00]"
                      weight="fill"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {msg.role === 'user' ? (
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ background: '#182403' }}
                    >
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <MyntroAvatar containerSize={28} markSize={20} rounded="full" />
                  )}

                  {/* Bubble */}
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={
                      msg.role === 'user'
                        ? { background: '#182403', color: '#fff', borderTopRightRadius: 6 }
                        : { background: '#F5F5F5', color: '#182403', borderTopLeftRadius: 6 }
                    }
                  >
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="flex items-center gap-1.5 text-[#909090]">
                        <CircleNotch className="h-3.5 w-3.5 animate-spin" />
                        Thinking…
                      </span>
                    ) : null)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 pb-4 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-2 transition-all duration-200"
            style={{
              background: '#FAFAFA',
              border: `1.5px solid ${inputFocused ? '#8EE600' : '#EBEBEB'}`,
              boxShadow: inputFocused ? '0 0 0 3px rgba(142,230,0,0.12)' : 'none',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={`Ask about ${ownerName}…`}
              disabled={streaming}
              rows={1}
              maxLength={1000}
              className="max-h-32 flex-1 resize-none bg-transparent text-sm text-[#182403] placeholder-[#C0C0C0] outline-none disabled:opacity-60"
              style={{ lineHeight: '1.4' }}
            />
            {streaming ? (
              <button
                onClick={handleStop}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#EBEBEB] bg-white text-[#909090] transition-all hover:bg-[#F5F5F5] hover:text-[#182403]"
              >
                <StopCircle className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl font-semibold text-[#182403] transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: input.trim()
                    ? 'linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)'
                    : '#F0F0F0',
                  boxShadow: input.trim() ? '0 2px 10px rgba(142,230,0,0.35)' : 'none',
                }}
              >
                <PaperPlaneRight className="h-3.5 w-3.5" weight="fill" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-[#D0D0D0]">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </>
  )
}
