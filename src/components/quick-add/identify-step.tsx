"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Camera, Film, Keyboard, Loader2, RotateCcw, Search } from "lucide-react"
import { CandidateList } from "./candidate-list"
import { isAbortError } from "@/lib/services/anime/http"
import { readTitleLines } from "@/lib/services/anime/ocr"
import { AnimeUnavailableError, searchAnime, searchFromOcrLines } from "@/lib/services/anime/search"
import { TraceQuotaError, identifyScene } from "@/lib/services/anime/trace-moe"
import type { AnimeCandidate } from "@/lib/services/anime/types"

type Tab = "text" | "photo" | "scene"

type Result =
  | { phase: "idle" }
  | { phase: "loading"; label: string }
  | { phase: "done"; candidates: AnimeCandidate[] }
  | { phase: "error"; message: string; retry?: () => void; typeInstead?: boolean }

const DEBOUNCE_MS = 400
// Photos are downscaled before processing, so big phone photos are fine.
const MAX_FILE_BYTES = 25 * 1024 * 1024
// trace.moe: below this the match is essentially noise; below WARN it's doubtful.
const MIN_SIMILARITY = 0.8
const WARN_SIMILARITY = 0.87

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
  const [ocrAlternatives, setOcrAlternatives] = useState<string[]>([])
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
      setResult({ phase: "error", message: "La imagen pesa más de 25 MB." })
      return false
    }
    return true
  }

  const handlePhoto = async (file: File) => {
    const signal = startRequest()
    setOcrAlternatives([])
    setResult({ phase: "loading", label: "Leyendo imagen… (la primera vez tarda un poco más)" })
    try {
      const lines = await readTitleLines(file)
      if (signal.aborted) return
      if (lines.length === 0) {
        setResult({
          phase: "error",
          message: "No pudimos leer texto en la foto. Encuadra solo el nombre, de cerca, o escríbelo tú.",
          typeInstead: true,
        })
        return
      }
      setResult({ phase: "loading", label: "Buscando el título…" })
      const { query: title, candidates, alternatives, matched } = await searchFromOcrLines(lines, signal)
      if (signal.aborted) return
      setTab("text")
      if (!matched) {
        setQuery("")
        setOcrNote(null)
        setOcrAlternatives(lines)
        setResult({
          phase: "error",
          message:
            "No encontramos un título claro en la foto. Vuelve a tomarla encuadrando solo el nombre, " +
            "toca una de las líneas leídas o escríbelo.",
        })
        return
      }
      setQuery(title)
      setOcrNote("Leído de tu foto. Corrígelo si hace falta.")
      setOcrAlternatives(alternatives)
      setResult({ phase: "done", candidates })
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return
      console.error("Photo title search failed:", error)
      setResult({
        phase: "error",
        message:
          error instanceof AnimeUnavailableError
            ? "No pudimos conectar con los servicios de anime. Revisa tu internet."
            : "No pudimos leer la foto. Prueba con otra o escribe el nombre.",
        retry: () => handlePhoto(file),
      })
    }
  }

  const tryAlternative = (line: string) => {
    setQuery(line)
    runTextSearch(line)
  }

  const handleScene = async (file: File) => {
    const signal = startRequest()
    setResult({ phase: "loading", label: "Identificando la escena…" })
    try {
      const all = await identifyScene(file, signal)
      if (signal.aborted) return
      const candidates = all.filter((c) => (c.similarity ?? 0) >= MIN_SIMILARITY)
      if (candidates.length === 0) {
        const best = all[0]?.similarity
        setResult({
          phase: "error",
          message:
            `No reconocimos la escena${best !== undefined ? ` (${Math.round(best * 100)}% de parecido)` : ""}. ` +
            "Necesita un frame de un episodio, no la portada. Si el anime es muy reciente, puede que todavía " +
            "no esté en la base de trace.moe: prueba con la foto del título o escribiendo el nombre.",
          typeInstead: true,
        })
        return
      }
      setResult({ phase: "done", candidates })
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
    if (next !== "text") {
      setOcrNote(null)
      setOcrAlternatives([])
    }
  }

  const lowConfidence =
    tab === "scene" && result.phase === "done" && (result.candidates[0]?.similarity ?? 1) < WARN_SIMILARITY

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
          {ocrAlternatives.length > 0 && (
            <div className="pt-1 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ocrNote ? "¿No es eso? También leímos:" : "Leímos esto en tu foto:"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ocrAlternatives.map((line) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => tryAlternative(line)}
                    className={`max-w-full truncate px-2 py-1 text-xs rounded-md border transition-colors ${
                      line === query
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                        : "border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-violet-400"
                    }`}
                  >
                    {line}
                  </button>
                ))}
              </div>
            </div>
          )}
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
              ? "Encuadra solo el nombre, lo más derecho y de cerca posible. Las ilustraciones alrededor confunden la lectura."
              : "Un frame del episodio, no la portada. Funciona mejor con anime que ya terminó de emitirse."}
          </span>
          <input
            type="file"
            accept="image/*"
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
        <div className="p-3 text-sm rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex-1 min-w-[12rem]">{result.message}</span>
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
          {result.typeInstead && (
            <button
              type="button"
              onClick={() => switchTab("text")}
              className="shrink-0 inline-flex items-center gap-1 font-medium hover:underline"
            >
              <Keyboard className="w-3 h-3" />
              Escribir el nombre
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
