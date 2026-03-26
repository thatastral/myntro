'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lightning, Copy, Check, CircleNotch, Warning, CheckCircle } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'

const TipFlow = dynamic(() => import('./_TipFlow').then((m) => m.TipFlow), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-10">
      <CircleNotch className="h-5 w-5 animate-spin text-[#909090]" />
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <CircleNotch className="h-5 w-5 animate-spin text-[#C0C0C0]" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <p className="text-sm text-[#909090]">Profile not found.</p>
        <button onClick={() => router.push('/')} className="text-sm font-semibold text-[#182403] underline-offset-2 hover:underline">
          Go home
        </button>
      </div>
    )
  }

  if (!walletAddress) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-white px-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAFAFA] border border-[#EBEBEB]">
          <Lightning className="h-7 w-7 text-[#C0C0C0]" />
        </div>
        <p className="text-sm font-medium text-[#182403]">
          @{username} hasn&apos;t connected a wallet yet.
        </p>
        <button onClick={() => router.push(`/${username}`)} className="text-sm text-[#909090] underline-offset-2 hover:underline hover:text-[#182403] transition-colors">
          Back to profile
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mx-auto max-w-sm px-4 py-12">
        <button
          onClick={() => router.push(`/${username}`)}
          className="mb-8 flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#182403]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to @{username}
        </button>

        <div className="rounded-2xl border border-[#EBEBEB] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[#F5F5F5] px-6 py-5 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FBE0] border border-[#C6F135]/40">
                <Lightning className="h-6 w-6 text-[#4A7A00]" />
              </div>
            </div>
            <h1
              className="text-lg font-bold text-[#182403]"
              style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
            >
              Tip {ownerName}
            </h1>
            <p className="mt-1 text-sm text-[#909090]">Send SOL, USDC, or USDT via Solana</p>
          </div>

          <TipFlow ownerName={ownerName} walletAddress={walletAddress} />
        </div>
      </div>
    </div>
  )
}
