import Image from 'next/image'
import { CheckCircle } from '@phosphor-icons/react'
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
    <div className="flex items-center gap-2 rounded-full border border-[#EBEBEB] bg-white px-3 py-1.5 shadow-sm transition-all hover:border-[#D0D0D0] hover:shadow">
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
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#EBEBEB] text-[8px] font-bold text-[#909090]">
          {affiliation.community_name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + role */}
      <span className="text-xs font-medium text-[#182403]">
        {affiliation.community_name}
        {affiliation.role && (
          <span className="ml-1 font-normal text-[#909090]">
            · {affiliation.role}
          </span>
        )}
      </span>

      {/* Verified checkmark */}
      {affiliation.verified && (
        <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[#909090]" aria-label="Verified" />
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
