/**
 * English → Spanish translation without API keys:
 *   1. The browser's on-device Translator API (Chrome/Edge desktop)
 *   2. MyMemory's free public API
 *   3. The original text, untouched
 * Never throws: translation is a nicety, not a requirement.
 */

const MYMEMORY = "https://api.mymemory.translated.net/get"
const MYMEMORY_MAX_CHARS = 480 // hard limit is 500
// Some Chromium builds expose Translator but never settle availability().
const AVAILABILITY_TIMEOUT_MS = 2000
// How long the first translation waits for the on-device model to be ready.
const FIRST_WAIT_MS = 3000
const REQUEST_TIMEOUT_MS = 8000

interface BrowserTranslator {
  translate(text: string): Promise<string>
}

interface TranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>
  create(options: { sourceLanguage: string; targetLanguage: string }): Promise<BrowserTranslator>
}

const LANGS = { sourceLanguage: "en", targetLanguage: "es" }

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))])

let warmUp: Promise<void> | null = null
let readyTranslator: BrowserTranslator | null = null
let waitedForModel = false

/**
 * Starts creating the on-device translator. Call it synchronously inside a
 * click handler: Chrome requires a user gesture to download the model the
 * first time. Later calls reuse the same instance.
 */
export function warmUpTranslator(): void {
  if (warmUp) return
  const api = (globalThis as unknown as { Translator?: TranslatorStatic }).Translator
  if (!api) {
    warmUp = Promise.resolve()
    return
  }
  warmUp = (async () => {
    try {
      const availability = await withTimeout(api.availability(LANGS), AVAILABILITY_TIMEOUT_MS)
      // Timed out or unsupported: give up on it for this session.
      if (availability === null || availability === "unavailable") return
      readyTranslator = await api.create(LANGS)
    } catch (error) {
      // Typically a missing user gesture for the download; retry on the next one.
      console.warn("Browser translator unavailable:", error)
      warmUp = null
    }
  })()
}

/** Groups a paragraph's sentences into pieces that fit MyMemory's limit. */
function chunkParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+(?:[.!?]+["')\]]*)?\s*/g) ?? [paragraph]
  const pieces: string[] = []
  let current = ""
  for (const sentence of sentences) {
    if (current.length + sentence.length > MYMEMORY_MAX_CHARS) {
      if (current) pieces.push(current)
      current = ""
      // A single sentence over the limit gets hard-split.
      let rest = sentence
      while (rest.length > MYMEMORY_MAX_CHARS) {
        pieces.push(rest.slice(0, MYMEMORY_MAX_CHARS))
        rest = rest.slice(MYMEMORY_MAX_CHARS)
      }
      current = rest
    } else {
      current += sentence
    }
  }
  if (current.trim()) pieces.push(current)
  return pieces.map((piece) => piece.trim())
}

async function translateWithMyMemory(text: string, signal?: AbortSignal): Promise<string> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const translatePiece = async (piece: string) => {
    const url = `${MYMEMORY}?q=${encodeURIComponent(piece)}&langpair=en|es`
    const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    const body = (await res.json()) as { responseStatus: number | string; responseData: { translatedText: string } }
    // Errors (quota, length…) come back as HTTP 200 with the message in translatedText.
    if (Number(body.responseStatus) !== 200) throw new Error(`MyMemory: ${body.responseData.translatedText}`)
    return body.responseData.translatedText
  }

  const paragraphs: string[] = []
  for (const paragraph of text.split("\n")) {
    const translated: string[] = []
    for (const piece of chunkParagraph(paragraph)) translated.push(await translatePiece(piece))
    paragraphs.push(translated.join(" "))
  }
  return paragraphs.join("\n")
}

export async function translateToSpanish(text: string, signal?: AbortSignal): Promise<string> {
  if (!text.trim()) return text

  warmUpTranslator()
  // Wait for the model once; if it's still downloading, MyMemory covers this
  // call and later calls use the browser as soon as it's ready.
  if (!readyTranslator && !waitedForModel && warmUp) {
    waitedForModel = true
    await withTimeout(warmUp, FIRST_WAIT_MS)
  }
  if (readyTranslator) {
    try {
      return await readyTranslator.translate(text)
    } catch (error) {
      console.warn("Browser translation failed, trying MyMemory:", error)
    }
  }

  try {
    return await translateWithMyMemory(text, signal)
  } catch (error) {
    if (signal?.aborted) throw error
    console.warn("MyMemory translation failed, keeping original:", error)
    return text
  }
}
