import { getMediaByIds, toCandidate } from "./anilist"
import { HttpError } from "./http"
import { normalizeImage } from "./image"
import type { AnimeCandidate } from "./types"

const ENDPOINT = "https://api.trace.moe/search?cutBorders"
// trace.moe gains nothing from larger images; smaller uploads are faster.
const MAX_SIDE = 640

interface TraceResult {
  anilist: number
  episode: number | string | number[] | null
  similarity: number
}

export class TraceQuotaError extends Error {
  constructor() {
    super("Se alcanzó el límite de búsquedas por imagen")
  }
}

const firstEpisode = (ep: TraceResult["episode"]): number | undefined => {
  const n = Array.isArray(ep) ? ep[0] : typeof ep === "string" ? Number.parseInt(ep) : ep
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined
}

/** Identifies the anime a scene belongs to. Candidates are sorted by similarity. */
export async function identifyScene(file: File, signal?: AbortSignal): Promise<AnimeCandidate[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: await normalizeImage(file, MAX_SIDE, 0.85),
    signal,
  })
  if (res.status === 402 || res.status === 429) throw new TraceQuotaError()
  if (!res.ok) throw new HttpError(res.status, `trace.moe → HTTP ${res.status}`)

  const { result } = (await res.json()) as { result: TraceResult[] }

  // trace.moe returns many frames per anime; keep the best match of each.
  const best = new Map<number, TraceResult>()
  for (const r of result) {
    const prev = best.get(r.anilist)
    if (!prev || r.similarity > prev.similarity) best.set(r.anilist, r)
  }
  const top = [...best.values()].sort((a, b) => b.similarity - a.similarity).slice(0, 5)
  if (top.length === 0) return []

  const media = await getMediaByIds(top.map((r) => r.anilist), signal)
  const byId = new Map(media.map((m) => [m.id, m]))

  return top.flatMap((r) => {
    const m = byId.get(r.anilist)
    if (!m) return []
    return [{ ...toCandidate(m), similarity: r.similarity, episodeHint: firstEpisode(r.episode) }]
  })
}
