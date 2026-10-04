# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start dev server (Turbopack, default in Next.js 16)
pnpm build     # Production build (Turbopack)
pnpm start     # Start production server
pnpm lint      # Run ESLint
```

Package manager: **pnpm**. Do not use npm or yarn.  
No test suite is configured.

## What This App Does

**Keeping** is a personal entertainment directory. Authenticated users can track anime, movies, TV series, games, and books — rating them (1–5 stars), setting a status (not_started / in_progress / completed / paused / dropped), tagging genres, linking related entries, and uploading cover images.

The UI is in Spanish.

## Architecture

### Stack
- **Next.js 16** with App Router (`src/app/`); Turbopack is the default bundler
- **React 19.2**
- **Supabase** for auth, database (PostgreSQL), and file storage
- **TypeScript** with strict mode; path alias `@/*` → `src/*`
- **Tailwind CSS 4** via PostCSS; `cn()` utility in `src/lib/utils.ts`
- **Radix UI** primitives wrapped as shadcn-style components in `src/components/ui/` — only a handful exist (badge, label, select, tabs, textarea) even though many `@radix-ui/*` packages are installed; add a wrapper there before using a new primitive
- **React Hook Form + Zod** for form validation
- **SWR** available but data fetching is currently done via direct Supabase client calls in `useEffect`

### Auth & Routing
`proxy.ts` (Next.js 16 renamed from `middleware.ts`) validates the Supabase session via `getUser()` and redirects unauthenticated users to `/auth/login`. The exported function is named `proxy`. **Exemptions:** `/auth/*` and `/` itself are not redirected by the proxy — the dashboard at `/` does its own client-side check (`getSession()` → `router.push("/auth/login")`). The Supabase SSR helpers (`@supabase/ssr`) maintain session state across server and client via cookies.

Auth pages live in `src/app/auth/` (login, signup, signup-success, forgot-password, reset-password). Email links (signup confirmation, password recovery) redirect to `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` when set, otherwise `window.location.origin`. `reset-password` handles both the PKCE flow (`?code=` → `exchangeCodeForSession`) and the implicit-flow fallback (`PASSWORD_RECOVERY` auth event).

### Auth Email Templates
Custom Supabase auth emails (Spanish) are in `src/emails/confirmation.html` and `src/emails/recovery.html`. They are **not** picked up automatically — push them to the Supabase project via the Management API:
```bash
SUPABASE_ACCESS_TOKEN=<token> node scripts/apply-email-templates.mjs
```
The script also sets the email subjects; the project ref is hardcoded in it.

- Browser client: `src/lib/supabase/client.ts` — `createBrowserClient()`
- Server client: `src/lib/supabase/server.ts` — `createServerClient()` with Next.js cookie store

### Data Layer
All data access goes directly through the Supabase client — there are no API routes or server actions yet (`src/app/actions/` and `src/lib/services/` are empty placeholders).

See [`docs/supabase-schema.md`](docs/supabase-schema.md) for the full schema, RLS policies, FK names, and reference queries.

**Key tables:**
- `entries` — main record; always scoped a `user_id`; columns: id, title, type, rating, image_url, description, status, seasons, current_season, episodes, current_episode, user_id, created_at, date_watched, comments
- `genres` — global shared lookup (no user_id); UNIQUE on `name`; no UPDATE/DELETE policy — never use `upsert`, use find-or-create instead
- `entry_genres` — junction (entry_id → entries, genre_id → genres); UNIQUE(entry_id, genre_id)
- `entry_relations` — links between entries via `parent_entry_id` and `related_entry_id` (both UUIDs, FK to entries); UNIQUE(parent_entry_id, related_entry_id); default relation_type = `'sequel'`

**Valid enum values (stored as-is in DB, no uppercase):**
- `type`: `anime`, `movie`, `series`, `game`, `book`
- `status`: `not_started`, `in_progress`, `completed`, `paused`, `dropped`

Relational data is fetched with Supabase's nested select syntax using explicit FK hints, e.g.:
```ts
entry_relations!entry_relations_parent_entry_id_fkey(
  related_entry_id,
  related_entry:entries!entry_relations_related_entry_id_fkey(title)
)
```

### File Uploads
Cover images are uploaded to a Supabase storage bucket named `entry-images` using the path `{userId}/{timestamp}.{ext}`. The public URL is stored in `entries.image_url`. `next.config.ts` allowlists the Supabase project hostname in `images.remotePatterns` for `next/image` — update it if the Supabase project changes.

### Quick Add ("Agregado exprés") — anime only
A second add flow (`src/components/quick-add/`) that identifies an anime and saves it after a one-card confirmation (rating, status, current season/episode). **Only `type = anime` is supported**; every other type still uses the manual form. Identification has three inputs: typed title, photo of the title (OCR via `tesseract.js`, lazy-loaded), and scene screenshot (trace.moe, anonymous quota ~100/month).

Data comes from `src/lib/services/anime/` behind a common `AnimeProvider` interface, queried as a cascade: AniList first, Jikan (MyAnimeList) only if AniList returns nothing or fails. All calls go straight from the browser with an 8 s timeout.

Data rules that are easy to break:
- **One entry per franchise.** AniList treats each season as its own media; `resolveSeasonChain` walks PREQUEL links back to the first season, then SEQUEL forward, counting only `TV`/`TV_SHORT` and skipping unreleased seasons (unless picked). Movies/OVAs/specials never count as seasons. Jikan results are always 1 season.
- **`episodes` is per season** (episodes of `current_season`), not the franchise total.
- Title/cover/synopsis come from the first season. Synopsis is English; genres are translated via the dictionary in `genres.ts` (unknown ones kept as-is).
- Duplicates are detected by case-insensitive title match among the user's anime entries (no external ID column).

### UI Conventions

**Continuation info (seasons/episodes)** is only shown for `series` and `anime` types, and only when `status ∈ {in_progress, paused, dropped}`. It is intentionally hidden for `not_started` (nothing to track yet) and `completed` (no ongoing progress). The mini season indicator on cards (`T2/4`) is further restricted to `in_progress` and `paused` only.

**`suppressHydrationWarning`** on `<body>` in `layout.tsx` is intentional — it suppresses false hydration mismatches caused by browser extensions (e.g. ColorZilla) that inject attributes into the DOM before React hydrates. Do not remove it.

### Key Source Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main dashboard — entry list, filters (search/type/genre/status), modal trigger, all Supabase queries |
| `src/app/layout.tsx` | Root layout — fonts, metadata, `suppressHydrationWarning` on body |
| `src/components/forms/add-entry-form.tsx` | Add/edit entry form — image upload, genre tagging, related-entry linking |
| `proxy.ts` | Route protection and Supabase session validation (Next.js 16 proxy, formerly middleware.ts) |
| `scripts/apply-email-templates.mjs` | Pushes `src/emails/*.html` auth email templates to Supabase |
| `src/lib/types.ts` | `EntryType`, `EntryStatus`, `UserProfile` TypeScript types |
| `docs/supabase-schema.md` | Full DB schema, RLS policies, FK names, and reference queries |

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```
