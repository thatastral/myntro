import { NextRequest, NextResponse } from 'next/server'

const UPSTREAM_RPC = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com'

// Fallback endpoints tried in order when the primary is unavailable
const FALLBACK_RPCS = [
  'https://solana-mainnet.rpc.extrnode.com',
  'https://rpc.ankr.com/solana',
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, solana-client',
}

function rpcError(id: unknown, message: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code: -32603, message } },
    { status: 200, headers: CORS_HEADERS },
  )
}

async function tryFetch(url: string, body: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(8000),
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  let parsed: { id?: unknown } = {}
  try { parsed = JSON.parse(body) } catch { /* ignore */ }

  // Try primary, then fallbacks
  const endpoints = [UPSTREAM_RPC, ...FALLBACK_RPCS]
  for (const endpoint of endpoints) {
    try {
      const res = await tryFetch(endpoint, body)
      const data = await res.text()
      return new NextResponse(data, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    } catch {
      // Try next endpoint
    }
  }

  return rpcError(parsed.id ?? null, 'All RPC endpoints unavailable. Please try again.')
}
