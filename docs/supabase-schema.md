# Supabase Schema — Keeping

Project ID: `dbaslduvszwowlevuhux`  
Region: `us-east-1`  
DB host: `db.dbaslduvszwowlevuhux.supabase.co`

---

## Tables

### `entries`
Main record per usuario. RLS habilitado — todas las operaciones filtradas por `user_id = auth.uid()`.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `title` | text | NO | — |
| `type` | text | NO | — |
| `description` | text | YES | — |
| `rating` | integer | YES | — |
| `status` | text | NO | `'not_started'` |
| `image_url` | text | YES | — |
| `year` | integer | YES | — |
| `seasons` | integer | YES | `1` |
| `episodes` | integer | YES | — |
| `current_season` | integer | YES | `1` |
| `current_episode` | integer | YES | `1` |
| `comments` | text | YES | — |
| `date_watched` | date | YES | — |
| `user_id` | uuid | YES | — |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |

**Valores válidos para `type`:** `anime`, `movie`, `series`, `game`, `book`  
**Valores válidos para `status`:** `not_started`, `in_progress`, `completed`, `paused`, `dropped`

---

### `genres`
Tabla global compartida entre usuarios. RLS habilitado.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `name` | text | NO | — |
| `color` | text | YES | `'#6366f1'` |

**Constraints:** `UNIQUE(name)`

---

### `entry_genres`
Junction table entre `entries` y `genres`. RLS habilitado.

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `entry_id` | uuid | YES |
| `genre_id` | uuid | YES |

**Constraints:** `UNIQUE(entry_id, genre_id)`  
**FKs:** `entry_id → entries.id`, `genre_id → genres.id`

---

### `entry_relations`
Relaciones bidireccionales entre entries (secuelas, precuelas, etc.). RLS habilitado.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `parent_entry_id` | uuid | YES | — |
| `related_entry_id` | uuid | YES | — |
| `relation_type` | text | NO | `'sequel'` |
| `order_number` | integer | YES | `1` |
| `created_at` | timestamptz | YES | `now()` |

**Constraints:** `UNIQUE(parent_entry_id, related_entry_id)`  
**FKs:** `parent_entry_id → entries.id` (`entry_relations_parent_entry_id_fkey`), `related_entry_id → entries.id` (`entry_relations_related_entry_id_fkey`)

---

## RLS Policies

### `entries`
| Policy | Command | Expression |
|--------|---------|------------|
| Users can view their own entries | SELECT | `auth.uid() = user_id` |
| Users can insert their own entries | INSERT | `auth.uid() = user_id` (WITH CHECK) |
| Users can update their own entries | UPDATE | `auth.uid() = user_id` |
| Users can delete their own entries | DELETE | `auth.uid() = user_id` |

### `genres`
| Policy | Command | Expression |
|--------|---------|------------|
| Anyone can view genres | SELECT | `true` |
| Allow insert to all authenticated users | INSERT | `true` (WITH CHECK) |

> No hay política UPDATE ni DELETE en `genres`. No usar `upsert` — falla silenciosamente porque `upsert` requiere UPDATE.

### `entry_genres`
| Policy | Command | Expression |
|--------|---------|------------|
| Users can view entry genres for their entries | SELECT | `EXISTS(SELECT 1 FROM entries WHERE entries.id = entry_genres.entry_id AND entries.user_id = auth.uid())` |
| Users can manage entry genres for their entries | ALL | misma expresión (USING aplicado como WITH CHECK en INSERT) |

### `entry_relations`
| Policy | Command | Expression |
|--------|---------|------------|
| Users can view relations for their entries | SELECT | `EXISTS(SELECT 1 FROM entries WHERE entries.id = entry_relations.parent_entry_id AND entries.user_id = auth.uid())` |
| Users can manage relations for their entries | ALL | misma expresión |

---

## Storage

**Bucket:** `entry-images`  
**Path pattern:** `{userId}/{timestamp}.{ext}`  
**URL pública:** `supabase.storage.from("entry-images").getPublicUrl(fileName)`

---

## Queries de referencia

### Cargar entries con géneros y relaciones
```ts
supabase
  .from("entries")
  .select(`
    *,
    entry_genres(genre_id, genres(name)),
    entry_relations!entry_relations_parent_entry_id_fkey(
      related_entry_id,
      related_entry:entries!entry_relations_related_entry_id_fkey(title)
    )
  `)
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
```

Mapeo post-query:
```ts
genres: entry.entry_genres?.map(eg => eg.genres.name) || []
related_entries: entry.entry_relations?.map(er => er.related_entry?.title).filter(Boolean) || []
```

### Guardar género (find-or-create)
```ts
// 1. Buscar existente
const { data: existing } = await supabase
  .from("genres").select("id").eq("name", name).maybeSingle()

// 2. Crear si no existe
const genreId = existing?.id ?? (
  await supabase.from("genres").insert({ name }).select("id").single()
).data.id

// 3. Vincular
await supabase.from("entry_genres").insert({ entry_id, genre_id: genreId })
```

### Guardar relación entre entries
```ts
// Resolver título a UUID primero
const { data: related } = await supabase
  .from("entries").select("id")
  .eq("title", title).eq("user_id", userId).maybeSingle()

if (related) {
  await supabase.from("entry_relations").insert({
    parent_entry_id: entryId,
    related_entry_id: related.id,
  })
}
```
