import { clusterApiUrl } from '@solana/web3.js'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'

export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet

export const SOLANA_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(SOLANA_NETWORK)

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
