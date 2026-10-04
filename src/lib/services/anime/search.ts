import { anilist } from "./anilist"
import { isAbortError } from "./http"
import { jikan } from "./jikan"
import type { AnimeCandidate, AnimeFranchise, AnimeProvider, AnimeSource } from "./types"

const providers: Record<AnimeSource, AnimeProvider> = { anilist, jikan }
const cascade: AnimeProvider[] = [anilist, jikan]

export class AnimeUnavailableError extends Error {
  constructor() {
    super("No se pudo conectar con ningún servicio de anime")
  }
}

/**
 * Tries each provider in order; the first one with results wins.
 * Resolves to [] when every provider answered with no results, and rejects with
 * AnimeUnavailableError only when every provider failed.
 */
export async function searchAnime(text: string, signal?: AbortSignal): Promise<AnimeCandidate[]> {
  let anyAnswered = false
  for (const provider of cascade) {
    try {
      const results = await provider.search(text, signal)
      anyAnswered = true
      if (results.length > 0) return results
    } catch (error) {
      if (isAbortError(error) && signal?.aborted) throw error
      console.warn("Anime provider failed, trying next:", error)
    }
  }
  if (!anyAnswered) throw new AnimeUnavailableError()
  return []
}

export function getFranchise(candidate: AnimeCandidate, signal?: AbortSignal): Promise<AnimeFranchise> {
  return providers[candidate.source].getFranchise(candidate.id, signal)
}
