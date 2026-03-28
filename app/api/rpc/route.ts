import { NextRequest, NextResponse } from 'next/server'

const UPSTREAM_RPC = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, solana-client',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const res = await fetch(UPSTREAM_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}
