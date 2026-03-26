import type { Link } from '@/types'
import {
  SiX, SiInstagram, SiGithub, SiYoutube, SiTiktok,
  SiFacebook, SiSnapchat, SiPinterest, SiMedium,
} from 'react-icons/si'
import { FaLinkedinIn } from 'react-icons/fa'
import { Globe } from 'lucide-react'

interface LinksSectionProps {
  links: Link[]
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
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
  website:   Globe,
}

function getPlatformIcon(iconId: string | null | undefined): React.ElementType {
  if (iconId) {
    const found = PLATFORM_ICONS[iconId.toLowerCase()]
    if (found) return found
  }
  return Globe
}

export function LinksSection({ links }: LinksSectionProps) {
  if (!links.length) return null

  return (
    <div className="flex items-center gap-1">
      {links.map((link) => {
        const Icon = getPlatformIcon(link.icon)
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.title}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <Icon size={16} />
          </a>
        )
      })}
    </div>
  )
}
