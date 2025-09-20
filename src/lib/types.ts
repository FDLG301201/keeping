import { User } from '@supabase/supabase-js'

export type EntryStatus = 'Completado' | 'En Progreso' | 'Pausado' | 'Abandonado' | 'Planeado'

export type EntryType = {
  id: number
  title: string
  type: string
  rating: number
  image_url: string | null
  description: string
  status: string
  genres: string[]
  related_entries: string[]
  date_watched: string
  comments: string | null
  seasons?: number
  current_season?: number
  episodes?: number
  current_episode?: number
  created_at: string
  user_id: string
  entry_genres?: Array<{
    genre_id: string
    genres: {
      name: string
    }
  }>
  entry_relations?: Array<{
    related_entry_id: string
    related_entry: {
      title: string
    }
  }>
}

export type UserProfile = User | null
