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

If Turbopack doesn't pick up a changed `NEXT_PUBLIC_*` env var, delete `.next/` and restart.

## Design system

Color tokens: `#182403` (dark headings), `#0F1702` (near-black), `#909090` (subtext), `#C0C0C0` (muted), `#EBEBEB` (borders), `#FAFAFA` (surface), `#8EE600` (green accent).

Primary CTA gradient: `linear-gradient(160deg, #FDFDFD 0%, #C6F135 45%, #8EE600 100%)` with `boxShadow: 0 3px 16px rgba(142,230,0,0.35)`.

Fonts: **Funnel Display** (headings/display), **DM Sans** (body). Both loaded via `next/font/google` in the root layout.

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

`/api/rpc` is excluded from the middleware matcher entirely (no Supabase session overhead on RPC calls).

### Auth

Supabase Auth with Google OAuth + email/password. Two client factories in `lib/supabase/`:
- `client.ts` — `createBrowserClient` (use in `'use client'` components)
- `server.ts` — `createServerClient` with cookies (use in Server Components, API routes, `proxy.ts`), plus `createAdminClient()` which uses the service role key with no cookies — bypasses all RLS

**Custom Google OAuth flow** (so Google shows "Myntro" instead of the Supabase project ref):
- `GET /api/auth/google` — generates PKCE code_verifier/challenge, stores verifier in an HttpOnly `pkce_verifier` cookie, redirects directly to `accounts.google.com`. Requires `GOOGLE_CLIENT_ID`.
- `GET /api/auth/callback/google` — exchanges the Google authorization code for tokens (using `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`), then calls `supabase.auth.signInWithIdToken` with the Google ID token to mint a Supabase session. Applies the same beta gate + profile redirect logic as the old callback. Clears the `pkce_verifier` cookie on completion.
- The old `GET /api/auth/callback` route is kept for any other OAuth flows.
- Login and signup pages call `window.location.href = '/api/auth/google?next=...'` — no longer call `supabase.auth.signInWithOAuth`.

After OAuth the browser hits `/api/auth/callback` → checks if user has a profile → redirects to `/onboarding` (new users) or `/{username}/edit` (existing users).

**Password recovery flow**: `app/(auth)/forgot-password/page.tsx` calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: /reset-password`. `app/(auth)/reset-password/page.tsx` calls `supabase.auth.getSession()` on mount to exchange the URL fragment token, then `supabase.auth.updateUser({ password })` on submit.

**Signup page** (`app/(auth)/signup/page.tsx`):
- Password requirements: 8+ chars, uppercase, number, special character (`!@#$%^&*`), no common passwords
- **Beta-gated**: before `signUp()`, calls `GET /api/beta-check?email=...`. If the email is not in `beta_testers`, blocks with an error. Google OAuth is gated in the callback: after `exchangeCodeForSession`, new users (no profile yet) are checked against `beta_testers`; if not found, signed out + redirected to `/signup?error=beta_required`.
- `GET /api/beta-check` returns `{ allowed: boolean, reservedUsername: string | null }` — also checks `waitlist` for a reserved username.
- Immediate redirect to `/onboarding` after signup

### Data layer

All data lives in Supabase Postgres. Schema in `supabase/migrations/`. Always apply new migrations via the **Supabase dashboard SQL editor** — the Management API token has been unreliable.

Tables: `users`, `links`, `achievements`, `affiliations`, `wallets`, `documents`, `embeddings` (pgvector), `analytics_events`, `blocks`, `sections`, `tips`, `waitlist`, `beta_testers`.

Key columns:
- `users.featured_affiliation_id UUID` references `affiliations(id) ON DELETE SET NULL` — controls which verified affiliation badge shows publicly.
- `users.avatar_position JSONB` — stores avatar image position ({x, y} percentages).
- `users.tips_enabled BOOLEAN NOT NULL DEFAULT true`, `users.ai_enabled BOOLEAN NOT NULL DEFAULT true` — feature flags. Migration: `010_user_feature_flags.sql`.
- `users.tour_seen BOOLEAN NOT NULL DEFAULT false` — whether the user has completed or skipped the first-visit guided tour. Migration: run `ALTER TABLE users ADD COLUMN IF NOT EXISTS tour_seen BOOLEAN NOT NULL DEFAULT false;` in Supabase dashboard.
- `achievements.scraped_content JSONB` — page content scraped from `link` URL at save time. Migration: `007_scraped_content.sql`.
- `affiliations.scraped_content JSONB` — page content scraped from `proof_link` at save time. Migration: `007_scraped_content.sql`.
- `blocks.content JSONB` — for `link` type blocks, includes `scraped_title`, `scraped_description`, `scraped_text` populated at save time via `lib/scrape.ts`.
- `tips` — `recipient_user_id`, `sender_wallet`, `amount`, `token`, `tx_signature` (UNIQUE). RLS: recipient can read own rows. Migration: `009_tips.sql`.

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

