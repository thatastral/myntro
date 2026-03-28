import { NextRequest, NextResponse } from 'next/server'

const UPSTREAM_RPC = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com'

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
    headers: { 'Content-Type': 'application/json' },
  })
}
