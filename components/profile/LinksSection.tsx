'use client'

import { ArrowSquareOut, Globe, XLogo, GithubLogo, LinkedinLogo, YoutubeLogo, InstagramLogo, EnvelopeSimple } from '@phosphor-icons/react'
import type { Link } from '@/types'

interface LinksSectionProps {
  links: Link[]
}

export function LinksSection({ links }: LinksSectionProps) {
  if (!links.length) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#C0C0C0]">
        Links
      </h2>
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  )
}

function formatCount(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function LinkCard({ link }: { link: Link }) {
  const Icon = getLinkIcon(link.url, link.icon)
  const count = formatCount(link.follower_count)

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-[#EBEBEB] bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-[#C0C0C0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#909090]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <span className="text-sm font-medium text-[#182403]">{link.title}</span>
        {count && (
          <span className="text-xs text-[#C0C0C0]">{count} followers</span>
        )}
      </div>
      <ArrowSquareOut className="h-3.5 w-3.5 flex-shrink-0 text-[#D0D0D0] transition-colors group-hover:text-[#909090]" />
    </a>
  )
}

function getLinkIcon(url: string, iconOverride?: string | null) {
  if (iconOverride) {
    const iconMap: Record<string, typeof Globe> = {
      twitter: XLogo,
      x: XLogo,
      github: GithubLogo,
      linkedin: LinkedinLogo,
      youtube: YoutubeLogo,
      instagram: InstagramLogo,
      mail: EnvelopeSimple,
      globe: Globe,
    }
    const found = iconMap[iconOverride.toLowerCase()]
    if (found) return found
  }

  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return XLogo
    if (hostname.includes('github.com')) return GithubLogo
    if (hostname.includes('linkedin.com')) return LinkedinLogo
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return YoutubeLogo
    if (hostname.includes('instagram.com')) return InstagramLogo
    if (url.startsWith('mailto:')) return EnvelopeSimple
  } catch {
    // ignore invalid URLs
  }

  return Globe
}
