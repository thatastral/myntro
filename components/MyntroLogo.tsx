'use client'

import { useId } from 'react'

interface MyntroLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showBeta?: boolean
}

const SIZE_MAP = {
  sm: { icon: 20, textClass: 'text-sm', gap: 'gap-1.5' },
  md: { icon: 32, textClass: 'text-lg', gap: 'gap-2' },
  lg: { icon: 44, textClass: 'text-2xl', gap: 'gap-2.5' },
}

export function MyntroLogo({ size = 'md', showBeta = false }: MyntroLogoProps) {
  const uid = useId().replace(/:/g, '')
  const clipId = `logoClip_${uid}`
  const { icon, textClass, gap } = SIZE_MAP[size]

  return (
    <div className={`flex items-center ${gap}`}>
      {/* Official logo mark */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 55 55"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect width="54.8377" height="54.8377" fill="white" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M-0.000976562 14.8511C-0.000976562 6.57424 9.19728 1.61336 16.1134 6.16011L27.4183 13.592L38.7231 6.16011C45.6392 1.61337 54.8375 6.57426 54.8375 14.8511V40.0039C54.8375 45.7482 50.1809 50.4048 44.4366 50.4048H10.3999C4.65563 50.4048 -0.000976562 45.7482 -0.000976562 40.0039V14.8511Z"
            fill="#0F1702"
          />
        </g>
      </svg>

      {/* Wordmark */}
      <span
        className={`font-bold tracking-tight text-[#0F1702] ${textClass}`}
        style={{ fontFamily: 'var(--font-funnel-display), sans-serif' }}
      >
        Myntro
      </span>

      {/* Beta pill */}
      {showBeta && (
        <span
          className="rounded-full px-2 py-[3px] text-[10px] font-medium leading-none text-[#0F1702]"
          style={{ border: '0.35px solid #0F1702' }}
        >
          Beta
        </span>
      )}
    </div>
  )
}
