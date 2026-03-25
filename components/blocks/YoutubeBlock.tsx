import type { Block } from '@/types'

function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    let id: string | null = null

    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1)
    } else if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v')
      if (!id) {
        const match = u.pathname.match(/\/embed\/([^/?]+)/)
        if (match) id = match[1]
      }
    }
    return id ? `https://www.youtube.com/embed/${id}` : null
  } catch {
    return null
  }
}

export function YoutubeBlock({ block }: { block: Block }) {
  const embedUrl = toEmbedUrl(block.content.url ?? '')

  if (!embedUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900">
        Invalid YouTube URL
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl">
      <iframe
        src={embedUrl}
        className="aspect-video w-full pointer-events-none"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title="YouTube player"
      />
    </div>
  )
}
