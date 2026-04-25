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
- **Radix UI** primitives wrapped as shadcn-style components in `src/components/ui/`
- **React Hook Form + Zod** for form validation
- **SWR** available but data fetching is currently done via direct Supabase client calls in `useEffect`

### Auth & Routing
`proxy.ts` (Next.js 16 renamed from `middleware.ts`) protects all routes by validating the Supabase session cookie and redirecting unauthenticated users to `/auth/login`. The exported function is named `proxy`. The Supabase SSR helpers (`@supabase/ssr`) maintain session state across server and client via cookies.

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
Cover images are uploaded to a Supabase storage bucket named `entry-images` using the path `{userId}/{timestamp}.{ext}`. The public URL is stored in `entries.image_url`.

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
| `src/lib/types.ts` | `EntryType`, `EntryStatus`, `UserProfile` TypeScript types |
| `docs/supabase-schema.md` | Full DB schema, RLS policies, FK names, and reference queries |

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```
