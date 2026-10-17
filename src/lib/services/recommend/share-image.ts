import type { Entry } from "@/lib/types"
import { TYPE_OPTIONS } from "./share-text"

const WIDTH = 1080
const PAD = 64
const GAP = 32
const HEADER_H = 190
const FOOTER_H = 110
const MAX_TILES = 9
const IMAGE_TIMEOUT_MS = 8000

interface TileLayout {
  cols: number
  tileW: number
  coverH: number
  titleSize: number
  starSize: number
}

function layoutFor(count: number): TileLayout {
  const cols = count === 1 ? 1 : count <= 4 ? 2 : 3
  const tileW = cols === 1 ? 560 : (WIDTH - 2 * PAD - GAP * (cols - 1)) / cols
  return {
    cols,
    tileW,
    coverH: Math.round(tileW * 1.45),
    titleSize: cols === 1 ? 44 : cols === 2 ? 34 : 27,
    starSize: cols === 1 ? 40 : cols === 2 ? 32 : 26,
  }
}

/** Loads a cover with CORS so the canvas stays exportable; null if it can't. */
function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => resolve(null), IMAGE_TIMEOUT_MS)
    img.crossOrigin = "anonymous"
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Wraps text to at most `maxLines`; any line that was cut or overflows ends with "…". */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let i = 0
  while (i < words.length && lines.length < maxLines) {
    let line = words[i++]
    while (i < words.length && ctx.measureText(`${line} ${words[i]}`).width <= maxWidth) line += ` ${words[i++]}`
    lines.push(line)
  }
  const truncated = i < words.length
  return lines.map((line, idx) => {
    const isLast = idx === lines.length - 1
    if (!(isLast && truncated) && ctx.measureText(line).width <= maxWidth) return line
    let cut = line
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
    return `${cut.trimEnd()}…`
  })
}

/** Deterministic pleasant color per title, for covers that failed to load. */
function placeholderColor(title: string): string {
  let hash = 0
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 45% 32%)`
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  title: string,
  x: number,
  y: number,
  w: number,
  h: number,
  font: string,
) {
  ctx.save()
  roundRect(ctx, x, y, w, h, 18)
  ctx.clip()
  if (img) {
    // object-fit: cover
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const sw = w / scale
    const sh = h / scale
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
  } else {
    ctx.fillStyle = placeholderColor(title)
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.font = `600 ${Math.round(w / 9)}px ${font}`
    ctx.textAlign = "center"
    const lines = wrapLines(ctx, title, w - 40, 4)
    const lineH = Math.round(w / 7.5)
    lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lineH))
    ctx.textAlign = "left"
  }
  ctx.restore()
}

function drawStars(ctx: CanvasRenderingContext2D, rating: number, x: number, y: number, size: number, font: string) {
  ctx.font = `${size}px ${font}`
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < rating ? "#facc15" : "rgba(255,255,255,0.25)"
    ctx.fillText("★", x + i * size * 1.05, y)
  }
}

/**
 * Draws the "Te recomiendo…" poster. Up to 9 covers; with more, the 9th tile
 * becomes "+N más" (the share text still lists everything). Returns the canvas
 * so callers can export JPEG (share/download) or PNG (clipboard) from one render.
 */
export async function renderShareCanvas(entries: Entry[], type: string): Promise<HTMLCanvasElement> {
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif"
  const overflow = entries.length > MAX_TILES
  const shown = overflow ? entries.slice(0, MAX_TILES - 1) : entries
  const tiles = shown.length + (overflow ? 1 : 0)
  const L = layoutFor(tiles)

  const titleLineH = Math.round(L.titleSize * 1.2)
  const textBlockH = 18 + 2 * titleLineH + 10 + L.starSize
  const rowH = L.coverH + textBlockH
  const rows = Math.ceil(tiles / L.cols)
  const height = HEADER_H + rows * rowH + (rows - 1) * GAP + FOOTER_H + PAD

  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.textBaseline = "top"

  // Background
  const bg = ctx.createLinearGradient(0, 0, WIDTH, height)
  bg.addColorStop(0, "#1e1b4b")
  bg.addColorStop(0.55, "#2e1065")
  bg.addColorStop(1, "#0f172a")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, height)

  // Header
  const option = TYPE_OPTIONS.find((o) => o.value === type)
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 72px ${font}`
  ctx.fillText("Te recomiendo", PAD, PAD)
  ctx.fillStyle = "rgba(255,255,255,0.65)"
  ctx.font = `500 34px ${font}`
  const label = option ? option.label.toLowerCase() : "títulos"
  ctx.fillText(`${option?.emoji ?? "✨"}  ${entries.length} ${entries.length === 1 ? label.replace(/s$/, "") : label}`, PAD, PAD + 88)

  // Tiles
  const images = await Promise.all(shown.map((e) => loadImage(e.image_url)))
  const gridW = L.cols * L.tileW + (L.cols - 1) * GAP
  const startX = (WIDTH - gridW) / 2

  for (let i = 0; i < tiles; i++) {
    const col = i % L.cols
    const row = Math.floor(i / L.cols)
    const x = startX + col * (L.tileW + GAP)
    const y = HEADER_H + row * (rowH + GAP)

    if (overflow && i === tiles - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.08)"
      roundRect(ctx, x, y, L.tileW, L.coverH, 18)
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.font = `700 ${Math.round(L.tileW / 4)}px ${font}`
      ctx.textAlign = "center"
      ctx.fillText(`+${entries.length - shown.length}`, x + L.tileW / 2, y + L.coverH / 2 - L.tileW / 6)
      ctx.font = `500 ${L.titleSize}px ${font}`
      ctx.fillText("más", x + L.tileW / 2, y + L.coverH / 2 + L.tileW / 10)
      ctx.textAlign = "left"
      continue
    }

    const entry = shown[i]
    drawCover(ctx, images[i], entry.title, x, y, L.tileW, L.coverH, font)

    ctx.fillStyle = "#ffffff"
    ctx.font = `600 ${L.titleSize}px ${font}`
    const lines = wrapLines(ctx, entry.title, L.tileW, 2)
    lines.forEach((line, li) => ctx.fillText(line, x, y + L.coverH + 18 + li * titleLineH))
    drawStars(ctx, entry.rating, x, y + L.coverH + 18 + lines.length * titleLineH + 10, L.starSize, font)
  }

  // Footer
  const fy = height - PAD - 52
  const logo = ctx.createLinearGradient(PAD, fy, PAD + 52, fy + 52)
  logo.addColorStop(0, "#8b5cf6")
  logo.addColorStop(1, "#9333ea")
  ctx.fillStyle = logo
  roundRect(ctx, PAD, fy, 52, 52, 12)
  ctx.fill()
  ctx.fillStyle = "#ffffff"
  ctx.font = `700 30px ${font}`
  ctx.textAlign = "center"
  ctx.fillText("K", PAD + 26, fy + 11)
  ctx.textAlign = "left"
  ctx.font = `600 32px ${font}`
  ctx.fillText("Keeping", PAD + 72, fy + 9)

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: "image/jpeg" | "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), mime, 0.9),
  )
}
