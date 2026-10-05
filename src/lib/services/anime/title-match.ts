import type { AnimeCandidate } from "./types"

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

/**
 * Share of the OCR line's words found in the candidate's best-matching title,
 * as whole words or prefixes (OCR often cuts titles: "Mushoku Te"). 0–1.
 */
export function titleMatchScore(line: string, candidate: AnimeCandidate): { score: number; matched: number } {
  const lineWords = words(line)
  if (lineWords.length === 0) return { score: 0, matched: 0 }
  let best = { score: 0, matched: 0 }
  for (const title of [candidate.title, ...(candidate.altTitles ?? [])]) {
    const titleWords = words(title)
    const matched = lineWords.filter((w) => titleWords.some((t) => t.startsWith(w))).length
    const score = matched / lineWords.length
    if (score > best.score || (score === best.score && matched > best.matched)) best = { score, matched }
  }
  return best
}

/** A line counts as "the title" if nearly all its words match and it isn't a lone short word. */
export function isConfidentMatch({ score, matched }: { score: number; matched: number }, line: string): boolean {
  return score >= 0.75 && (matched >= 2 || line.length >= 5)
}
