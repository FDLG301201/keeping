import { translateGenres } from "./genres"
import { cleanDescription, fetchJson } from "./http"
import type { AnimeCandidate, AnimeProvider } from "./types"

const BASE = "https://api.jikan.moe/v4"

interface JikanAnime {
  mal_id: number
  title: string
  title_english: string | null
  type: string | null
  episodes: number | null
  year: number | null
  aired: { prop: { from: { year: number | null } } }
  images: { jpg: { large_image_url: string | null; image_url: string | null } }
  synopsis: string | null
  genres: { name: string }[]
}

const titleOf = (a: JikanAnime) => a.title_english ?? a.title

function toCandidate(a: JikanAnime): AnimeCandidate {
  return {
    source: "jikan",
    id: a.mal_id,
    title: titleOf(a),
    coverUrl: a.images.jpg.large_image_url ?? a.images.jpg.image_url,
    year: a.year ?? a.aired.prop.from.year,
    format: a.type,
  }
}

/** Fallback provider. Franchises are not walked: always a single season. */
export const jikan: AnimeProvider = {
  async search(text, signal) {
    const url = `${BASE}/anime?q=${encodeURIComponent(text)}&limit=5`
    const body = await fetchJson<{ data: JikanAnime[] }>(url, {}, signal)
    return body.data.map(toCandidate)
  },

  async getFranchise(id, signal) {
    const { data: a } = await fetchJson<{ data: JikanAnime }>(`${BASE}/anime/${id}`, {}, signal)
    return {
      source: "jikan",
      title: titleOf(a),
      coverUrl: a.images.jpg.large_image_url ?? a.images.jpg.image_url,
      description: cleanDescription(a.synopsis),
      genres: translateGenres(a.genres.map((g) => g.name)),
      seasons: [{ id: a.mal_id, title: titleOf(a), episodes: a.episodes }],
      pickedSeason: 1,
    }
  },
}
