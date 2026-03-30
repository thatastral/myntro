export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { LinksSection } from '@/components/profile/LinksSection'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { EditFab } from '@/components/profile/EditFab'
import { JoinCTA } from '@/components/profile/JoinCTA'
import { ProfileTracker } from '@/components/profile/ProfileTracker'
import type { ProfileData } from '@/types'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

class ProfileNotFoundError extends Error {}

async function getProfileData(username: string): Promise<ProfileData | null> {
  const admin = createAdminClient()
  const supabase = await createClient()

  // Parallelize user lookup + session refresh — saves one round-trip
  const [userResult, { data: { user: authUser } }] = await Promise.all([
    admin.from('users').select('*').eq('username', username).single(),
    supabase.auth.getUser(),
  ])

  const { data: user, error } = userResult

  if (error) {
    // PGRST116 = no rows found — genuine 404
    if (error.code === 'PGRST116') throw new ProfileNotFoundError()
    // Any other error (network, timeout, etc.) — let error boundary handle it
    throw new Error(error.message || 'Failed to load profile')
  }

  if (!user) throw new ProfileNotFoundError()

  // Check visibility
  const isOwner = authUser?.id === user.id

  if (user.profile_visibility === 'private' && !isOwner) throw new ProfileNotFoundError()

  const [linksResult, achievementsResult, affiliationsResult, walletResult, blocksResult, sectionsResult] = await Promise.all([
    admin
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
    admin
      .from('achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false }),
    admin
      .from('affiliations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    admin
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('blocks')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
    admin
      .from('sections')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
  ])

  return {
    user,
    links: linksResult.data ?? [],
    achievements: achievementsResult.data ?? [],
    affiliations: affiliationsResult.data ?? [],
    wallet: walletResult.data ?? null,
    blocks: blocksResult.data ?? [],
    sections: sectionsResult.data ?? [],
  }
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const admin = createAdminClient()

  const { data: user } = await admin
    .from('users')
    .select('name, bio, avatar_url, profile_visibility')
    .eq('username', username)
    .single()

  if (!user || user.profile_visibility === 'private') {
    return { title: `@${username}` }
  }

  return {
    title: user.name ? `${user.name} (@${username})` : `@${username}`,
    description: user.bio ?? `Check out ${user.name || username}'s profile on Myntro.`,
    openGraph: {
      title: user.name ? `${user.name} (@${username})` : `@${username}`,
      description: user.bio ?? `Check out ${user.name || username}'s profile on Myntro.`,
      ...(user.avatar_url ? { images: [{ url: user.avatar_url }] } : {}),
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  let data: ProfileData | null = null
  try {
    data = await getProfileData(username)
  } catch (err) {
    if (err instanceof ProfileNotFoundError) notFound()
    throw err // propagate to error.tsx boundary
  }

  if (!data) notFound()

  const { user, links, achievements, affiliations, wallet, blocks, sections } = data

  return (
    <div className="min-h-[100dvh] bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="flex flex-col gap-8">
          {/* Profile header */}
          <ProfileHeader user={user} walletAddress={wallet?.wallet_address ?? null} affiliations={affiliations} />

          {/* Links */}
          {links.length > 0 && (
            <LinksSection links={links} username={user.username} />
          )}

          {/* Me / Achievements tabs with bento grid */}
          {(blocks.length > 0 || sections.length > 0 || achievements.length > 0) && (
            <ProfileTabs blocks={blocks} sections={sections} achievements={achievements} username={user.username} />
          )}

          {/* Join CTA — visitors only */}
          <JoinCTA username={user.username} userId={user.id} />
          <ProfileTracker username={user.username} />

          {/* Footer */}
          <div className="pb-4 pt-2 text-center">
            <a
              href="/"
              className="text-xs text-[#D0D0D0] transition-colors hover:text-[#909090]"
            >
              Powered by Myntro
            </a>
          </div>
        </div>
      </div>

      {/* Edit FAB — visible only to the page owner */}
      <EditFab username={user.username} userId={user.id} />
    </div>
  )
}
