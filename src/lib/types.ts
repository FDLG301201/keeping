import { User } from '@supabase/supabase-js'

export type EntryStatus = 'Completado' | 'En Progreso' | 'Pausado' | 'Abandonado' | 'Planeado'

/** An `entries` row as loaded by the dashboard, with genres and relations flattened to names. */
export type Entry = {
  id: string
  title: string
  type: string
  rating: number
  image_url: string | null
  comments: string | null
  date_watched: string
  description: string
  status: string
  seasons: number
  current_season: number
  episodes: number
  current_episode: number
  genres: string[]
  related_entries: string[]
  user_id: string
  created_at: string
}

export type UserProfile = User | null
