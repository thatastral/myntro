import type { Block } from '@/types'

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('spotify.com')) return null
    // /track/ID, /playlist/ID, /album/ID, /episode/ID
    const match = u.pathname.match(/\/(track|playlist|album|episode|show)\/([A-Za-z0-9]+)/)
    if (!match) return null
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`
  } catch {
    return null
  }
}

export function SpotifyBlock({ block }: { block: Block }) {
  const embedUrl = toEmbedUrl(block.content.url ?? '')

  if (!embedUrl) {
    return (
      <div className="flex h-[152px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900">
        Invalid Spotify URL
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
        title="Spotify player"
        className="block"
      />
    </div>
  )
}
