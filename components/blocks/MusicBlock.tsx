import type { Block } from '@/types'

type Platform = 'spotify' | 'applemusic' | 'youtubemusic'

function detectPlatform(url: string): Platform | null {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('spotify.com')) return 'spotify'
    if (host.includes('music.apple.com')) return 'applemusic'
    if (host === 'music.youtube.com') return 'youtubemusic'
    return null
  } catch {
    return null
  }
}

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const platform = detectPlatform(url)

    if (platform === 'spotify') {
      const match = u.pathname.match(/\/(track|playlist|album|episode|show)\/([A-Za-z0-9]+)/)
      if (!match) return null
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`
    }

    if (platform === 'applemusic') {
      return url.replace('music.apple.com', 'embed.music.apple.com')
    }

    if (platform === 'youtubemusic') {
      // music.youtube.com/watch?v=ID → youtube.com/embed/ID
      const videoId = u.searchParams.get('v')
      if (!videoId) return null
      return `https://www.youtube.com/embed/${videoId}?autoplay=0`
    }

    return null
  } catch {
    return null
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  spotify: 'Spotify',
  applemusic: 'Apple Music',
  youtubemusic: 'YouTube Music',
}

export function MusicBlock({ block }: { block: Block }) {
  const rawUrl = block.content.url ?? ''
  const platform = detectPlatform(rawUrl)
  const embedUrl = toEmbedUrl(rawUrl)

  if (!embedUrl) {
    return (
      <div className="flex h-[152px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-xs text-gray-400 text-center px-4">
        {rawUrl
          ? 'Unsupported URL. Paste a link from Spotify, Apple Music, or YouTube Music.'
          : 'No music URL provided.'}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <iframe
        src={embedUrl}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={`${platform ? PLATFORM_LABELS[platform] : 'Music'} player`}
        className="block"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  )
}
