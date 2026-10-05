import type { PSM } from "tesseract.js"
import { normalizeImage } from "./image"

const MIN_CONFIDENCE = 60
const MIN_LETTERS = 4
const MAX_LINES = 6
// Plenty for title text; full 12 MP phone photos make OCR very slow on mobile.
const MAX_SIDE = 2000
// Sparse-text mode: finds scattered text (titles over artwork, UI labels)
// instead of trying to lay the whole photo out as a page.
const SPARSE_TEXT = "11" as PSM

/**
 * Reads the text lines of a photo that could be a title, most confident
 * first. Choosing the actual title is left to the caller (see
 * searchFromOcrLines), since posters and streaming UIs carry lots of other
 * text. tesseract.js (~10 MB on first use) is loaded only when called.
 */
export async function readTitleLines(file: File): Promise<string[]> {
  const image = await normalizeImage(file, MAX_SIDE)
  const mod = await import("tesseract.js")
  const createWorker = mod.createWorker ?? mod.default.createWorker
  const worker = await createWorker("eng")
  try {
    await worker.setParameters({ tessedit_pageseg_mode: SPARSE_TEXT })
    const { data } = await worker.recognize(image, {}, { blocks: true })
    const lines = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))

    const seen = new Set<string>()
    return lines
      .filter((l) => l.confidence >= MIN_CONFIDENCE)
      .sort((a, b) => b.confidence - a.confidence)
      .map((l) => cleanLine(l.text))
      .filter((text) => {
        const key = text.toLowerCase()
        if ((text.match(/\p{L}/gu) ?? []).length < MIN_LETTERS || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, MAX_LINES)
  } finally {
    await worker.terminate()
  }
}

/** "The Insipid Prince's … Throne | WN |]" → "The Insipid Prince's … Throne" */
export function cleanLine(text: string): string {
  // OCR reads frame edges and UI dividers as | [ ] { }; keep the longest segment between them.
  const segment = text.split(/[|[\]{}]/).sort((a, b) => b.length - a.length)[0] ?? ""
  return segment
    .replace(/[^\p{L}\p{N}\s'’:!?.,&-]/gu, "")
    .replace(/^[^\p{L}\p{N}]+/u, "") // leading "> " from play buttons, etc.
    .replace(/(\.\.\.|…)\s*$/, "") // truncated titles
    .replace(/[\s:,-]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
}
