# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (port 3000)
npm run build    # production build
npm run lint     # eslint
npm test         # jest unit tests
npm test -- --testPathPattern=auth   # run a single test file
npm test -- --no-coverage            # skip coverage report
```

Tests live in `__tests__/`. Jest config: `jest.config.ts`. Currently covers: auth/password validation, username validation, block container resolution, OG image extraction.

## Architecture

Single Next.js 16 app (App Router) — no monorepo. Everything lives at the root.

### Request flow

```
Browser → proxy.ts → App Router page or API route → Supabase
```

`proxy.ts` is Next.js 16's replacement for `middleware.ts`. It refreshes the Supabase session on every request and handles all route guards:
- `/onboarding`, `/{username}/edit` — redirect to `/login` if unauthenticated
- `/`, `/login`, `/signup` — redirect authenticated users to `/{username}/edit` (queries `users` table for username, falls back to `/onboarding`)
- `/admin/*` — restricted to emails listed in `ADMIN_EMAILS` env var; non-admins redirected to `/`

### Auth

Supabase Auth with Google OAuth + email/password. Two client factories in `lib/supabase/`:
- `client.ts` — `createBrowserClient` (use in `'use client'` components)
- `server.ts` — `createServerClient` with cookies (use in Server Components, API routes, `proxy.ts`), plus `createAdminClient()` which uses the service role key with no cookies — bypasses all RLS

After OAuth the browser hits `/api/auth/callback` → checks if user has a profile → redirects to `/onboarding` (new users) or `/{username}/edit` (existing users).

**Signup page** (`app/(auth)/signup/page.tsx`):
- Password requirements validation: 8+ characters, uppercase letter, number, special character (!@#$%^&*), no common passwords
- Password visibility toggle (eye icon) for password and confirm password fields
- Immediate redirect to `/onboarding` after successful signup (confirmation email still sent via `emailRedirectTo` option)

### Data layer

All data lives in Supabase Postgres. Schema in `supabase/migrations/`. Always apply new migrations via the **Supabase dashboard SQL editor** — the Management API token has been unreliable.

Tables: `users`, `links`, `achievements`, `affiliations`, `wallets`, `documents`, `embeddings` (pgvector), `analytics_events`, `blocks`, `sections`.

Key columns:
- `users.featured_affiliation_id UUID` references `affiliations(id) ON DELETE SET NULL` — controls which verified affiliation badge shows publicly. Migration: `supabase/migrations/003_featured_affiliation.sql`.
- `users.avatar_position JSONB` — stores avatar image position ({x, y} percentages). Migration: `supabase/migrations/006_avatar_position.sql`.

Storage buckets: `avatars` (public), `documents` (public). All storage uploads must use `createAdminClient()` — RLS blocks the anon/user client from inserting into `storage.objects`.

### Affiliation verification flow

1. User adds affiliation on `/{username}/edit` → logo is required, stored `verified = false`, shown with amber "Pending" pill
2. Admin visits `/admin/affiliations` → approves → `verified = true`
3. Only `verified` affiliations appear on the public profile or can be set as the featured badge
4. `PATCH /api/profile` handles `featured_affiliation_id`; falls back gracefully if the column doesn't exist yet (error code `42703`)

### CV / document ingestion

Two ingestion paths, both store to `documents` table with `parsed_text` for AI context:
- **File upload** (`POST /api/cv`): PDF parsed with `pdf-parse@1.1.1`, DOCX with `mammoth`. Both loaded via `createRequire(import.meta.url)` to force CJS — Turbopack's ESM wrapper breaks default imports for these packages. Both listed in `next.config.ts` `serverExternalPackages`.
- **URL import** (`POST /api/cv/url`): fetches the page, strips HTML, sends raw text to Groq to extract structured CV sections.

### AI chat

`/api/ai/chat` builds context from the DB and the most recent `documents.parsed_text`, then streams from **Groq** via the OpenAI-compatible SDK (`lib/ai/deepseek.ts`, model `llama-3.3-70b-versatile`). Requires `GROQ_API_KEY`. `generateEmbedding()` always returns `null` (no embedding model) — vector search is skipped and CV text is included directly in the system prompt instead.

### Analytics

Events tracked via `POST /api/analytics` — captures IP, resolves to country via `ip-api.com` (free, 45 req/min), stores in `metadata` JSONB. On Vercel, uses `x-vercel-ip-country` header instead. `GET /api/analytics` accepts `period` param (`1h|24h|7d|30d|90d`), returns time-bucketed chart data, per-event-type counts, and top-10 country breakdown.

### Solana / tipping

`TipModal` (`components/profile/TipModal.tsx`) and `/{username}/tip` both use the full Solana wallet adapter — tipper connects their own wallet and sends SOL/USDC/USDT. Receiver's address is shown read-only. Both wrap `ConnectionProvider` + `WalletProvider` + `WalletModalProvider` internally. `TipModal` is dynamically imported with `ssr: false` in `ProfileHeader`. The tip page imports `_TipFlow.tsx` (in the same route folder) the same way. Any component importing `@solana/wallet-adapter-react-ui` **must** use `dynamic(..., { ssr: false })`.

**Tip wallet** (`components/editor/WalletConnectSection.tsx`): Users can connect via wallet adapter (Phantom, Solflare) or paste their Solana address manually. Address format is validated (base58, 32-44 chars). Wallet address saved to `wallets` table with `network: 'solana'`.

### Bento blocks + sections

The "Me" tab on the edit page is a bento grid of content blocks. Each block has a `type` (`note`, `link`, `spotify`, `youtube`, `image`), a `content` JSONB, a `span` (1 or 2 columns), and an optional `section_id`.

- **Free blocks** (`section_id = null`) render above sections.
- **Sections** (`sections` table) are named groups that contain blocks. Deleting a section sets `section_id = null` on its blocks via `ON DELETE SET NULL`.
- `BlocksEditor` (`components/blocks/BentoGrid.tsx`) handles all drag-and-drop using `@dnd-kit/core` + `@dnd-kit/sortable`. It maintains a local `containers` state (`Record<string, string[]>` — container key → ordered block IDs) for smooth drag. Container keys are `'free'` or the section UUID.
- Sections are collapsible (click chevron to collapse/expand when empty).
- Drag smoothness improved with 15px activation distance and spring animations.
- `EmptyDropZone` uses `useDroppable` (not `useSortable`) with id `droppable-${sectionId}`. `resolveContainer()` maps any over-target ID (block ID, container key, or `droppable-*`) to a container key.
- Link blocks fetch OG image at save time (`fetchOgImage()` in `/api/blocks`). Fallback on the client: Google Favicon API.
- `follower_count` on `links` is not auto-fetched (feature removed). The column exists in the schema but is not populated.

### Onboarding flow

`app/(onboarding)/onboarding/page.tsx` guides new users through profile setup:

**Step 1 - Username**: Choose a unique username (validated: 3-30 chars, lowercase alphanumeric + underscores, checked against DB)

**Step 2 - Profile**: Set display name, bio (300 char limit), and location (optional)

**Step 3 - Links**: Select up to 5 social platforms from a predefined list (X, Instagram, LinkedIn, GitHub, YouTube, TikTok, Facebook, Snapchat, Pinterest, Medium, Website). Each platform has URL validation via regex patterns that run on blur. Invalid URLs show error messages and disable the Continue button.

**Step 4 - Avatar**: Optional profile photo upload (JPEG, PNG, WebP, GIF, max 5MB). After upload, user can drag to reposition the image within the frame. Position is saved to `users.avatar_position` JSONB column.

**Platform URL validation patterns** (enforced on blur in Step 3):
| Platform | Pattern |
|----------|---------|
| X/Twitter | `x.com/*`, `twitter.com/*` |
| Instagram | `instagram.com/*` |
| LinkedIn | `linkedin.com/in/*`, `linkedin.com/company/*` |
| GitHub | `github.com/*` |
| YouTube | `youtube.com/*`, `youtu.be/*` |
| TikTok | `tiktok.com/*` |
| Facebook | `facebook.com/*` |
| Snapchat | `snapchat.com/*` |
| Pinterest | `pinterest.com/*` |
| Medium | `medium.com/*` |
| Website | Any valid URL (no validation) |

### Bento note blocks

Note blocks in the bento grid have enhanced styling and are editable:
- Sticky note appearance with subtle shadow
- Slight rotation (-1deg) for organic look
- Click to edit: text, font family, and background color
- **Live preview mode**: When editing, shows a live preview of the note with current color/font applied above the edit controls (Option A - controls inside the note)
- Font families: Space Grotesk (sans-serif), Georgia (serif), Architects Daughter (cursive), Geist Mono (monospace)
- Background color (8 preset colors)
- Username displayed below each note (- {username})

**Important:** The `onUpdate` prop must flow through: `BlocksEditor` → `SortableBlockItem` → `BlockRenderer` → `NoteBlock`. The `SortableBlockItem` component must pass `onUpdate` to `BlockRenderer` for editing to work.

### useProfile hook

`hooks/useProfile.ts` is the single source of truth for all profile mutations on the edit page. Uses optimistic updates with snapshot/revert: apply locally → call API → revert on failure. Covers: profile fields, links (with reorder), achievements, affiliations (add/update/delete), blocks (add/delete/reorder), sections (add/update/delete/reorder).

### Page → component ownership

- `/{username}` (Server Component) — fetches all profile data server-side (including `blocks` and `sections`) via `getProfileData`, passes to client components
- `ProfileHeader` (client) — avatar, name, featured affiliation badge (only if `verified`), AI chat sidebar, tip modal
- `/{username}/edit` (client) — all hooks declared before any conditional returns (Rules of Hooks). Uses `useProfile` for all mutations. Layout structure:
  - Toolbar at top (Edit mode indicator, theme toggle, preview link, settings)
  - Common content wrapper (`flex flex-col gap-4`) containing profile section and tab content
  - Profile section: avatar + actions row, name + affiliation badges + handle, bio, location with MapPin icon, social links
  - Tab switcher with rounded-full style
  - Tab content: BlocksEditor, Affiliations, CV/Resume, Wallet sections
  - Floating stats bar at bottom
- `/admin/affiliations` (client) — admin-only review page; fetches via `/api/admin/affiliations` which uses `users!affiliations_user_id_fkey` join hint to resolve the ambiguous FK

### Key conventions

- `@/*` path alias maps to the repo root
- `cn()` from `lib/utils.ts` for conditional Tailwind classes
- All API routes authenticate via `supabase.auth.getUser()` — never trust client-provided user IDs
- Admin API routes additionally check `isAdmin(user.email)` against `ADMIN_EMAILS` env var
- `types/index.ts` holds all shared TypeScript interfaces; keep in sync with DB schema
- Shadcn components go in `components/ui/`

### Environment variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `ADMIN_EMAILS`.
Optional: `NEXT_PUBLIC_SOLANA_NETWORK` (defaults to devnet), `NEXT_PUBLIC_SOLANA_RPC_URL`.
