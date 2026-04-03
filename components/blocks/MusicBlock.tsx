import type { Block } from '@/types'

type Platform = 'spotify' | 'soundcloud' | 'applemusic' | 'tidal'

function detectPlatform(url: string): Platform | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')
    if (host.includes('spotify.com')) return 'spotify'
    if (host.includes('soundcloud.com')) return 'soundcloud'
    if (host.includes('music.apple.com')) return 'applemusic'
    if (host.includes('tidal.com')) return 'tidal'
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

    if (platform === 'soundcloud') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%238EE600&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`
    }

    if (platform === 'applemusic') {
      // Convert music.apple.com/... to embed.music.apple.com/...
      return url.replace('music.apple.com', 'embed.music.apple.com')
    }

    if (platform === 'tidal') {
      // https://tidal.com/browse/track/12345 → https://embed.tidal.com/tracks/12345
      const trackMatch = u.pathname.match(/\/browse\/(track|album|playlist)\/([A-Za-z0-9-]+)/)
      if (!trackMatch) return null
      const resourceMap: Record<string, string> = { track: 'tracks', album: 'albums', playlist: 'playlists' }
      return `https://embed.tidal.com/${resourceMap[trackMatch[1]] ?? trackMatch[1]}/${trackMatch[2]}`
    }

    return null
  } catch {
    return null
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  applemusic: 'Apple Music',
  tidal: 'Tidal',
}

export function MusicBlock({ block }: { block: Block }) {
  const rawUrl = block.content.url ?? ''
  const platform = detectPlatform(rawUrl)
  const embedUrl = toEmbedUrl(rawUrl)

  if (!embedUrl) {
    return (
      <div className="flex h-[152px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-xs text-gray-400">
        {rawUrl
          ? 'Unsupported music URL. Paste a link from Spotify, SoundCloud, Apple Music, or Tidal.'
          : 'No music URL provided.'}
      </div>
    )
  }

  const isSoundCloud = platform === 'soundcloud'

  return (
    <div className="overflow-hidden rounded-2xl">
      <iframe
        src={embedUrl}
        width="100%"
        height={isSoundCloud ? '120' : '152'}
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
