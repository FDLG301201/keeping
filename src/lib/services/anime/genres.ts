// AniList uses a fixed genre list; MAL (Jikan) shares most of these names.
const GENRES_ES: Record<string, string> = {
  Action: "Acción",
  Adventure: "Aventura",
  Comedy: "Comedia",
  Drama: "Drama",
  Ecchi: "Ecchi",
  Fantasy: "Fantasía",
  Hentai: "Hentai",
  Horror: "Terror",
  "Mahou Shoujo": "Mahou Shoujo",
  Mecha: "Mecha",
  Music: "Música",
  Mystery: "Misterio",
  Psychological: "Psicológico",
  Romance: "Romance",
  "Sci-Fi": "Ciencia Ficción",
  "Slice of Life": "Recuentos de la Vida",
  Sports: "Deportes",
  Supernatural: "Sobrenatural",
  Thriller: "Suspenso",
  // MAL-only names
  "Award Winning": "Premiado",
  "Avant Garde": "Vanguardia",
  Suspense: "Suspenso",
  Gourmet: "Gastronomía",
  "Boys Love": "Boys Love",
  "Girls Love": "Girls Love",
}

/** Translates genres to Spanish; unknown ones are kept as-is. Deduplicates. */
export function translateGenres(genres: string[]): string[] {
  return Array.from(new Set(genres.map((g) => GENRES_ES[g] ?? g)))
}