**Self-view skip**: `POST /api/analytics` runs `supabase.auth.getUser()` in parallel with the username lookup. If `event_type === 'profile_view'` and the authenticated user's ID matches the profile owner's ID, the event is silently dropped (`{ ok: true, skipped: true }`). This prevents owners from inflating their own view counts.

`ProfileTracker` (`components/profile/ProfileTracker.tsx`) is a client component that fires `profile_view` on mount — rendered in `/{username}/page.tsx`.

### Solana / tipping

`TipModal` (`components/profile/TipModal.tsx`) uses the full Solana wallet adapter — tipper connects their own wallet and sends SOL/USDC/USDT. It wraps `ConnectionProvider` + `WalletProvider` + `WalletModalProvider` internally. `TipModal` is dynamically imported with `ssr: false` in `ProfileHeader`. Any component importing `@solana/wallet-adapter-react-ui` **must** use `dynamic(..., { ssr: false })`.

**RPC proxy** (`app/api/rpc/route.ts`): Proxies all Solana JSON-RPC requests to `SOLANA_RPC_URL` (server env var, defaults to `https://api.mainnet-beta.solana.com`). Has 8s timeout + two fallback endpoints (`extrnode`, `ankr`) — if primary fails, tries fallbacks before returning a proper JSON-RPC error. CORS headers set in route handler and `next.config.ts`. Excluded from `proxy.ts` middleware. Set `SOLANA_RPC_URL` to Helius in production.

**RPC endpoint** (`lib/solana/wallet.ts`): Defaults to **mainnet** (`NEXT_PUBLIC_SOLANA_NETWORK=devnet` to opt into devnet). `SOLANA_ENDPOINT` ignores `NEXT_PUBLIC_SOLANA_RPC_URL` if it contains `localhost` or `127.0.0.1` (avoids hardcoded port issues in `.env.local`). Falls back to `window.location.origin + '/api/rpc'` in the browser. Do not set `NEXT_PUBLIC_SOLANA_RPC_URL` in `.env.local` — set `SOLANA_RPC_URL` (server-side) to the Helius URL instead.

**Transaction flow**: `handleSend` uses `signTransaction` + `connection.sendRawTransaction` (not `sendTransaction`) to bypass StandardWalletAdapter chain-detection issues with custom RPC URLs. `skipPreflight: true` avoids a second RPC round-trip.

**Tip logging**: after tx confirms, the browser fires `POST /api/tips` (no auth required) with `{ username, sender_wallet, amount, token, tx_signature }`. The route logs to the `tips` table (upsert on `tx_signature`) and fires a Resend email to the recipient from `tips@myntro.me`.

**`/{username}/tip`** — standalone full-page tip flow (for mobile / direct links). Dynamically imports `TipFlow` component with `ssr: false`. Fetches wallet address via `/api/profile?username=x` on mount. Same wallet adapter stack as TipModal.

**Tip wallet** (`components/editor/WalletConnectSection.tsx`): Users connect via wallet adapter or paste a Solana address manually. Address saved to `wallets` table with `network: 'solana'`.

### Email (Resend)

Requires `RESEND_API_KEY`. Two sender addresses:
- `RESEND_FROM_INFO` (falls back to `RESEND_FROM`) — waitlist confirmation emails from `info@myntro.me`
- `RESEND_FROM` — tip notification emails from `tips@myntro.me`

**Important**: Resend SDK's `emails.send()` returns `{ data, error }` and **never throws**. Always check the returned `error` field — `catch` blocks will not fire on API errors.

All transactional emails include both `html` and `text` bodies (improves deliverability) and `List-Unsubscribe` headers.

Admin route `POST /api/admin/email-beta-testers` sends a custom email to all rows in `beta_testers` table in batches of 50. `GET` returns the count.

### Bento blocks + sections

The "Me" tab on the edit page is a bento grid of content blocks. Each block has a `type` (`note`, `link`, `spotify`, `youtube`, `image`), a `content` JSONB, a `span` (1 or 2 columns), and an optional `section_id`.

