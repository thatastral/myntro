'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, XCircle, Clock, Loader2, ExternalLink, RefreshCw } from 'lucide-react'

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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">Access denied.</p>
      </div>
    )
  }

  const pending = affiliations.filter((a) => !a.verified)
  const approved = affiliations.filter((a) => a.verified)
  const displayed = filter === 'pending' ? pending : affiliations

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Affiliation Review</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {pending.length} pending · {approved.length} approved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-gray-200 bg-white p-0.5 text-xs font-medium dark:border-gray-800 dark:bg-gray-900">
              {(['pending', 'all'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                    filter === f
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => load(filter)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
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
                  className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Affiliation logo */}
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                    {a.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.logo_url} alt={a.community_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400 dark:text-gray-500">
                        {a.community_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-50">
                        {a.community_name}
                      </span>
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
                    </div>

                    {a.role && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{a.role}</p>
                    )}

                    {/* Submitted by */}
                    {user && (
                      <button
                        onClick={() => router.push(`/${user.username}`)}
                        className="mt-0.5 flex items-center gap-1.5 w-fit text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <div className="h-4 w-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.username} width={16} height={16} className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-gray-400">
                              {(user.name || user.username).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        @{user.username}
                        {user.name && <span className="text-gray-300 dark:text-gray-600">·</span>}
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
                              <img
                                src={a.proof_link}
                                alt="Proof"
                                className="h-24 w-auto rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                              />
                            </a>
                          )}
                          <a
                            href={a.proof_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 w-fit text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {isPdf ? 'View PDF' : isImage ? 'Open full image' : 'View proof'}
                          </a>
                        </div>
                      )
                    })()}

                    <p className="text-[10px] text-gray-300 dark:text-gray-600">
                      Submitted {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 flex-col gap-2">
                    {!a.verified && (
                      <button
                        onClick={() => setVerified(a.id, true)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                        Approve
                      </button>
                    )}
                    {a.verified && (
                      <button
                        onClick={() => setVerified(a.id, false)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
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
