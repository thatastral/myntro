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
- `/forgot-password`, `/reset-password` — always passthrough even when authenticated
- `/admin/*` — restricted to emails listed in `ADMIN_EMAILS` env var; non-admins redirected to `/`

### Auth

Supabase Auth with Google OAuth + email/password. Two client factories in `lib/supabase/`:
- `client.ts` — `createBrowserClient` (use in `'use client'` components)
- `server.ts` — `createServerClient` with cookies (use in Server Components, API routes, `proxy.ts`), plus `createAdminClient()` which uses the service role key with no cookies — bypasses all RLS

After OAuth the browser hits `/api/auth/callback` → checks if user has a profile → redirects to `/onboarding` (new users) or `/{username}/edit` (existing users).

**Password recovery flow**: `app/(auth)/forgot-password/page.tsx` calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: /reset-password`. `app/(auth)/reset-password/page.tsx` calls `supabase.auth.getSession()` on mount to exchange the URL fragment token, then `supabase.auth.updateUser({ password })` on submit.

**Signup page** (`app/(auth)/signup/page.tsx`):
- Password requirements: 8+ chars, uppercase, number, special character (`!@#$%^&*`), no common passwords
- Immediate redirect to `/onboarding` after signup

### Data layer

All data lives in Supabase Postgres. Schema in `supabase/migrations/`. Always apply new migrations via the **Supabase dashboard SQL editor** — the Management API token has been unreliable.

Tables: `users`, `links`, `achievements`, `affiliations`, `wallets`, `documents`, `embeddings` (pgvector), `analytics_events`, `blocks`, `sections`.

Key columns:
- `users.featured_affiliation_id UUID` references `affiliations(id) ON DELETE SET NULL` — controls which verified affiliation badge shows publicly.
- `users.avatar_position JSONB` — stores avatar image position ({x, y} percentages).
- `achievements.scraped_content JSONB` — page content scraped from `link` URL at save time. Migration: `007_scraped_content.sql`.
- `affiliations.scraped_content JSONB` — page content scraped from `proof_link` at save time. Migration: `007_scraped_content.sql`.
- `blocks.content JSONB` — for `link` type blocks, includes `scraped_title`, `scraped_description`, `scraped_text` populated at save time via `lib/scrape.ts`.

Storage buckets: `avatars` (public), `documents` (public). All storage uploads must use `createAdminClient()` — RLS blocks the anon/user client from inserting into `storage.objects`.

### URL scraping

`lib/scrape.ts` — shared utility used by blocks, achievements, and affiliations routes. `scrapeUrl(url)` returns `{ title, description, og_image, text }`. Strips `<script>`, `<style>`, `<head>` before extracting body text (capped at 3,000 chars). All scraping happens **at save time** (not at chat or page load time) and is stored in the DB.

**Backfill**: `POST /api/blocks/rescrape` — re-scrapes all existing link blocks for the authenticated user. Accessible via the "Refresh AI context" button in the Settings modal.

### Affiliation verification flow

1. User adds affiliation → stored `verified = false`, shown with amber "Pending" pill
2. Admin visits `/admin/affiliations` → approves → `verified = true`
3. Only `verified` affiliations appear on the public profile or can be set as the featured badge
4. `PATCH /api/profile` handles `featured_affiliation_id`; falls back gracefully if the column doesn't exist (error code `42703`)

### CV / document ingestion

Two ingestion paths, both store to `documents` table with `parsed_text` for AI context:
- **File upload** (`POST /api/cv`): PDF parsed with `pdf-parse@1.1.1`, DOCX with `mammoth`. Both loaded via `createRequire(import.meta.url)` to force CJS — Turbopack's ESM wrapper breaks default imports for these packages. Both listed in `next.config.ts` `serverExternalPackages`.
- **URL import** (`POST /api/cv/url`): fetches the page, strips HTML, sends raw text to Groq to extract structured CV sections.

### AI chat

`/api/ai/chat` builds a rich structured system prompt from **all** profile data and streams from **Groq** via the OpenAI-compatible SDK (`lib/ai/deepseek.ts`, model `llama-3.3-70b-versatile`). Requires `GROQ_API_KEY`. `generateEmbedding()` always returns `null` (no embedding model) — vector search is skipped.

**Context sources included in the prompt** (fetched in parallel at query time):
- Profile: name, bio, location
- Social links with platform names
- Affiliations: org, role, verified status, proof link, `scraped_content` (page description + text)
- Achievements: title, description, date, link, `scraped_content` (page description + text)
- All blocks grouped by section: note text, link block title + URL + `scraped_title` + `scraped_description` + `scraped_text`, Spotify/YouTube URLs, image captions
- CV/document `parsed_text` (most recent)

The prompt uses markdown section headers (`## About`, `## Social & Website Links`, etc.) for clear structure. The AI is scoped strictly to visitor questions about the profile owner.

### Analytics

