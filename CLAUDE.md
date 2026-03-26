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
- **Maintenance mode**: when `MAINTENANCE_MODE=true` env var is set, all routes except `/waitlist` and `/api/waitlist` redirect to `/waitlist`. Checked first, before any auth logic. Omit or set to `false` in `.env.local` to keep full access during local dev; set `true` only in Vercel production env vars.
- `/onboarding`, `/{username}/edit` — redirect to `/login` if unauthenticated
- `/onboarding` (authenticated, no username yet) — checked against `beta_testers` table; non-beta users redirected to `/waitlist`. Admin emails (`ADMIN_EMAILS`) always bypass.
- `/`, `/login`, `/signup` — redirect authenticated users to `/{username}/edit` (queries `users` table for username, falls back to `/onboarding`)
- `/admin/*` — restricted to emails listed in `ADMIN_EMAILS` env var; non-admins redirected to `/`

**Critical:** `getUserProfilePath` in `proxy.ts` uses the **service role key** (not the anon key) to query the `users` table. The anon key respects RLS and can fail to see user rows when called from middleware, causing authenticated users to be wrongly redirected to `/onboarding`. Always use `createSupabaseClient(URL, SERVICE_ROLE_KEY)` for this lookup.

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

Tables: `users`, `links`, `achievements`, `affiliations`, `wallets`, `documents`, `embeddings` (pgvector), `analytics_events`, `blocks`, `sections`, `waitlist`, `beta_testers`.

**`beta_testers`** (`supabase/migrations/008_beta_testers.sql`): Curated list of emails allowed to reach `/onboarding` during private beta. RLS enabled, no public access — managed via service role key only. Separate from `waitlist` (which is public username reservations). Add testers via SQL: `INSERT INTO beta_testers (email, note) VALUES ('...', '...') ON CONFLICT DO NOTHING`.

Key columns:
- `users.featured_affiliation_id UUID` references `affiliations(id) ON DELETE SET NULL` — controls which verified affiliation badge shows publicly. Migration: `supabase/migrations/003_featured_affiliation.sql`.
- `users.avatar_position JSONB` — stores avatar image position ({x, y} percentages). Migration: `supabase/migrations/006_avatar_position.sql`.

Storage buckets: `avatars` (public), `documents` (public). All storage uploads must use `createAdminClient()` — RLS blocks the anon/user client from inserting into `storage.objects`.

**Username upsert pattern** (`app/api/username/route.ts`): Always use `createAdminClient()` with `onConflict: 'id'` for upserting into `users`. Before upserting, delete any orphaned rows with the same email but a different `id` — these arise from test sessions and cause unique constraint violations (error code `23505`) even when the count check returns 0.

**`'use client'` requirement**: Any component that imports from `@phosphor-icons/react` (or other client-only packages) and is directly imported by a Server Component **must** have `'use client'` at the top. Missing this causes `createContext is not a function` at runtime. Affected: `LinksSection.tsx`, `AIChatWidget.tsx`, etc.

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

**AI chat sidebar** (`components/profile/AIChatWidget.tsx`): Floating panel, fixed 16px gap from top/right/bottom (`top:16, right:16, bottom:16`), `borderRadius:20`, slide-in from right. Contains `MyntroMark` (inline SVG logo mark) and `MyntroAvatar` (self-contained: dark green `#0F1702` bg + `MyntroMark`). Uses `useId()` for unique SVG gradient/clip IDs so multiple avatars can render on the same page without ID collisions. Send button uses the brand green gradient. Any update to this component must keep `MyntroMark` and `MyntroAvatar` self-contained within the file.

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

### Waitlist

Pre-launch username reservation at `app/waitlist/page.tsx`:
- Debounced real-time username availability check via `HEAD /api/waitlist?username=foo` (200 = available, 409 = taken)
- `GET /api/waitlist` returns `{ count }` of signups
- `POST /api/waitlist` validates email + username, checks both `users` and `waitlist` tables, inserts; handles `23505` duplicate gracefully
- `/api/username` availability check also queries the `waitlist` table to block reserved usernames — but excludes the current user's own email so a waitlisted user can claim their own reservation
- Migration: `supabase/migrations/007_waitlist.sql` — must be run manually in the Supabase dashboard SQL editor
- Table has RLS enabled; policy allows public inserts, no public reads (admin client used in API routes)
- Success screen card (`SuccessScreen` component): inline `<style>` keyframes (`cardIntro` fade-up on mount, `cardGlaze` sheen sweep at 0.7s delay), mouse-tracking 3D tilt via `onMouseMove` + `perspective(900px) rotateX/Y`. Outer wrapper handles tilt (no `overflow-hidden`); inner card has `overflow-hidden` for SVG border clipping.

### Onboarding flow

`app/(onboarding)/onboarding/page.tsx` guides new users through profile setup:

**Back to login from Step 1**: Calls `supabase.auth.signOut()` before `router.push('/login')` — navigating to `/login` while authenticated causes an infinite redirect loop (proxy redirects authenticated users away from `/login`).

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

### Homepage features section

`app/page.tsx` contains a `FeaturesSection` component with a `useInView` hook (IntersectionObserver, fires once) for scroll-triggered fade-up animations staggered per card. Four inline SVG illustration components (`IllustrationIdentity`, `IllustrationTipping`, `IllustrationAI`, `IllustrationBadges`) with CSS `@keyframes` animations embedded in `<style>` tags inside the SVG. The features section uses a light `#F7F7F5` background — keep it light-themed.

### Design system tokens

Colors: `#0F1702` (dark green/text), `#909090` (muted), `#C0C0C0` (placeholder/subtle), `#EBEBEB` (border), `#FAFAFA` (surface), `#8EE600` (brand accent), `#4A7A00` (darker green). Avoid Tailwind `gray-*`, `amber-*`, or one-off hex values not in this set. Primary CTA button style: `linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)` with `boxShadow: '0 3px 16px rgba(142,230,0,0.35)'`.

### Key conventions

- `@/*` path alias maps to the repo root
- `cn()` from `lib/utils.ts` for conditional Tailwind classes
- All API routes authenticate via `supabase.auth.getUser()` — never trust client-provided user IDs
- Admin API routes additionally check `isAdmin(user.email)` against `ADMIN_EMAILS` env var
- `types/index.ts` holds all shared TypeScript interfaces; keep in sync with DB schema
- Shadcn components go in `components/ui/`

### Environment variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `ADMIN_EMAILS`.
Optional: `NEXT_PUBLIC_SOLANA_NETWORK` (defaults to devnet), `NEXT_PUBLIC_SOLANA_RPC_URL`, `MAINTENANCE_MODE` (set to `true` in Vercel production only to redirect all traffic to `/waitlist`; omit in `.env.local`).
