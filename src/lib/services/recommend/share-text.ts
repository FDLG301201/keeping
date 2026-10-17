import type { Entry } from "@/lib/types"

export const TYPE_OPTIONS = [
  { value: "anime", label: "Anime", emoji: "🎌", plural: "estos anime" },
  { value: "movie", label: "Películas", emoji: "🎬", plural: "estas películas" },
  { value: "series", label: "Series", emoji: "📺", plural: "estas series" },
  { value: "game", label: "Juegos", emoji: "🎮", plural: "estos juegos" },
  { value: "book", label: "Libros", emoji: "📚", plural: "estos libros" },
] as const

const SINGULAR: Record<string, string> = {
  anime: "este anime",
  movie: "esta película",
  series: "esta serie",
  game: "este juego",
  book: "este libro",
}

const MAX_GENRES = 3
const WITH_SEASONS = new Set(["anime", "series"])

export const stars = (rating: number) => "⭐".repeat(Math.max(0, Math.min(5, rating)))

export function shareHeading(type: string, count: number): string {
  const option = TYPE_OPTIONS.find((o) => o.value === type)
  const what = count === 1 ? SINGULAR[type] ?? "esto" : option?.plural ?? "estos"
  return `${option?.emoji ?? "✨"} Te recomiendo ${what}:`
}

export function buildShareText(entries: Entry[], type: string): string {
  const items = entries.map((e, i) => {
    const details = e.genres.slice(0, MAX_GENRES)
    if (WITH_SEASONS.has(e.type) && e.seasons > 1) details.push(`${e.seasons} temporadas`)
    const number = entries.length > 1 ? `${i + 1}. ` : ""
    const head = `${number}${e.title} ${stars(e.rating)}`
    return details.length > 0 ? `${head}\n   ${details.join(" · ")}` : head
  })
  return [shareHeading(type, entries.length), "", items.join("\n\n"), "", "— Enviado desde Keeping"].join("\n")
}
