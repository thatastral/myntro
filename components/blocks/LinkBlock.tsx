import Image from 'next/image'
import { ArrowSquareOut } from '@phosphor-icons/react'
import type { Block } from '@/types'

export function LinkBlock({ block }: { block: Block }) {
  const { url, title, description, og_image } = block.content

  let hostname = ''
  try { hostname = new URL(url).hostname.replace('www.', '') } catch { hostname = url }

  // Fallback: Google Favicon API (always available)
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`
  const previewImage = og_image || null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white transition-all hover:border-[#D5D5D5] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]"
    >
      {/* Preview image */}
      <div className="relative w-full bg-[#F5F5F5]" style={{ paddingBottom: '52%' }}>
        {previewImage ? (
          <Image
            src={previewImage}
            alt={title || hostname}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 300px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconUrl} alt="" className="h-10 w-10 opacity-40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="text-sm font-semibold text-[#182403] line-clamp-2">
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
