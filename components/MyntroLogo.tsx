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
  const gradId = `logoGrad_${uid}`
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
          <linearGradient
            id={gradId}
            x1="27.4183"
            y1="-6.45572"
            x2="27.4183"
            y2="56.1765"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="#8EE600" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect width="54.8377" height="54.8377" fill="white" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M-0.000976562 14.8511C-0.000976562 6.57424 9.19728 1.61336 16.1134 6.16011L27.4183 13.592L38.7231 6.16011C45.6392 1.61337 54.8375 6.57426 54.8375 14.8511V40.0039C54.8375 45.7482 50.1809 50.4048 44.4366 50.4048H10.3999C4.65563 50.4048 -0.000976562 45.7482 -0.000976562 40.0039V14.8511Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M38.998 6.57745C45.5816 2.2498 54.3378 6.97224 54.3379 14.8509V40.0042C54.3377 45.4722 49.9045 49.9046 44.4365 49.9046H10.3994C4.93163 49.9044 0.499174 45.472 0.499023 40.0042V14.8509C0.499146 6.97211 9.25527 2.24945 15.8389 6.57745L27.1436 14.0101L27.418 14.1907L27.6934 14.0101L38.998 6.57745Z"
            stroke="black"
            strokeOpacity="0.02"
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
