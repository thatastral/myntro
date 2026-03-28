import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#0F1702] outline-none transition-all duration-150',
          'placeholder:text-[#C0C0C0]',
          'border-[#EBEBEB] focus:border-[#8EE600]/50 focus:ring-1 focus:ring-[#8EE600]/20',
          'disabled:cursor-not-allowed disabled:opacity-40',
          error && 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200/40',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
