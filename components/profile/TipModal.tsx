'use client'

import { useState, useCallback } from 'react'
import { X, Lightning, Copy, Check, CircleNotch, Warning, CheckCircle } from '@phosphor-icons/react'
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
  TOKEN_MINTS,
  TOKEN_DECIMALS,
  LAMPORTS_PER_SOL,
  type SupportedToken,
} from '@/lib/solana/wallet'

const TOKENS: SupportedToken[] = ['SOL', 'USDC', 'USDT']

const PRESETS: Record<SupportedToken, number[]> = {
  SOL: [0.1, 0.5, 1, 5],
  USDC: [1, 5, 10, 25],
  USDT: [1, 5, 10, 25],
}

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface TipInnerProps {
  ownerName: string
  walletAddress: string
  onClose: () => void
}

function TipInner({ ownerName, walletAddress, onClose }: TipInnerProps) {
  const { connection } = useConnection()
  const { publicKey, connected, sendTransaction } = useWallet()

  const [token, setToken] = useState<SupportedToken>('SOL')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSig, setTxSig] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [walletAddress])

  const handleSend = useCallback(async () => {
    if (!publicKey || !amount) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

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

        // Create receiver ATA if it doesn't exist
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

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const sig = await sendTransaction(transaction, connection)
      setTxSig(sig)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed'
      setError(msg.includes('rejected') ? 'Transaction cancelled.' : msg)
    } finally {
      setSending(false)
    }
  }, [publicKey, walletAddress, token, amount, connection, sendTransaction])

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Receiver address — read-only */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sending to</p>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
          <span className="flex-1 font-mono text-sm font-medium text-gray-800 dark:text-gray-200">
            {truncate(walletAddress)}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600 dark:text-green-400">Copied</span></>
            ) : (
              <><Copy className="h-3.5 w-3.5" />Copy</>
            )}
          </button>
        </div>
      </div>

      {txSig ? (
        /* Success state */
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="h-10 w-10 text-green-500" />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Tip sent!
          </p>
          <a
            href={`https://solscan.io/tx/${txSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-500 underline-offset-2 hover:underline"
          >
            View on Solscan
          </a>
          <button
            onClick={onClose}
            className="mt-1 rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900"
          >
            Done
          </button>
        </div>
      ) : !connected ? (
        /* Connect wallet prompt */
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect your wallet to send a tip.
          </p>
          <WalletMultiButton
            style={{
              borderRadius: '12px',
              height: '40px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#18181b',
            }}
          />
        </div>
      ) : (
        /* Send form */
        <div className="flex flex-col gap-3">
          {/* Token selector */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            {TOKENS.map((t) => (
              <button
                key={t}
                onClick={() => { setToken(t); setAmount('') }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  token === t
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-50'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Preset amounts */}
          <div className="flex gap-2">
            {PRESETS[token].map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  amount === String(p)
                    ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600'
                }`}
              >
                {p} {token}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Custom amount"
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-50"
            />
            <span className="text-xs font-medium text-gray-400">{token}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/20">
              <Warning className="h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !amount || parseFloat(amount) <= 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {sending ? (
              <><CircleNotch className="h-4 w-4 animate-spin" />Sending…</>
            ) : (
              <><Lightning className="h-4 w-4" />Send {amount ? `${amount} ${token}` : 'tip'}</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

interface TipModalProps {
  open: boolean
  onClose: () => void
  ownerName: string
  walletAddress: string
}

export function TipModal({ open, onClose, ownerName, walletAddress }: TipModalProps) {
  const wallets = getSupportedWallets()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Lightning className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Tip {ownerName}</p>
              <p className="text-xs text-gray-400">SOL · USDC · USDT via Solana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ConnectionProvider endpoint={SOLANA_ENDPOINT}>
          <WalletProvider wallets={wallets} autoConnect={false}>
            <WalletModalProvider>
              <TipInner
                ownerName={ownerName}
                walletAddress={walletAddress}
                onClose={onClose}
              />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </div>
    </div>
  )
}
