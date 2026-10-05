import { anilist } from "./anilist"
import { isAbortError } from "./http"
import { jikan } from "./jikan"
import { isConfidentMatch, titleMatchScore } from "./title-match"
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

const MAX_OCR_QUERIES = 4

export interface OcrSearchResult {
  /** The line chosen as the title (shown in the editable search box). */
  query: string
  candidates: AnimeCandidate[]
  /** Other lines the user can try with one tap. */
  alternatives: string[]
  /** False when no line looked like a known title (candidates is then empty). */
  matched: boolean
}

/**
 * Lets AniList pick which OCR line is the title: each line is searched (most
 * confident first) and scored against the result titles; the first confident
 * match wins. Only AniList is used per line — junk lines rarely match, and
 * sending each to the Jikan fallback would multiply its timeouts.
 */
export async function searchFromOcrLines(lines: string[], signal?: AbortSignal): Promise<OcrSearchResult> {
  let best: { line: string; candidates: AnimeCandidate[]; score: number; matched: number } | null = null
  const searched = new Map<string, AnimeCandidate[]>()

  for (const line of lines.slice(0, MAX_OCR_QUERIES)) {
    let candidates: AnimeCandidate[]
    try {
      candidates = await anilist.search(line, signal)
      searched.set(line, candidates)
    } catch (error) {
      if (signal?.aborted) throw error
      continue
    }
    for (const candidate of candidates) {
      const match = titleMatchScore(line, candidate)
      if (!best || match.score > best.score || (match.score === best.score && match.matched > best.matched))
        best = { line, candidates, ...match }
    }
    if (best && best.line === line && isConfidentMatch(best, line)) break
  }

  const alternativesFor = (chosen: string) => lines.filter((l) => l !== chosen)

  if (best && isConfidentMatch(best, best.line)) {
    return { query: best.line, candidates: best.candidates, alternatives: alternativesFor(best.line), matched: true }
  }
  const query = lines[0]
  // AniList answered but nothing matched: the photo has no readable title. Don't
  // show random results for junk text; the user can tap a line or retake it.
  if (searched.size > 0) return { query, candidates: [], alternatives: alternativesFor(query), matched: false }
  // AniList unreachable: try the most confident line through the full cascade.
  const candidates = await searchAnime(query, signal)
  return { query, candidates, alternatives: alternativesFor(query), matched: candidates.length > 0 }
}

export function getFranchise(candidate: AnimeCandidate, signal?: AbortSignal): Promise<AnimeFranchise> {
  return providers[candidate.source].getFranchise(candidate.id, signal)
}
