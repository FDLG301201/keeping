import { translateGenres } from "./genres"
import { cleanDescription, fetchJson } from "./http"
import type { AnimeCandidate, AnimeFranchise, AnimeProvider, AnimeSeason } from "./types"

const ENDPOINT = "https://graphql.anilist.co"
const SERIES_FORMATS = new Set(["TV", "TV_SHORT"])
const MAX_HOPS = 15

interface FuzzyDate {
  year: number | null
  month: number | null
  day: number | null
}

interface MediaEdge {
  relationType: string
  node: { id: number; type: string; format: string | null; status: string | null; startDate: FuzzyDate }
}

export interface AniListMedia {
  id: number
  title: { romaji: string | null; english: string | null }
  synonyms: string[]
  format: string | null
  status: string | null
  episodes: number | null
  seasonYear: number | null
  startDate: FuzzyDate
  nextAiringEpisode: { episode: number } | null
  coverImage: { extraLarge: string | null; large: string | null }
  description: string | null
  genres: string[]
  relations: { edges: MediaEdge[] }
}

const MEDIA_FIELDS = `
  id
  title { romaji english }
  synonyms
  format
  status
  episodes
  seasonYear
  startDate { year month day }
  nextAiringEpisode { episode }
  coverImage { extraLarge large }
  description(asHtml: false)
  genres
  relations { edges { relationType node { id type format status startDate { year month day } } } }
`

async function query<T>(gql: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const body = await fetchJson<{ data: T; errors?: { message: string }[] }>(
    ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: gql, variables }),
    },
    signal,
  )
  if (body.errors?.length) throw new Error(`AniList: ${body.errors[0].message}`)
  return body.data
}

const titleOf = (m: AniListMedia) => m.title.english ?? m.title.romaji ?? `#${m.id}`

const dateKey = (d: FuzzyDate) => (d.year ?? 9999) * 10000 + (d.month ?? 12) * 100 + (d.day ?? 31)

export function toCandidate(m: AniListMedia): AnimeCandidate {
  return {
    source: "anilist",
    id: m.id,
    title: titleOf(m),
    coverUrl: m.coverImage.extraLarge ?? m.coverImage.large,
    year: m.seasonYear ?? m.startDate.year,
    format: m.format,
    altTitles: [m.title.romaji, m.title.english, ...m.synonyms].filter((t): t is string => !!t),
  }
}

/**
 * Picks the TV-format neighbor along `relationType`; earliest sequel / latest prequel wins.
 * Announced-but-unreleased seasons are skipped unless it's the one the user picked.
 */
function seriesNeighbor(m: AniListMedia, relationType: "PREQUEL" | "SEQUEL", pickedId: number): number | null {
  const edges = m.relations.edges.filter(
    (e) =>
      e.relationType === relationType &&
      e.node.type === "ANIME" &&
      SERIES_FORMATS.has(e.node.format ?? "") &&
      (e.node.status !== "NOT_YET_RELEASED" || e.node.id === pickedId),
  )
  if (edges.length === 0) return null
  edges.sort((a, b) => dateKey(a.node.startDate) - dateKey(b.node.startDate))
  return (relationType === "SEQUEL" ? edges[0] : edges[edges.length - 1]).node.id
}

/**
 * Walks PREQUEL links back to the first TV season, then SEQUEL links forward.
 * `getMedia` is injected so the walk itself has no network knowledge. If a hop
 * fails, the chain built so far is returned (at minimum the start node).
 */
export async function resolveSeasonChain(
  start: AniListMedia,
  getMedia: (id: number) => Promise<AniListMedia>,
): Promise<AniListMedia[]> {
  if (!SERIES_FORMATS.has(start.format ?? "")) return [start]

  const cache = new Map<number, AniListMedia>([[start.id, start]])
  const load = async (id: number) => {
    const hit = cache.get(id)
    if (hit) return hit
    const m = await getMedia(id)
    cache.set(id, m)
    return m
  }

  let root = start
  const seenBack = new Set([start.id])
  try {
    for (let hops = 0; hops < MAX_HOPS; hops++) {
      const prevId = seriesNeighbor(root, "PREQUEL", start.id)
      if (prevId === null || seenBack.has(prevId)) break
      seenBack.add(prevId)
      root = await load(prevId)
    }
  } catch {
    // Keep whatever root we reached.
  }

  const chain = [root]
  const seen = new Set([root.id])
  try {
    for (let hops = 0; hops < MAX_HOPS; hops++) {
      const nextId = seriesNeighbor(chain[chain.length - 1], "SEQUEL", start.id)
      if (nextId === null || seen.has(nextId)) break
      seen.add(nextId)
      chain.push(await load(nextId))
    }
  } catch {
    // Partial chain is better than none.
  }

  // A failed back-walk may leave `start` off a forward chain rooted elsewhere.
  if (!chain.some((m) => m.id === start.id)) return [start]
  return chain
}

function toSeason(m: AniListMedia): AnimeSeason {
  const aired = m.nextAiringEpisode ? m.nextAiringEpisode.episode - 1 : null
  return { id: m.id, title: titleOf(m), episodes: m.episodes ?? aired }
}

async function getMedia(id: number, signal?: AbortSignal): Promise<AniListMedia> {
  const data = await query<{ Media: AniListMedia }>(
    `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`,
    { id },
    signal,
  )
  return data.Media
}

/** Batch lookup used by trace.moe results to get covers in one request. */
export async function getMediaByIds(ids: number[], signal?: AbortSignal): Promise<AniListMedia[]> {
  const data = await query<{ Page: { media: AniListMedia[] } }>(
    `query ($ids: [Int]) { Page(perPage: 10) { media(id_in: $ids, type: ANIME) { ${MEDIA_FIELDS} } } }`,
    { ids },
    signal,
  )
  return data.Page.media
}

export const anilist: AnimeProvider = {
  async search(text, signal) {
    const data = await query<{ Page: { media: AniListMedia[] } }>(
      `query ($search: String) {
        Page(perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }
      }`,
      { search: text },
      signal,
    )
    return data.Page.media.map(toCandidate)
  },

  async getFranchise(id, signal) {
    const start = await getMedia(id, signal)
    const chain = await resolveSeasonChain(start, (mid) => getMedia(mid, signal))
    const root = chain[0]
    return {
      source: "anilist",
      title: titleOf(root),
      coverUrl: root.coverImage.extraLarge ?? root.coverImage.large,
      description: cleanDescription(root.description),
      genres: translateGenres(root.genres),
      seasons: chain.map(toSeason),
      pickedSeason: chain.findIndex((m) => m.id === start.id) + 1,
    } satisfies AnimeFranchise
  },
}
