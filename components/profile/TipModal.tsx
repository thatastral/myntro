'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, Copy, Check, CircleNotch, Warning, ArrowUpRight } from '@phosphor-icons/react'
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'
import {
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import {
  getSupportedWallets,
  SOLANA_ENDPOINT,
  SOLANA_WS_ENDPOINT,
  TOKEN_MINTS,
  TOKEN_DECIMALS,
  LAMPORTS_PER_SOL,
  type SupportedToken,
} from '@/lib/solana/wallet'

const TOKENS: SupportedToken[] = ['SOL', 'USDC', 'USDT']

const PRESETS: Record<SupportedToken, number[]> = {
  SOL:  [0.1, 0.5, 1, 5],
  USDC: [1, 5, 10, 25],
  USDT: [1, 5, 10, 25],
}

const TOKEN_LOGOS: Record<string, string> = {
  SOL:  'https://media.solana-cdn.com/image/width=100/https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
  USDC: 'https://media.solana-cdn.com/image/width=100/https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  USDT: 'https://media.solana-cdn.com/image/width=100/https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
}

function TokenLogo({ token, size = 14 }: { token: string; size?: number }) {
  const src = TOKEN_LOGOS[token]
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={token}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  )
}

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

interface TipInnerProps {
  ownerName: string
  walletAddress: string
  username: string
  onClose: () => void
}

