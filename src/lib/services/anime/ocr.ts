import type { Line } from "tesseract.js"

const MIN_CONFIDENCE = 50

/**
 * Reads the most title-like text from a photo. tesseract.js (~10 MB of
 * worker + language data on first use) is loaded only when this is called.
 */
export async function readTitle(file: File): Promise<string> {
  const mod = await import("tesseract.js")
  const createWorker = mod.createWorker ?? mod.default.createWorker
  const worker = await createWorker("eng")
  try {
    const { data } = await worker.recognize(file, {}, { blocks: true })
    const lines = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
    return pickTitleLine(lines)
  } finally {
    await worker.terminate()
  }
}

const clean = (text: string) =>
  text.replace(/[^\p{L}\p{N}\s:'!?.\-]/gu, "").replace(/\s+/g, " ").trim()

/** On posters and title screens the title is usually the biggest text. */
function pickTitleLine(lines: Line[]): string {
  const usable = lines
    .map((l) => ({ text: clean(l.text), height: l.bbox.y1 - l.bbox.y0, confidence: l.confidence }))
    .filter((l) => l.text.replace(/[^\p{L}]/gu, "").length >= 3)
  const confident = usable.filter((l) => l.confidence >= MIN_CONFIDENCE)
  const pool = confident.length > 0 ? confident : usable
  return pool.sort((a, b) => b.height - a.height)[0]?.text ?? ""
}