Events tracked via `POST /api/analytics` — captures IP, resolves to country via `ip-api.com` (free, 45 req/min), stores in `metadata` JSONB. On Vercel, uses `x-vercel-ip-country` header instead. `GET /api/analytics` accepts `period` param (`1h|24h|7d|30d|90d`), returns time-bucketed chart data, per-event-type counts, and top-10 country breakdown.

### Solana / tipping

`TipModal` (`components/profile/TipModal.tsx`) and `/{username}/tip` both use the full Solana wallet adapter — tipper connects their own wallet and sends SOL/USDC/USDT. Both wrap `ConnectionProvider` + `WalletProvider` + `WalletModalProvider` internally. `TipModal` is dynamically imported with `ssr: false` in `ProfileHeader`. Any component importing `@solana/wallet-adapter-react-ui` **must** use `dynamic(..., { ssr: false })`.

**Tip wallet** (`components/editor/WalletConnectSection.tsx`): Users connect via wallet adapter or paste a Solana address manually. Address saved to `wallets` table with `network: 'solana'`.

### Bento blocks + sections

The "Me" tab on the edit page is a bento grid of content blocks. Each block has a `type` (`note`, `link`, `spotify`, `youtube`, `image`), a `content` JSONB, a `span` (1 or 2 columns), and an optional `section_id`.

- **Free blocks** (`section_id = null`) render above sections.
- **Sections** (`sections` table) are named groups. Deleting a section sets `section_id = null` on its blocks via `ON DELETE SET NULL`.
- `BlocksEditor` (`components/blocks/BentoGrid.tsx`) handles drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`. Container keys are `'free'` or a section UUID. `resolveContainer()` maps any over-target ID (block ID, container key, or `droppable-*`) to a container key.
- `EmptyDropZone` uses `useDroppable` (not `useSortable`) with id `droppable-${sectionId}`.
- **Link blocks**: at save time `POST /api/blocks` calls `lib/scrape.ts` to fetch `scraped_title`, `scraped_description`, `scraped_text` (3,000 chars) and `og_image`, all stored in `content` JSONB.
- `BlocksEditor` accepts an `onShare` prop — when provided, renders a "Share my Myntro" button at the right end of the floating toolbar that copies the profile URL to clipboard and shows a "Copied!" state for 2 seconds.
- `follower_count` on `links` — column exists in schema but is not populated (feature removed).

### Onboarding flow

`app/(onboarding)/onboarding/page.tsx` — 4 steps:
1. **Username** — 3-30 chars, lowercase alphanumeric + underscores, checked against DB
2. **Profile** — display name, bio (300 char limit), location
3. **Links** — up to 5 social platforms; URL validation runs on blur per platform regex
4. **Avatar** — optional photo upload (JPEG/PNG/WebP/GIF, max 5MB); drag to reposition, saved to `users.avatar_position` JSONB

### Bento note blocks

Note blocks are editable inline: text, font family (Space Grotesk, Georgia, Architects Daughter, Geist Mono), background color (8 presets). The `onUpdate` prop must flow through: `BlocksEditor` → `SortableBlockItem` → `BlockRenderer` → `NoteBlock`.

### Public profile — EditFab / "Get your Myntro"

`components/profile/EditFab.tsx` is a fixed bottom-right button on `/{username}`:
- **Owner** (authenticated, matching `userId`) → shows "Edit page" link
- **Other signed-in user** → renders nothing
- **Unauthenticated visitor** → shows bold green "Get your Myntro" CTA linking to `/signup?ref={username}`

### useProfile hook

`hooks/useProfile.ts` is the single source of truth for all profile mutations on the edit page. Uses optimistic updates with snapshot/revert. Covers: profile fields, links (with reorder), achievements, affiliations (add/update/delete), blocks (add/delete/reorder), sections (add/update/delete/reorder).

### Page → component ownership

- `/{username}` (Server Component) — fetches all profile data server-side via `getProfileData`, passes to client components. Social links rendered as icon pills via `LinksSection` (uses `react-icons/si` + `react-icons/fa`).
- `ProfileHeader` (client) — avatar, name, featured affiliation badge (only if `verified`), AI chat sidebar, tip modal
- `/{username}/edit` (client) — all hooks declared before any conditional returns (Rules of Hooks). Uses `useProfile` for all mutations. Key layout details:
  - Floating stats bar (Tips / Views) is constrained to `max-w-lg` via an inner wrapper to align with page content
  - "Share my Myntro" button lives inside `BlocksEditor`'s floating toolbar (passed via `onShare` prop from the edit page)
  - "Identity & Background" is a bold section header grouping Affiliations, Resume/CV, and Wallet — each sub-section has an `Info` icon tooltip using the `group/tip` + `group-hover/tip:opacity-100` pattern; tooltips are `left-0` anchored (not centered) to prevent left-edge clipping
  - Location + social links row uses `flex flex-col gap-2` so the add-link form opens below without pushing the location text
- `/admin/affiliations` (client) — fetches via `/api/admin/affiliations` which uses `users!affiliations_user_id_fkey` join hint to resolve the ambiguous FK

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
