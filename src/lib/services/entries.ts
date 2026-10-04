import { createClient } from "@/lib/supabase/client"

export interface NewEntry {
  title: string
  type: string
  rating: number
  image_url: string | null
  comments: string
  date_watched: string
  description: string
  status: string
  seasons: number
  current_season: number
  episodes: number
  current_episode: number
  user_id: string
}

/**
 * Links genres to an entry. `genres` has no UPDATE/DELETE policy, so this is
 * find-or-create rather than upsert (see docs/supabase-schema.md).
 */
export async function linkGenres(entryId: string, genreNames: string[]) {
  const supabase = createClient()
  for (const genreName of genreNames) {
    let genreId: string

    const { data: existingGenre } = await supabase.from("genres").select("id").eq("name", genreName).maybeSingle()

    if (existingGenre) {
      genreId = existingGenre.id
    } else {
      const { data: newGenre, error: genreError } = await supabase
        .from("genres")
        .insert({ name: genreName })
        .select("id")
        .single()
      if (genreError) throw genreError
      genreId = newGenre.id
    }

    const { error: linkError } = await supabase.from("entry_genres").insert({ entry_id: entryId, genre_id: genreId })
    if (linkError) throw linkError
  }
}

/** Inserts an entry plus its genres; returns the new entry row. */
export async function saveEntryWithGenres(entry: NewEntry, genreNames: string[]) {
  const supabase = createClient()
  const { data, error } = await supabase.from("entries").insert(entry).select().single()
  if (error) throw error
  await linkGenres(data.id, genreNames)
  return data
}

/** Case-insensitive exact title match among the user's entries of a given type. */
export async function findDuplicate(userId: string, type: string, title: string): Promise<boolean> {
  const supabase = createClient()
  const pattern = title.replace(/[\\%_]/g, "\\$&")
  const { data, error } = await supabase
    .from("entries")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("title", pattern)
    .limit(1)
  if (error) throw error
  return data.length > 0
}
