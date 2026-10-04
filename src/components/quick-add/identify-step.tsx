"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Camera, Film, Keyboard, Loader2, RotateCcw, Search } from "lucide-react"
import { CandidateList } from "./candidate-list"
import { isAbortError } from "@/lib/services/anime/http"
import { readTitle } from "@/lib/services/anime/ocr"
import { AnimeUnavailableError, searchAnime } from "@/lib/services/anime/search"
import { TraceQuotaError, identifyScene } from "@/lib/services/anime/trace-moe"
import type { AnimeCandidate } from "@/lib/services/anime/types"

type Tab = "text" | "photo" | "scene"

type Result =
  | { phase: "idle" }
  | { phase: "loading"; label: string }
  | { phase: "done"; candidates: AnimeCandidate[] }
  | { phase: "error"; message: string; retry?: () => void }

const DEBOUNCE_MS = 400
const MAX_FILE_BYTES = 10 * 1024 * 1024
const LOW_SIMILARITY = 0.87

const TABS: { id: Tab; label: string; icon: typeof Keyboard }[] = [
  { id: "text", label: "Escribir", icon: Keyboard },
  { id: "photo", label: "Foto del título", icon: Camera },
  { id: "scene", label: "Captura de escena", icon: Film },
]

interface IdentifyStepProps {
  onPick: (candidate: AnimeCandidate) => void
  onManual: (title: string) => void
}

export function IdentifyStep({ onPick, onManual }: IdentifyStepProps) {
  const [tab, setTab] = useState<Tab>("text")
  const [query, setQuery] = useState("")
  const [ocrNote, setOcrNote] = useState<string | null>(null)
  const [result, setResult] = useState<Result>({ phase: "idle" })
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current)
      inFlight.current?.abort()
    },
    [],
  )

  /** Cancels whatever is pending and returns a signal for the new request. */
  const startRequest = () => {
    if (debounce.current) clearTimeout(debounce.current)
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    return controller.signal
  }

  const runTextSearch = async (text: string) => {
    const signal = startRequest()
    setResult({ phase: "loading", label: "Buscando…" })
    try {
      const candidates = await searchAnime(text, signal)
      if (!signal.aborted) setResult({ phase: "done", candidates })
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return
      setResult({
        phase: "error",
        message:
          error instanceof AnimeUnavailableError
            ? "No pudimos conectar con los servicios de anime. Revisa tu internet."
            : "Algo salió mal al buscar.",
        retry: () => runTextSearch(text),
      })
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setOcrNote(null)
    startRequest()
    if (!value.trim()) {
      setResult({ phase: "idle" })
      return
    }
    debounce.current = setTimeout(() => runTextSearch(value.trim()), DEBOUNCE_MS)
  }

  const validateImage = (file: File | undefined): file is File => {
    if (!file) return false
    if (!file.type.startsWith("image/")) {
      setResult({ phase: "error", message: "Ese archivo no es una imagen." })
      return false
    }
    if (file.size > MAX_FILE_BYTES) {
      setResult({ phase: "error", message: "La imagen pesa más de 10 MB." })
      return false
    }
    return true
  }

  const handlePhoto = async (file: File) => {
    const signal = startRequest()
    setResult({ phase: "loading", label: "Leyendo imagen… (la primera vez tarda un poco más)" })
    try {
      const text = await readTitle(file)
      if (signal.aborted) return
      setTab("text")
      if (!text) {
        setQuery("")
        setResult({ phase: "error", message: "No pudimos leer texto en la foto. Escríbelo tú." })
        inputRef.current?.focus()
        return
      }
      setQuery(text)
      setOcrNote("Leído de tu foto. Corrígelo si hace falta.")
      runTextSearch(text)
    } catch (error) {
      if (signal.aborted) return
      console.error("OCR failed:", error)
      setResult({ phase: "error", message: "No pudimos leer la foto. Prueba con otra o escribe el nombre." })
    }
  }

  const handleScene = async (file: File) => {
    const signal = startRequest()
    setResult({ phase: "loading", label: "Identificando la escena…" })
    try {
      const candidates = await identifyScene(file, signal)
      if (!signal.aborted) setResult({ phase: "done", candidates })
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return
      setResult({
        phase: "error",
        message:
          error instanceof TraceQuotaError
            ? "Se alcanzó el límite de búsquedas por imagen este mes. Prueba escribiendo el nombre."
            : "No pudimos identificar la escena. Revisa tu internet o prueba escribiendo el nombre.",
        retry: error instanceof TraceQuotaError ? undefined : () => handleScene(file),
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!validateImage(file)) return
    if (tab === "photo") handlePhoto(file)
    else handleScene(file)
  }

  const switchTab = (next: Tab) => {
    startRequest()
    setTab(next)
    setResult({ phase: "idle" })
    if (next !== "text") setOcrNote(null)
  }

  const lowConfidence =
    tab === "scene" && result.phase === "done" && (result.candidates[0]?.similarity ?? 1) < LOW_SIMILARITY

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
              tab === id
                ? "bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <div className="space-y-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              autoFocus
              placeholder="Ej: Frieren, Attack on Titan…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          {ocrNote && <p className="text-xs text-violet-600 dark:text-violet-400">{ocrNote}</p>}
        </div>
      )}

      {tab !== "text" && (
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors text-center">
          {tab === "photo" ? (
            <Camera className="w-8 h-8 text-slate-400" />
          ) : (
            <Film className="w-8 h-8 text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {tab === "photo" ? "Toma o elige una foto del título" : "Elige una captura de una escena"}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tab === "photo"
              ? "Un póster, la carátula o la pantalla donde aparece el nombre"
              : "Un frame del episodio, sin recortes raros. Máximo 10 MB"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture={tab === "photo" ? "environment" : undefined}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      )}

      {result.phase === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          {result.label}
        </div>
      )}

      {result.phase === "error" && (
        <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
          <span>{result.message}</span>
          {result.retry && (
            <button
              type="button"
              onClick={result.retry}
              className="shrink-0 inline-flex items-center gap-1 font-medium hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reintentar
            </button>
          )}
        </div>
      )}

      {result.phase === "done" && result.candidates.length > 0 && (
        <div className="space-y-2">
          {lowConfidence && (
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              No estamos muy seguros de esta. Revisa que sea el anime correcto.
            </p>
          )}
          <CandidateList candidates={result.candidates} onPick={onPick} />
        </div>
      )}

      {result.phase === "done" && result.candidates.length === 0 && (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">No lo encontramos 😕</p>
          <button
            type="button"
            onClick={() => onManual(tab === "text" ? query.trim() : "")}
            className="px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Agregar manualmente
          </button>
        </div>
      )}
    </div>
  )
}
