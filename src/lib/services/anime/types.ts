export type AnimeSource = "anilist" | "jikan"

/** A search/identification result, before the franchise is resolved. */
export interface AnimeCandidate {
  source: AnimeSource
  id: number
  title: string
  coverUrl: string | null
  year: number | null
  format: string | null
  /** trace.moe only: 0–1 match confidence. */
  similarity?: number
  /** trace.moe only: episode the scene belongs to. */
  episodeHint?: number
}

export interface AnimeSeason {
  id: number
  title: string
  /** Total episodes, or aired-so-far for a currently airing season. Null if unknown. */
  episodes: number | null
}

/** One franchise = one Keeping entry. Seasons are TV-format only, in airing order. */
export interface AnimeFranchise {
  source: AnimeSource
  title: string
  coverUrl: string | null
  description: string
  genres: string[]
  seasons: AnimeSeason[]
  /** 1-based index into `seasons` of the anime the user picked. */
  pickedSeason: number
}

export interface AnimeProvider {
  search(query: string, signal?: AbortSignal): Promise<AnimeCandidate[]>
  getFranchise(id: number, signal?: AbortSignal): Promise<AnimeFranchise>
}
