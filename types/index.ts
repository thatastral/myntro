export interface User {
  id: string
  email: string
  username: string
  name: string
  bio: string | null
  avatar_url: string | null
  location: string | null
  profile_visibility: 'public' | 'private'
  featured_affiliation_id: string | null
  tips_enabled: boolean
  ai_enabled: boolean
  tour_seen: boolean
  created_at: string
}

export interface Link {
  id: string
  user_id: string
  title: string
  url: string
  icon: string | null
  display_order: number
  follower_count?: number | null
  created_at: string
}

export interface Achievement {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string | null
  link: string | null
  image_url: string | null
  created_at: string
}

export interface Affiliation {
  id: string
  user_id: string
  community_name: string
  role: string | null
  logo_url: string | null
  proof_link: string | null
  verified: boolean
  created_at: string
}

export interface Wallet {
  id: string
  user_id: string
  wallet_address: string
  network: string
  created_at: string
}

export interface Document {
  id: string
  user_id: string
  file_url: string
  parsed_text: string | null
  created_at: string
}

export interface Section {
  id: string
  user_id: string
  title: string
  display_order: number
  created_at: string
}

export type BlockType = 'note' | 'text' | 'link' | 'spotify' | 'music' | 'youtube' | 'image'

export interface NoteContent    { text: string; color: string; font_family?: string }
export interface TextContent    { text: string; bold?: string; italic?: string; size?: string; align?: string; font_family?: string }
export interface LinkContent    { url: string; title: string; description?: string; og_image?: string }
export interface SpotifyContent { url: string }
export interface YoutubeContent { url: string }
export interface ImageContent   { url: string; caption?: string; height?: string }

export interface Block {
  id: string
  user_id: string
  section_id: string | null
  type: BlockType
  content: Record<string, string>
  display_order: number
  span: 1 | 2
  created_at: string
}

export interface ProfileData {
  user: User
  links: Link[]
  achievements: Achievement[]
  affiliations: Affiliation[]
  wallet: Wallet | null
  blocks: Block[]
  sections: Section[]
}
