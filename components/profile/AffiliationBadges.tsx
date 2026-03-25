import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import type { Affiliation } from '@/types'

interface AffiliationBadgesProps {
  affiliations: Affiliation[]
}

export function AffiliationBadges({ affiliations }: AffiliationBadgesProps) {
  if (!affiliations.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {affiliations.map((affiliation) => (
        <AffiliationBadge key={affiliation.id} affiliation={affiliation} />
      ))}
    </div>
  )
}

function AffiliationBadge({ affiliation }: { affiliation: Affiliation }) {
  const badge = (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm transition-all hover:border-gray-300 hover:shadow dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600">
      {/* Community logo */}
      {affiliation.logo_url ? (
        <div className="relative h-4 w-4 flex-shrink-0 overflow-hidden rounded-full">
          <Image
            src={affiliation.logo_url}
            alt={affiliation.community_name}
            fill
            className="object-cover"
            sizes="16px"
          />
        </div>
      ) : (
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[8px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {affiliation.community_name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + role */}
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {affiliation.community_name}
        {affiliation.role && (
          <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">
            · {affiliation.role}
          </span>
        )}
      </span>

      {/* Verified checkmark */}
      {affiliation.verified && (
        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" aria-label="Verified" />
      )}
    </div>
  )

  if (affiliation.proof_link) {
    return (
      <a
        href={affiliation.proof_link}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
      >
        {badge}
      </a>
    )
  }

  return badge
}
