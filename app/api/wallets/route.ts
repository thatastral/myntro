import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/wallets — save connected wallet address
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { wallet_address, network } = await request.json()

    if (!wallet_address || typeof wallet_address !== 'string') {
      return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 })
    }

    // Upsert — one wallet per user for now
    const { data, error } = await supabase
      .from('wallets')
      .upsert(
        {
          user_id: user.id,
          wallet_address,
          network: network ?? 'solana',
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (error) {
      // Fallback: delete existing and insert
      await supabase.from('wallets').delete().eq('user_id', user.id)
      const { data: inserted, error: insertError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id, wallet_address, network: network ?? 'solana' })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: 'Failed to save wallet' }, { status: 500 })
      }
      return NextResponse.json({ wallet: inserted })
    }

    return NextResponse.json({ wallet: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/wallets — disconnect wallet
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await supabase.from('wallets').delete().eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
