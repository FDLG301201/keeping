/**
 * Thin wrappers over the browser's sharing APIs. Buttons are shown by
 * capability (what the browser supports), not by guessing phone vs. PC.
 * None of these throw.
 */

export type ShareOutcome = "shared" | "cancelled" | "failed"

export const IMAGE_FILENAME = "recomendaciones-keeping.jpg"

export function canShareFiles(file: File): boolean {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

export function canShareText(): boolean {
  return typeof navigator.share === "function"
}

/** Opens the OS share sheet. Some apps (e.g. WhatsApp on iOS) keep only the image when both are sent. */
export async function shareNative(text: string, file?: File): Promise<ShareOutcome> {
  try {
    await navigator.share(file ? { text, files: [file] } : { text })
    return "shared"
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed"
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Chrome/Edge desktop and Safari support PNG on the clipboard; Firefox mostly doesn't. */
export function canCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function"
}

/**
 * Takes a promise so the clipboard write starts inside the click (Safari drops
 * the user gesture if we await the PNG first).
 */
export async function copyImage(png: Promise<Blob>): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
    return true
  } catch {
    return false
  }
}

/** wa.me opens the WhatsApp app on phones and WhatsApp Web on desktop, with the text pre-filled. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
