'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, XCircle, Clock, CircleNotch, ArrowSquareOut, ArrowClockwise, ArrowLeft } from '@phosphor-icons/react'
import Link from 'next/link'

interface AffiliationRow {
  id: string
  community_name: string
  role: string | null
  logo_url: string | null
  proof_link: string | null
  verified: boolean
  created_at: string
  users: {
    id: string
    username: string
    name: string | null
    avatar_url: string | null
  } | null
}

type Filter = 'pending' | 'all'

export default function AdminAffiliationsPage() {
  const router = useRouter()
  const [affiliations, setAffiliations] = useState<AffiliationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [filter, setFilter] = useState<Filter>('pending')
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async (f: Filter) => {
    setLoading(true)
    const res = await fetch(`/api/admin/affiliations?status=${f}`)
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await res.json()
    setAffiliations(data.affiliations ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load(filter) }, [filter, load])

  const setVerified = useCallback(async (id: string, verified: boolean) => {
    setActionId(id)
    const res = await fetch('/api/admin/affiliations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, verified }),
    })
    if (res.ok) {
      const { affiliation } = await res.json()
      setAffiliations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, verified: affiliation.verified } : a)),
      )
    }
    setActionId(null)
  }, [])

  if (forbidden) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <p className="text-sm text-[#909090]">Access denied.</p>
      </div>
    )
  }

  const pending = affiliations.filter((a) => !a.verified)
  const approved = affiliations.filter((a) => a.verified)
  const displayed = filter === 'pending' ? pending : affiliations

  return (
    <div className="min-h-[100dvh] bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-3 flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <h1
              className="text-xl font-bold text-[#0F1702]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              Affiliation Review
            </h1>
            <p className="mt-0.5 text-sm text-[#909090]">
              {pending.length} pending · {approved.length} approved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-0.5 text-xs font-medium">
              {(['pending', 'all'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                    filter === f
                      ? 'bg-[#0F1702] text-white'
                      : 'text-[#909090] hover:text-[#0F1702]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(filter)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#EBEBEB] bg-white text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-[#0F1702]"
            >
              <ArrowClockwise className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <CircleNotch className="h-5 w-5 animate-spin text-[#C0C0C0]" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E8E8] py-16 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-[#E0E0E0]" />
            <p className="text-sm text-[#909090]">
              {filter === 'pending' ? 'No pending affiliations.' : 'No affiliations yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((a) => {
              const user = a.users
              const isActing = actionId === a.id
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                >
                  {/* Affiliation logo */}
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[#F0F0F0] bg-[#F5F5F5]">
                    {a.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[#C0C0C0]">
                        {a.community_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#0F1702]">{a.community_name}</span>
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
                    </div>

                    {a.role && <p className="text-xs text-[#909090]">{a.role}</p>}

                    {user && (
                      <button
                        onClick={() => router.push(`/${user.username}`)}
                        className="mt-0.5 flex items-center gap-1.5 w-fit text-xs text-[#909090] transition-colors hover:text-[#0F1702]"
                      >
                        <div className="h-4 w-4 overflow-hidden rounded-full bg-[#E8E8E8] flex-shrink-0">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.username} width={16} height={16} className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-[#C0C0C0]">
                              {(user.name || user.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        @{user.username}
                        {user.name && <span className="text-[#D0D0D0]">·</span>}
                        {user.name && <span>{user.name}</span>}
                      </button>
                    )}

                    {a.proof_link && (() => {
                      const isImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(a.proof_link)
                      const isPdf = /\.pdf(\?|$)/i.test(a.proof_link)
                      return (
                        <div className="mt-1 flex flex-col gap-1.5">
                          {isImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a href={a.proof_link} target="_blank" rel="noopener noreferrer">
                              <img src={a.proof_link} alt="Proof" className="h-24 w-auto rounded-lg border border-[#EBEBEB] object-cover" />
                            </a>
                          )}
                          <a
                            href={a.proof_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 w-fit text-xs text-[#909090] underline-offset-2 hover:text-[#0F1702] hover:underline transition-colors"
                          >
                            <ArrowSquareOut className="h-3 w-3" />
                            {isPdf ? 'View PDF' : isImage ? 'Open full image' : 'View proof'}
                          </a>
                        </div>
                      )
                    })()}

                    <p className="text-[10px] text-[#C0C0C0]">
                      Submitted {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    {!a.verified && (
                      <button
                        onClick={() => setVerified(a.id, true)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0F1702] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1A2E03] disabled:opacity-50"
                      >
                        {isActing ? <CircleNotch className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                        Approve
                      </button>
                    )}
                    {a.verified && (
                      <button
                        onClick={() => setVerified(a.id, false)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 rounded-xl border border-[#EBEBEB] bg-white px-3 py-1.5 text-xs font-semibold text-[#909090] transition-colors hover:bg-[#FAFAFA] hover:text-red-600 disabled:opacity-50"
                      >
                        {isActing ? <CircleNotch className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
