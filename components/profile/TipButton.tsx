import Link from 'next/link'
import { Zap } from 'lucide-react'

interface TipButtonProps {
  username: string
}

export function TipButton({ username }: TipButtonProps) {
  return (
    <Link
      href={`/${username}/tip`}
      className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:shadow-gray-900/50 sm:w-auto"
    >
      <Zap className="h-4 w-4 text-amber-500 transition-transform group-hover:scale-110" />
      Send a tip
      <span className="text-xs font-normal text-gray-400 dark:text-gray-500">SOL · USDC · USDT</span>
    </Link>
  )
}
