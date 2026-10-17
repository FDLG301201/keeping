import type { Entry } from "@/lib/types"

export interface RecommendFilters {
  type: string
  /** Empty = any genre. Otherwise an entry needs at least one of them. */
  genres: string[]
  minRating: number
}

// Nothing to vouch for yet (not_started) or something you gave up on (dropped).
const EXCLUDED_STATUSES = new Set(["not_started", "dropped"])

export function filterRecommendable(entries: Entry[], { type, genres, minRating }: RecommendFilters): Entry[] {
  return entries.filter(
    (e) =>
      e.type === type &&
      !EXCLUDED_STATUSES.has(e.status) &&
      (e.rating ?? 0) >= minRating &&
      (genres.length === 0 || e.genres.some((g) => genres.includes(g))),
  )
}

/** Genres used by recommendable entries of a type, most frequent first. */
export function genresForType(entries: Entry[], type: string): string[] {
  const counts = new Map<string, number>()
  for (const e of entries) {
    if (e.type !== type || EXCLUDED_STATUSES.has(e.status)) continue
    for (const g of e.genres) counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g)
}

/** Highest rated first; entries with the same rating are shuffled. */
export function orderDeck(entries: Entry[], random: () => number = Math.random): Entry[] {
  const keyed = entries.map((e) => ({ e, tiebreak: random() }))
  keyed.sort((a, b) => (b.e.rating ?? 0) - (a.e.rating ?? 0) || a.tiebreak - b.tiebreak)
  return keyed.map(({ e }) => e)
}
