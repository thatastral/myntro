'use client'

import { Globe } from '@phosphor-icons/react'
import {
  SiX, SiInstagram, SiGithub, SiYoutube, SiTiktok,
  SiFacebook, SiSnapchat, SiPinterest, SiMedium,
} from 'react-icons/si'
import { FaLinkedinIn } from 'react-icons/fa'
import type { Link } from '@/types'

const PLATFORM_ICON_MAP: Record<string, React.ElementType> = {
  x:         SiX,
  twitter:   SiX,
  instagram: SiInstagram,
  linkedin:  FaLinkedinIn,
  github:    SiGithub,
  youtube:   SiYoutube,
  tiktok:    SiTiktok,
  facebook:  SiFacebook,
  snapchat:  SiSnapchat,
  pinterest: SiPinterest,
  medium:    SiMedium,
}

function getPlatformIcon(link: Link): React.ElementType {
  if (link.icon) {
    const found = PLATFORM_ICON_MAP[link.icon.toLowerCase()]
    if (found) return found
  }
  try {
    const hostname = new URL(link.url).hostname.replace('www.', '')
    for (const [key, Icon] of Object.entries(PLATFORM_ICON_MAP)) {
      if (hostname.includes(key)) return Icon
    }
  } catch {
    // ignore
  }
  return Globe
}

function formatCount(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

interface LinksSectionProps {
  links: Link[]
}

export function LinksSection({ links }: LinksSectionProps) {
  if (!links.length) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {links.map((link) => {
        const Icon = getPlatformIcon(link)
        const count = formatCount(link.follower_count)
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.title}
            className="group flex items-center gap-1.5 rounded-lg border border-[#EBEBEB] px-2.5 py-1.5 text-[#909090] transition-all duration-150 hover:border-[#D5D5D5] hover:bg-[#FAFAFA] hover:text-[#0F1702]"
          >
            <Icon size={13} className="flex-shrink-0" />
            <span className="text-[11px] font-medium">{link.title}</span>
            {count && (
              <span className="text-[10px] text-[#C0C0C0] leading-none">{count}</span>
            )}
            <span className="sr-only">(opens in new tab)</span>
          </a>
        )
      })}
    </div>
  )
}
