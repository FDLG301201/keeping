"use client"

import { Star } from "lucide-react"
import { genresForType, type RecommendFilters } from "@/lib/services/recommend/filter"
import { TYPE_OPTIONS } from "@/lib/services/recommend/share-text"
import type { Entry } from "@/lib/types"

interface FiltersStepProps {
  entries: Entry[]
  filters: RecommendFilters
  matchCount: number
  onChange: (filters: RecommendFilters) => void
  onStart: () => void
}

const chip = (active: boolean) =>
  `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
    active
      ? "bg-violet-600 text-white"
      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
  }`

export function FiltersStep({ entries, filters, matchCount, onChange, onStart }: FiltersStepProps) {
  const genres = genresForType(entries, filters.type)

  const toggleGenre = (genre: string) =>
    onChange({
      ...filters,
      genres: filters.genres.includes(genre) ? filters.genres.filter((g) => g !== genre) : [...filters.genres, genre],
    })

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Qué quieres recomendar?</h3>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange({ ...filters, type: o.value, genres: [] })}
              className={chip(filters.type === o.value)}
            >
              {o.emoji} {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Géneros <span className="font-normal text-slate-500 dark:text-slate-400">(cualquiera de los elegidos)</span>
        </h3>
        {genres.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No tienes géneros registrados en este tipo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <button key={g} type="button" onClick={() => toggleGenre(g)} className={chip(filters.genres.includes(g))}>
                {g}
              </button>
            ))}
          </div>
        )}
        {filters.genres.length === 0 && genres.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Sin elegir ninguno entran todos.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Calificación mínima</h3>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ ...filters, minRating: i + 1 })}
                aria-label={`Mínimo ${i + 1} estrellas`}
                className="p-1 transition-transform hover:scale-110 touch-manipulation"
              >
                <Star
                  className={`w-7 h-7 ${i < filters.minRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
                />
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {filters.minRating === 5 ? "Solo 5" : `${filters.minRating} o más`}
          </span>
        </div>
      </section>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        No se incluyen los que tienes como Planeado o Abandonado.
      </p>

      <button
        type="button"
        onClick={onStart}
        disabled={matchCount === 0}
        className="w-full py-2.5 px-4 rounded-md font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {matchCount === 0
          ? "Nada coincide, prueba con menos filtros"
          : `Empezar (${matchCount} ${matchCount === 1 ? "coincide" : "coinciden"})`}
      </button>
    </div>
  )
}
