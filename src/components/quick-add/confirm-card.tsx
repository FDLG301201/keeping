"use client"

import NextImage from "next/image"
import { useState } from "react"
import { AlertTriangle, ArrowLeft, Loader2, Star } from "lucide-react"
import { saveEntryWithGenres, type NewEntry } from "@/lib/services/entries"
import type { AnimeFranchise } from "@/lib/services/anime/types"

const STATUS_OPTIONS = [
  { value: "completed", label: "Completado" },
  { value: "in_progress", label: "En Progreso" },
  { value: "paused", label: "Pausado" },
  { value: "dropped", label: "Abandonado" },
  { value: "not_started", label: "Planeado" },
]

const CONTINUATION_STATUSES = new Set(["in_progress", "paused", "dropped"])

interface ConfirmCardProps {
  franchise: AnimeFranchise
  episodeHint?: number
  isDuplicate: boolean
  userId: string
  onBack: () => void
  onSaved: () => void
}

/** Maps the franchise plus the user's choices onto an `entries` row. */
function buildEntry(
  franchise: AnimeFranchise,
  userId: string,
  rating: number,
  status: string,
  season: number,
  episode: number,
): NewEntry {
  const { seasons } = franchise
  let currentSeason = 1
  let currentEpisode = 1
  if (status === "completed") {
    currentSeason = seasons.length
    currentEpisode = seasons[seasons.length - 1].episodes ?? 1
  } else if (CONTINUATION_STATUSES.has(status)) {
    currentSeason = season
    currentEpisode = episode
  }
  const seasonEpisodes = seasons[currentSeason - 1].episodes
  return {
    title: franchise.title,
    type: "anime",
    rating,
    image_url: franchise.coverUrl,
    comments: "",
    date_watched: new Date().toISOString().split("T")[0],
    description: franchise.description,
    status,
    seasons: seasons.length,
    current_season: currentSeason,
    episodes: Math.max(seasonEpisodes ?? currentEpisode, currentEpisode),
    current_episode: currentEpisode,
    user_id: userId,
  }
}

export function ConfirmCard({ franchise, episodeHint, isDuplicate, userId, onBack, onSaved }: ConfirmCardProps) {
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState("")
  const [season, setSeason] = useState(franchise.pickedSeason)
  const [episode, setEpisode] = useState(() => {
    const max = franchise.seasons[franchise.pickedSeason - 1]?.episodes
    return max ? Math.min(episodeHint ?? 1, max) : (episodeHint ?? 1)
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxEpisodes = franchise.seasons[season - 1]?.episodes ?? undefined
  const seasonCount = franchise.seasons.length
  const canSave = rating > 0 && status !== "" && !isDuplicate && !saving

  const changeSeason = (next: number) => {
    setSeason(next)
    const max = franchise.seasons[next - 1]?.episodes
    if (max && episode > max) setEpisode(max)
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await saveEntryWithGenres(buildEntry(franchise, userId, rating, status, season, episode), franchise.genres)
      onSaved()
    } catch (e) {
      console.error("Error saving quick-add entry:", e)
      setError("No se pudo guardar. Intenta de nuevo.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        disabled={saving}
        className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Elegir otro
      </button>

      <div className="flex gap-4">
        <NextImage
          src={franchise.coverUrl || "/placeholder.svg"}
          alt={franchise.title}
          width={96}
          height={136}
          className="w-24 h-[136px] shrink-0 rounded-lg object-cover bg-slate-200 dark:bg-slate-700 shadow"
        />
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{franchise.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {seasonCount} {seasonCount === 1 ? "temporada" : "temporadas"}
          </p>
          <div className="flex flex-wrap gap-1">
            {franchise.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs rounded-md"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {franchise.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{franchise.description}</p>
      )}

      {isDuplicate && (
        <div className="flex items-center gap-2 p-3 text-sm rounded-md bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Ya tienes {franchise.title} en tu lista.
        </div>
      )}

      {!isDuplicate && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Calificación *</label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className="p-1 transition-transform hover:scale-110 touch-manipulation"
                  aria-label={`${i + 1} estrellas`}
                >
                  <Star
                    className={`w-7 h-7 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Estado *</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setStatus(o.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    status === o.value
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {CONTINUATION_STATUSES.has(status) && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Temporada</label>
                <select
                  value={season}
                  onChange={(e) => changeSeason(Number(e.target.value))}
                  disabled={seasonCount === 1}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {franchise.seasons.map((s, i) => (
                    <option key={s.id} value={i + 1}>
                      T{i + 1}
                      {s.episodes ? ` (${s.episodes} eps)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Episodio actual{maxEpisodes ? ` (de ${maxEpisodes})` : ""}
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxEpisodes}
                  value={episode}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value) || 1
                    setEpisode(maxEpisodes ? Math.min(Math.max(n, 1), maxEpisodes) : Math.max(n, 1))
                  }}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">{error}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2.5 px-4 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </>
      )}
    </div>
  )
}
