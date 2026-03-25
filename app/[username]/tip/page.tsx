'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, Copy, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const TipFlow = dynamic(() => import('./_TipFlow').then((m) => m.TipFlow), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  ),
})

interface TipPageProps {
  params: Promise<{ username: string }>
}

export default function TipPage({ params }: TipPageProps) {
  const { username } = use(params)
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/profile?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { setNotFound(true); return }
        setOwnerName(data.user.name || username)
        setWalletAddress(data.wallet?.wallet_address ?? null)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">Profile not found.</p>
        <button onClick={() => router.push('/')} className="text-sm font-medium text-gray-700 underline-offset-2 hover:underline dark:text-gray-300">
          Go home
        </button>
      </div>
    )
  }

  if (!walletAddress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-6 dark:bg-gray-950">
        <Zap className="h-10 w-10 text-gray-300 dark:text-gray-700" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          @{username} hasn&apos;t connected a wallet yet.
        </p>
        <button onClick={() => router.push(`/${username}`)} className="text-sm text-gray-400 underline-offset-2 hover:underline">
          Back to profile
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-sm px-4 py-12">
        <button
          onClick={() => router.push(`/${username}`)}
          className="mb-8 flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to @{username}
        </button>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-6 py-5 text-center dark:border-gray-800">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Tip {ownerName}</h1>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Send SOL, USDC, or USDT via Solana</p>
          </div>

          <TipFlow ownerName={ownerName} walletAddress={walletAddress} />
        </div>
      </div>
    </div>
  )
}
