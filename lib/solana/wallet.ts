import { clusterApiUrl } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'

export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
    ? WalletAdapterNetwork.Devnet
    : WalletAdapterNetwork.Mainnet

// Prefer an explicit RPC URL, but only if it looks like a real external endpoint
// (not a localhost URL that might have the wrong port in dev).
// Always fall back to the same-origin /api/rpc proxy so the server-side SOLANA_RPC_URL
// (Helius) is used regardless of the client host/port.
const _explicitRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
const _useExplicit = _explicitRpc && !_explicitRpc.includes('localhost') && !_explicitRpc.includes('127.0.0.1')

export const SOLANA_ENDPOINT: string =
  _useExplicit
    ? _explicitRpc!
    : (typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'https://api.mainnet-beta.solana.com')

// Always use the real Solana WebSocket endpoint for subscriptions (our HTTP proxy doesn't support WS)
export const SOLANA_WS_ENDPOINT =
  SOLANA_NETWORK === WalletAdapterNetwork.Mainnet
    ? 'wss://api.mainnet-beta.solana.com'
    : 'wss://api.devnet.solana.com'

export function getSupportedWallets() {
  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: SOLANA_NETWORK }),
  ]
}

// SPL token mint addresses on mainnet
export const TOKEN_MINTS = {
  SOL: 'native',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
} as const

export type SupportedToken = keyof typeof TOKEN_MINTS

export const TOKEN_DECIMALS: Record<SupportedToken, number> = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
}

export const LAMPORTS_PER_SOL = 1_000_000_000
