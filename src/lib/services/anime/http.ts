const TIMEOUT_MS = 8000

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** fetch + JSON with a timeout, honoring an optional caller abort signal. */
export async function fetchJson<T>(url: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const res = await fetch(url, {
    ...init,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!res.ok) throw new HttpError(res.status, `${url} → HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

/** Strips HTML and source credits from API synopses. */
export function cleanDescription(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/\[Written by MAL Rewrite\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
