'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Coins, CircleNotch } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'

const TipFlow = dynamic(() => import('./_TipFlow').then((m) => m.TipFlow), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-10">
      <CircleNotch className="h-5 w-5 animate-spin text-[#909090]" />
    </div>
  ),
})

// eslint-disable-next-line @next/next/no-img-element
function TokenLogo({ token, size = 11 }: { token: string; size?: number }) {
  const logos: Record<string, string> = {
    SOL:  'https://media.solana-cdn.com/image/width=100/https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
    USDC: 'https://media.solana-cdn.com/image/width=100/https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    USDT: 'https://media.solana-cdn.com/image/width=100/https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  }
  const src = logos[token]
  if (!src) return null
  return <img src={src} alt={token} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
}

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
        <button onClick={() => router.push('/')} className="text-sm font-semibold text-[#0F1702] underline-offset-2 hover:underline">
          Go home
        </button>
      </div>
    )
  }

  if (!walletAddress) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-white px-6" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAFAFA] border border-[#EBEBEB]">
          <Coins className="h-7 w-7 text-[#C0C0C0]" />
        </div>
        <p className="text-sm font-medium text-[#0F1702]">
          @{username} hasn&apos;t connected a wallet yet.
        </p>
        <button onClick={() => router.push(`/${username}`)} className="text-sm text-[#909090] underline-offset-2 hover:underline hover:text-[#0F1702] transition-colors">
          Back to profile
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mx-auto max-w-[400px] px-4 py-12">
        <button
          onClick={() => router.push(`/${username}`)}
          className="mb-8 flex items-center gap-1.5 text-sm text-[#909090] transition-colors hover:text-[#0F1702]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to @{username}
        </button>

        <div
          className="overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5"
        >
          {/* Header — matches TipModal */}
          <div className="flex items-start justify-between border-b border-[#F0F0F0] px-5 py-4">
            <div>
              <p className="text-[15px] font-semibold text-[#0F1702]">Send to {ownerName}</p>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-[#C0C0C0]">
                <TokenLogo token="SOL" size={11} />
                <span>SOL</span>
                <span>·</span>
                <TokenLogo token="USDC" size={11} />
                <span>USDC</span>
                <span>·</span>
                <TokenLogo token="USDT" size={11} />
                <span>USDT via Solana</span>
              </div>
            </div>
          </div>

          <TipFlow
            ownerName={ownerName}
            walletAddress={walletAddress}
            username={username}
            onDone={() => router.push(`/${username}`)}
          />
        </div>
      </div>
    </div>
  )
}