function TipInner({ ownerName, walletAddress, username, onClose }: TipInnerProps) {
  const { connection } = useConnection()
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet()

const [token, setToken] = useState<SupportedToken>('SOL')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [txAmount, setTxAmount] = useState('')
  const [txToken, setTxToken] = useState<SupportedToken>('SOL')
  const [txSender, setTxSender] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [balances, setBalances] = useState<Record<SupportedToken, number | null>>({ SOL: null, USDC: null, USDT: null })
  const [loadingBalances, setLoadingBalances] = useState(false)

  useEffect(() => {
    if (!publicKey || !connected) { setBalances({ SOL: null, USDC: null, USDT: null }); return }

    async function fetchBalances() {
      setLoadingBalances(true)
      try {
        const lamports = await connection.getBalance(publicKey!)
        const solBal = lamports / LAMPORTS_PER_SOL

        let usdcBal = 0
        try {
          const usdcATA = await getAssociatedTokenAddress(new PublicKey(TOKEN_MINTS.USDC), publicKey!)
          const usdcAcc = await getAccount(connection, usdcATA)
          usdcBal = Number(usdcAcc.amount) / Math.pow(10, TOKEN_DECIMALS.USDC)
        } catch { /* no account = 0 */ }

        let usdtBal = 0
        try {
          const usdtATA = await getAssociatedTokenAddress(new PublicKey(TOKEN_MINTS.USDT), publicKey!)
          const usdtAcc = await getAccount(connection, usdtATA)
          usdtBal = Number(usdtAcc.amount) / Math.pow(10, TOKEN_DECIMALS.USDT)
        } catch { /* no account = 0 */ }

        setBalances({ SOL: solBal, USDC: usdcBal, USDT: usdtBal })
      } catch {
        // silently fail
      } finally {
        setLoadingBalances(false)
      }
    }

    fetchBalances()
  }, [publicKey, connected, connection])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [walletAddress])

  const handleMax = useCallback(() => {
    if (token === 'SOL') {
      const max = Math.max(0, (balances.SOL ?? 0) - 0.000005)
      setAmount(max.toFixed(4))
    } else {
      const bal = balances[token]
      if (bal !== null) setAmount(bal.toFixed(2))
    }
  }, [token, balances])

  const handleSwitchToken = (t: SupportedToken) => {
    setToken(t)
    setAmount('')
    setError(null)
  }

  const handleSend = useCallback(async () => {
    if (!publicKey) { setError('Wallet not connected — please reconnect.'); return }
    if (!amount) { setError('Please enter an amount.'); return }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) { setError('Please enter a valid amount.'); return }

    const bal = balances[token]
    if (bal !== null && numAmount > bal) {
      const balStr = token === 'SOL' ? bal.toFixed(4) : bal.toFixed(2)
      setError(`Insufficient balance. You have ${balStr} ${token}.`)
      return
    }

    setSending(true)
    setError(null)

    try {
      const receiver = new PublicKey(walletAddress)
      const transaction = new Transaction()

      if (token === 'SOL') {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: receiver,
            lamports: Math.round(numAmount * LAMPORTS_PER_SOL),
          }),
        )
      } else {
        const mint = new PublicKey(TOKEN_MINTS[token])
        const fromATA = await getAssociatedTokenAddress(mint, publicKey)
        const toATA = await getAssociatedTokenAddress(mint, receiver)

        try {
          await getAccount(connection, toATA)
        } catch {
          transaction.add(
            createAssociatedTokenAccountInstruction(publicKey, toATA, receiver, mint),
          )
        }

        transaction.add(
          createTransferInstruction(
            fromATA,
            toATA,
            publicKey,
            BigInt(Math.round(numAmount * Math.pow(10, TOKEN_DECIMALS[token]))),
          ),
        )
      }

      // Priority fee — increases chance of inclusion in the next block
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      )

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      let sig: string
      if (signTransaction) {
        // Preferred: sign → send raw (avoids StandardWalletAdapter chain-detection issue with custom RPC URLs)
        const signed = await signTransaction(transaction)
        sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: true,
          preflightCommitment: 'confirmed',
          maxRetries: 5,
        })
      } else {
        sig = await sendTransaction(transaction, connection, { skipPreflight: true, preflightCommitment: 'confirmed' })
      }

      // Log tip + trigger email notification (fire-and-forget — don't block success screen)
      fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          sender_wallet: publicKey!.toString(),
          amount: numAmount,
          token,
          tx_signature: sig,
        }),
      }).catch(() => {})

      // Confirm in background — don't block the user on this
      connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
        .catch(() => { /* best-effort; user can verify on Solscan */ })

      setTxSender(publicKey.toString())
      setTxAmount(amount)
      setTxToken(token)
      setTxSig(sig)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      setError(msg.includes('rejected') ? 'Transaction cancelled.' : msg)
    } finally {
      setSending(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, walletAddress, token, amount, connection, sendTransaction, signTransaction, balances])

  const balLabel = (t: SupportedToken) => {
    const b = balances[t]
    if (b === null) return loadingBalances ? '…' : null
    return t === 'SOL' ? b.toFixed(4) : b.toFixed(2)
  }

  const numAmount = parseFloat(amount)
  const hasValidAmount = !isNaN(numAmount) && numAmount > 0

  // ── Success screen ──────────────────────────────────────────────────
  if (txSig) {
    return (
      <div className="flex flex-col px-5 py-6">
        <style>{`
          @keyframes tipScaleIn {
            from { opacity: 0; transform: scale(0.5); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes tipSlideUp {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Token logo hero */}
        <div className="flex flex-col items-center gap-3 pb-5">
          <div
            className="rounded-full ring-4 ring-[#8EE600]/25 ring-offset-2 ring-offset-white"
            style={{ animation: 'tipScaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <TokenLogo token={txToken} size={52} />
          </div>
          <div
            className="text-center"
            style={{ animation: 'tipSlideUp 0.35s 0.18s ease-out both' }}
          >
            <p className="text-[28px] font-bold leading-none text-[#0F1702]">
              {txAmount} {txToken}
            </p>
            <p className="mt-1.5 text-sm text-[#909090]">Transaction sent</p>
          </div>
        </div>

        {/* Receipt divider */}
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#EBEBEB]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C8C8C8]">
            Receipt
          </span>
          <div className="h-px flex-1 bg-[#EBEBEB]" />
        </div>

        {/* Receipt card */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-[#F0F0F0] bg-[#F9F9F7] divide-y divide-[#F0F0F0]">
          {[
            { label: 'From', value: truncate(txSender) },
            { label: 'To',   value: truncate(walletAddress) },
            { label: 'Token', value: `${txToken} via Solana` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[#B8B8B8]">{label}</span>
              <span className="font-mono text-xs font-medium text-[#333]">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-[#B8B8B8]">Status</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6BBF00]" />
              <span className="text-xs font-semibold text-[#3A6B00]">Submitted</span>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2">
          <a
            href={`https://solscan.io/tx/${txSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#E8E8E8] py-3 text-xs font-semibold text-[#555] transition-colors hover:bg-[#F5F5F5] active:scale-[0.98]"
          >
            Solscan <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-3 text-xs font-semibold text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #0F1702 0%, #1E3A04 100%)' }}
          >
            Done →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-4 pb-5">

      {/* Sender row (connected wallet) */}
      {connected && publicKey && (
        <div className="mx-5 flex items-center gap-2 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-2.5">
          <span className="text-xs text-[#C0C0C0]">From</span>
          <span className="flex-1 font-mono text-sm font-medium text-[#0F1702]">
            {truncate(publicKey.toString())}
          </span>
        </div>
      )}

      {/* Recipient row */}
      <div className="mx-5 flex items-center gap-2 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-2.5">
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#C0C0C0]" />
        <span className="flex-1 font-mono text-sm font-medium text-[#0F1702]">
          {truncate(walletAddress)}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#909090] transition-colors hover:bg-[#F0F0F0]"
        >
          {copied
            ? <><Check className="h-3.5 w-3.5 text-[#4A7A00]" /><span className="text-[#4A7A00]">Copied</span></>
            : <><Copy className="h-3.5 w-3.5" />Copy</>
          }
        </button>
      </div>

      {/* Amount hero */}
      <div
        className="mx-5 rounded-2xl px-5 py-5"
        style={{ backgroundColor: '#F7F7F5', opacity: connected ? 1 : 0.5, pointerEvents: connected ? 'auto' : 'none' }}
      >
        {/* Token logo + ticker + inline switcher */}
        <div className="flex items-center gap-2">
          <TokenLogo token={token} size={28} />
          <span className="text-sm font-bold text-[#0F1702]">{token}</span>
          <span className="text-[#D0D0D0]">·</span>
          <div className="flex items-center gap-1">
            {TOKENS.map((t) => {
              const isActive = token === t
              const bal = balLabel(t)
              return (
                <button
                  key={t}
                  onClick={() => handleSwitchToken(t)}
                  className={`flex flex-col items-center rounded-full px-2.5 py-0.5 transition-all duration-150 ${
                    isActive
                      ? 'bg-[#0F1702] text-white shadow-sm'
                      : 'bg-[#EBEBEB] text-[#909090] hover:bg-[#E0E0E0]'
                  }`}
                >
                  <span className="text-[11px] font-semibold leading-tight">{t}</span>
                  {!isActive && bal && (
                    <span className="text-[9px] leading-tight text-[#B0B0B0]">{bal}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Big amount input */}
        <div
          className="my-3 border-b-2 transition-all duration-150"
          style={{ borderColor: hasValidAmount ? '#8EE600' : 'transparent' }}
        >
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent pb-1 text-center text-5xl font-bold text-[#0F1702] outline-none placeholder:text-[#E0E0E0]"
            style={{ appearance: 'textfield' }}
          />
        </div>

        {/* Balance + MAX */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#909090]">
            Balance:{' '}
            {balances[token] === null
              ? (loadingBalances ? '…' : '—')
              : `${balLabel(token)} ${token}`}
          </span>
          {connected && balances[token] !== null && (
            <button
              onClick={handleMax}
              className="text-xs font-semibold text-[#0F1702] hover:underline"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* Connect prompt (disconnected) */}
      {!connected && (
        <div className="mx-5 flex flex-col items-center gap-3">
          <p className="text-sm text-[#909090]">Connect your wallet to continue</p>
          <WalletMultiButton
            style={{
              borderRadius: '16px',
              height: '46px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#0F1702',
              width: '100%',
              padding: '0 20px',
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
            }}
          />
        </div>
      )}

      {/* Quick amounts */}
      {connected && (
        <>
          <div className="flex gap-2 px-5">
            {PRESETS[token].map((p) => {
              const isSelected = amount === String(p)
              return (
                <button
                  key={p}
                  onClick={() => setAmount(isSelected ? '' : String(p))}
                  className={`flex-1 rounded-xl border py-1.5 text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? 'border-[#0F1702] bg-[#0F1702] text-white shadow-sm'
                      : 'border-[#EBEBEB] bg-white text-[#909090] hover:border-[#C0C0C0]'
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>

          {/* Network fee row */}
          <div className="flex items-center justify-between px-5 text-xs text-[#C0C0C0]">
            <div className="flex items-center gap-1">
              <TokenLogo token="SOL" size={11} />
              Solana Network
            </div>
            <span>Est. fee &lt; 0.000005 SOL</span>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <Warning className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSend}
            disabled={sending || !hasValidAmount}
            className="mx-5 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
            style={{
              background: sending || !hasValidAmount
                ? '#0F1702'
                : 'linear-gradient(135deg, #0F1702 0%, #1E3A04 100%)',
              boxShadow: hasValidAmount && !sending ? '0 4px 14px rgba(15,23,2,0.25)' : 'none',
            }}
          >
            {sending ? (
              <><CircleNotch className="h-4 w-4 animate-spin" />Confirming on Solana…</>
            ) : (
              <>
                Send {hasValidAmount ? `${amount} ${token}` : '–'}
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}

interface TipModalProps {
  open: boolean
  onClose: () => void
  ownerName: string
  walletAddress: string
  username: string
}

export function TipModal({ open, onClose, ownerName, walletAddress, username }: TipModalProps) {
  const wallets = getSupportedWallets()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5">
        {/* Header */}
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
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#C0C0C0] transition-colors hover:bg-[#F5F5F5] hover:text-[#0F1702]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ConnectionProvider endpoint={SOLANA_ENDPOINT} config={{ commitment: 'confirmed', wsEndpoint: SOLANA_WS_ENDPOINT }}>
          <WalletProvider wallets={wallets} autoConnect={false}>
            <WalletModalProvider>
              <TipInner
                ownerName={ownerName}
                walletAddress={walletAddress}
                username={username}
                onClose={onClose}
              />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </div>
    </div>
  )
}
