import Image from 'next/image'
import { ArrowSquareOut } from '@phosphor-icons/react'
import type { Block } from '@/types'

export function LinkBlock({ block }: { block: Block }) {
  const { url, title, description, og_image } = block.content

  let hostname = ''
  try { hostname = new URL(url).hostname.replace('www.', '') } catch { hostname = url }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
  const previewImage = og_image || `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=600&h=312`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white transition-all hover:border-[#C0C0C0]"
    >
      {/* Preview image */}
      <div className="relative w-full bg-[#FAFAFA]" style={{ paddingBottom: '52%' }}>
        <Image
          src={previewImage}
          alt={title || hostname}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 300px"
          unoptimized
          onError={(e) => {
            // If screenshot service fails, fall back to favicon
            const img = e.currentTarget as HTMLImageElement
            img.src = faviconUrl
            img.className = 'absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 opacity-40 object-contain'
            img.style.fill = 'none'
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="text-sm font-semibold text-[#0F1702] line-clamp-2">
            {title || hostname}
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-[#909090] line-clamp-1">{description}</p>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[#C0C0C0]">{hostname}</span>
          <ArrowSquareOut className="h-3.5 w-3.5 text-[#909090] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </a>
  )
}
