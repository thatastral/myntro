import Link from 'next/link'
import { Lightning } from '@phosphor-icons/react'

interface TipButtonProps {
  username: string
}

export function TipButton({ username }: TipButtonProps) {
  return (
    <Link
      href={`/${username}/tip`}
      className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#EBEBEB] bg-white px-5 py-3.5 text-sm font-semibold text-[#0F1702] transition-all hover:border-[#C0C0C0] sm:w-auto"
    >
      <Lightning className="h-4 w-4 text-[#909090] transition-transform group-hover:scale-110" />
      Send a tip
      <span className="text-xs font-normal text-[#C0C0C0]">SOL · USDC · USDT</span>
    </Link>
  )
}