- **Free blocks** (`section_id = null`) render above sections.
- **Sections** (`sections` table) are named groups. Deleting a section sets `section_id = null` on its blocks via `ON DELETE SET NULL`.
- `BlocksEditor` (`components/blocks/BentoGrid.tsx`) handles drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`. Container keys are `'free'` or a section UUID. `resolveContainer()` maps any over-target ID (block ID, container key, or `droppable-*`) to a container key.
- `EmptyDropZone` uses `useDroppable` (not `useSortable`) with id `droppable-${sectionId}`.
- **Link blocks**: at save time `POST /api/blocks` calls `lib/scrape.ts` to fetch `scraped_title`, `scraped_description`, `scraped_text` (3,000 chars) and `og_image`, all stored in `content` JSONB. `LinkBlock.tsx` always shows an image: uses `og_image` if scraped, otherwise falls back to a WordPress mshots screenshot (`s.wordpress.com/mshots/v1/{url}?w=600&h=312`).
- **Music blocks** (`type: 'music'`, `components/blocks/MusicBlock.tsx`): replaces the old Spotify-only block. Auto-detects platform from the pasted URL and renders the correct embed for Spotify, SoundCloud, Apple Music, and Tidal. Legacy `type: 'spotify'` DB rows are handled by the same renderer (both cases route to `MusicBlock`). New blocks are saved as `type: 'music'`.
- `BlocksEditor` accepts an `onShare` prop — when provided, renders a "Share my Myntro" button at the right end of the floating toolbar that copies the profile URL to clipboard and shows a "Copied!" state for 2 seconds.
- `follower_count` on `links` — column exists in schema but is not populated (feature removed).

### Onboarding flow

`app/(onboarding)/onboarding/page.tsx` — 4 steps:
1. **Username** — 3-30 chars, lowercase alphanumeric + underscores, checked against DB. On mount, calls `GET /api/beta-check?email=...` to fetch any reserved username from the `waitlist` table. If found, the field is pre-filled and locked (`readOnly`, green tint), Continue is immediately enabled — no availability check needed.
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

### Guided tour + profile checklist

First-time users (where `users.tour_seen = false`) see a guided tour on the edit page:
- `GuidedTour` (`components/editor/GuidedTour.tsx`) — 8-step spotlight tour rendered via `createPortal` into `document.body`. Each step dims the page with a semi-transparent overlay, cuts a spotlight hole around the target element using `box-shadow: 0 0 0 9999px rgba(...)`, scrolls it into view, then shows a tooltip card (step count, title, body, dot progress, Back/Next/Done nav). Welcome step (no target) shows a centered card. Skip always available.
- On finish or skip: `PATCH /api/profile { tour_seen: true }` — tour never shows again.
- `ProfileChecklist` (`components/editor/ProfileChecklist.tsx`) — fixed bottom strip above the stats bar (`bottom: 56px`). Shows "X of 6 complete" + animated green progress bar. Expands to list 6 items (photo, bio, link, block, achievement, wallet) derived from live profile data. Tapping an incomplete item scrolls to the relevant `id="tour-*"` element. Dismissed via `×` → `localStorage` key `myntro-checklist-dismissed`. Auto-dismisses 2.5s after all 6 items are done.
- Tour anchor IDs on the edit page: `tour-avatar`, `tour-profile`, `tour-links`, `tour-blocks`, `tour-achievements`, `tour-identity`, `tour-analytics`.

### Achievement editor

`components/editor/AchievementEditor.tsx`:
- **Custom `DatePicker`** — fixed-position modal using `getBoundingClientRect()` to position at the button. Opens upward if there is more space above. Calendar is Monday-first 6×7 grid.
- **Link field is required** — submit button disabled if link is empty.
- **Inline link preview** — while typing a URL in the form, shows favicon (Google Favicon API) + full URL + open icon. Saved achievement cards also show a `LinkPreview` below the description.
- **Card icon** matches the public profile exactly: `h-12 w-12 rounded-xl bg-[#F5F5F5] border border-[#EBEBEB]` with `Trophy h-5 w-5 text-[#0F1702]/40`.

### AchievementsSection hover preview

`components/profile/AchievementsSection.tsx` is a client component. On hover (250ms delay), achievement cards with a link show a `LinkPopup` rendered via `createPortal` that tracks the cursor position. The popup shows a live website screenshot via `s.wordpress.com/mshots/v1/` + favicon + domain. Must use `createPortal` — the card's `hover:-translate-y-0.5` CSS transform breaks `position: fixed` for children inside it.

### Page → component ownership

- `/{username}` (Server Component) — fetches all profile data server-side via `getProfileData`, passes to client components. Social links rendered as icon pills via `LinksSection` (uses `react-icons/si` + `react-icons/fa`). Fires `link_click` analytics via `navigator.sendBeacon` on each link.
- `ProfileHeader` (client) — avatar (with `onError` fallback to initials), name, featured affiliation badge (only if `verified`), AI chat sidebar (fires `ai_chat` analytic on open), tip modal
- `/{username}/edit` (client) — all hooks declared before any conditional returns (Rules of Hooks). Uses `useProfile` for all mutations. Key layout details:
  - Floating stats bar (Tips / Views) is constrained to `max-w-lg` via an inner wrapper to align with page content
  - Recent Tips section is collapsible (caret toggle); each tip row shows wallet address + formatted date/time
  - "Identity & Background" is a bold section header grouping Affiliations, Resume/CV, and Wallet — each sub-section has an `Info` icon tooltip using the `group/tip` + `group-hover/tip:opacity-100` pattern; tooltips are `left-0` anchored (not centered) to prevent left-edge clipping
  - Tour anchors (`id="tour-*"`) are placed on key elements; `GuidedTour` and `ProfileChecklist` render at the bottom of the page JSX
- `/{username}/analytics` (client) — analytics dashboard for the profile owner; reads from `/api/analytics`. Stat cards use grey Phosphor icons (`Eye`, `CursorClick`, `Robot`, `Coins`) instead of colored dots.
- `/admin/affiliations` (client) — fetches via `/api/admin/affiliations` which uses `users!affiliations_user_id_fkey` join hint to resolve the ambiguous FK

### Non-obvious gotchas

- **Username availability check** (`/api/username` + onboarding): must use `createAdminClient()` (service role) for both the availability count query AND the upsert — the anon/user client is blocked by RLS on those operations.
- **Onboarding Step 1 back button**: calls `supabase.auth.signOut()` before `router.push('/login')`. Using a plain `<Link href="/login">` creates a proxy redirect loop (auth'd user → proxy redirects back to edit page).
- **`LinksSection`** has `'use client'` — needed to avoid `createContext is not a function` SSR error on the public profile page.
- **`proxy.ts` `getUserProfilePath`** uses service role key (`SUPABASE_SERVICE_ROLE_KEY`) so RLS on `profile_visibility` or other policies can never block the username lookup during redirects.

### Key conventions

- `@/*` path alias maps to the repo root
- `cn()` from `lib/utils.ts` for conditional Tailwind classes
- All API routes authenticate via `supabase.auth.getUser()` — never trust client-provided user IDs
- Admin API routes additionally check `isAdmin(user.email)` against `ADMIN_EMAILS` env var
- `types/index.ts` holds all shared TypeScript interfaces; keep in sync with DB schema
- Shadcn components go in `components/ui/`

### Waitlist page (`app/waitlist/page.tsx`)

Standalone pre-launch page — no auth required, no Supabase session needed.

**API**: `GET /api/waitlist?username=x` (HEAD) → 200 available / 409 taken. `POST /api/waitlist` → `{ username, email }` saves to `waitlist` table. Usernames are cross-checked against the live `users` table so reserved handles can't be claimed.

**Card animations** (inline `<style>` tag in `SuccessScreen`):
- `cardIntro` — 600ms ease-out fade-in + rise on mount
- `cardGlaze` — 2.2s white sheen sweep, only starts after confetti finishes (`glazeReady` state set by `onDone` callback from `useConfetti`)
- 3D tilt on hover: outer wrapper holds `perspective(900px) rotateX/Y`, inner card holds `overflow-hidden` — these must stay split or the 3D transform clips content

**Confetti** (`useConfetti` hook, canvas API): 180 particles, brand green palette, sin-wave flutter, staggered spawn delays. Calls `onDone?.()` when all particles fade out.

**Haptics** (`web-haptics` package, `useWebHaptics` from `web-haptics/react`): `light` on input focus, `success`/`error` on username check result, `buzz` on submit, `light` on Share on X. Only fires on supported mobile hardware.

**Username input UX**: `usernameFocused` state gates the green border AND box-shadow — both only show when the field is focused, even when `checkState === 'available'`. On available, `useEffect` watching `checkState` blurs the username input and focuses email.

**Submit button**: only enabled when `checkState === 'available'` AND email passes `EMAIL_REGEX` (`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`).

### Maintenance mode

`proxy.ts` checks `process.env.MAINTENANCE_MODE === 'true'` at the top of every request. When enabled, all traffic redirects to `/waitlist` except `/waitlist`, `/api/waitlist/*`, `/api/admin/*`, and `/_next/*`. Set this env var in Vercel **Production** only to keep the waitlist public while blocking the rest of the app.

### Environment variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `ADMIN_EMAILS`, `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_FROM_INFO`.

Optional: `NEXT_PUBLIC_SOLANA_NETWORK` (defaults to **mainnet**; set to `devnet` to opt into devnet), `SOLANA_RPC_URL` (server-side upstream for the RPC proxy; set to Helius URL in production — do **not** use `NEXT_PUBLIC_SOLANA_RPC_URL` in `.env.local`), `NEXT_PUBLIC_APP_URL` (defaults to `https://myntro.me`), `MAINTENANCE_MODE` (set to `true` to redirect all traffic to `/waitlist`).
