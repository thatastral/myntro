'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wallet, CheckCircle, Loader2, Unlink, AlertCircle, Copy } from 'lucide-react'
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'
import { getSupportedWallets, SOLANA_ENDPOINT } from '@/lib/solana/wallet'

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

interface WalletConnectInnerProps {
  savedAddress: string | null
  onSaved: (address: string | null) => void
}

function WalletConnectInner({ savedAddress, onSaved }: WalletConnectInnerProps) {
  const { publicKey, connected, disconnect } = useWallet()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localSaved, setLocalSaved] = useState(savedAddress)
  const [inputMode, setInputMode] = useState<'connect' | 'manual'>('connect')
  const [manualAddress, setManualAddress] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!connected || !publicKey) return
    const address = publicKey.toBase58()
    if (address === localSaved) return

    setSaving(true)
    setError(null)

    fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address, network: 'solana' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setLocalSaved(address)
        onSaved(address)
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false))
  }, [connected, publicKey, localSaved, onSaved])

  const handleDisconnect = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await disconnect()
      const res = await fetch('/api/wallets', { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLocalSaved(null)
      onSaved(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect')
    } finally {
      setSaving(false)
    }
  }, [disconnect, onSaved])

  const handleSaveManualAddress = async () => {
    const trimmed = manualAddress.trim()
    if (!trimmed) return
    
    if (!SOLANA_ADDRESS_REGEX.test(trimmed)) {
      setManualError('Invalid Solana address format')
      return
    }

    setSaving(true)
    setManualError(null)
    setError(null)

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: trimmed, network: 'solana' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLocalSaved(trimmed)
      onSaved(trimmed)
      setManualAddress('')
      setInputMode('connect')
    } catch (e: unknown) {
      setManualError(e instanceof Error ? e.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyAddress = () => {
    if (localSaved) {
      navigator.clipboard.writeText(localSaved)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Tip wallet
        </h3>
      </div>

      <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
        Connect your Solana wallet or paste your address so visitors can tip you.
      </p>

      {localSaved ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Wallet saved
                </p>
                <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
                  {localSaved.slice(0, 6)}…{localSaved.slice(-4)}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleCopyAddress}
                title="Copy address"
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-gray-700 dark:hover:border-red-900 dark:hover:bg-red-950/20 dark:hover:text-red-400"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Unlink className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            You can update your wallet address at any time.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setInputMode('connect')}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                inputMode === 'connect'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Connect wallet
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                inputMode === 'manual'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Use address
            </button>
          </div>

          {inputMode === 'connect' ? (
            <WalletMultiButton
              style={{
                width: '100%',
                borderRadius: '12px',
                height: '44px',
                fontSize: '13px',
                fontWeight: 600,
                justifyContent: 'center',
                background: '#18181b',
              }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => { setManualAddress(e.target.value); setManualError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveManualAddress()}
                placeholder="Paste your Solana address"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50"
              />
              {manualError && (
                <p className="text-xs text-red-500">{manualError}</p>
              )}
              <button
                onClick={handleSaveManualAddress}
                disabled={saving || !manualAddress.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save address'
                )}
              </button>
            </div>
          )}

          {saving && inputMode === 'connect' && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving wallet…
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

interface WalletConnectSectionProps {
  savedAddress: string | null
  onSaved: (address: string | null) => void
}

export function WalletConnectSection({ savedAddress, onSaved }: WalletConnectSectionProps) {
  const wallets = getSupportedWallets()

  return (
    <ConnectionProvider endpoint={SOLANA_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletConnectInner savedAddress={savedAddress} onSaved={onSaved} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
