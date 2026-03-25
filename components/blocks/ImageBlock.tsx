import Image from 'next/image'
import type { Block } from '@/types'

export function ImageBlock({ block }: { block: Block }) {
  const { url, caption } = block.content

  return (
    <div className="overflow-hidden rounded-2xl">
      <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
        <Image
          src={url}
          alt={caption || 'Image block'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 300px"
          unoptimized={url.startsWith('blob:')}
        />
      </div>
      {caption && (
        <p className="border-t border-gray-100 bg-white px-3 py-2 text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900">
          {caption}
        </p>
      )}
    </div>
  )
}
