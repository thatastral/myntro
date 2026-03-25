import { ExternalLink, Globe, Twitter, Github, Linkedin, Youtube, Instagram, Mail } from 'lucide-react'
import type { Link } from '@/types'

interface LinksSectionProps {
  links: Link[]
}

export function LinksSection({ links }: LinksSectionProps) {
  if (!links.length) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{link.title}</span>
        {count && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{count} followers</span>
        )}
      </div>
      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-400 dark:text-gray-600 dark:group-hover:text-gray-500" />
    </a>
  )
}

function getLinkIcon(url: string, iconOverride?: string | null) {
  if (iconOverride) {
    const iconMap: Record<string, typeof Globe> = {
      twitter: Twitter,
      x: Twitter,
      github: Github,
      linkedin: Linkedin,
      youtube: Youtube,
      instagram: Instagram,
      mail: Mail,
      globe: Globe,
    }
    const found = iconMap[iconOverride.toLowerCase()]
    if (found) return found
  }

  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return Twitter
    if (hostname.includes('github.com')) return Github
    if (hostname.includes('linkedin.com')) return Linkedin
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return Youtube
    if (hostname.includes('instagram.com')) return Instagram
    if (url.startsWith('mailto:')) return Mail
  } catch {
    // ignore invalid URLs
  }

  return Globe
}
