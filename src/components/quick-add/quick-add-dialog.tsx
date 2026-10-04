"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, RotateCcw, Sparkles, X } from "lucide-react"
import { ConfirmCard } from "./confirm-card"
import { IdentifyStep } from "./identify-step"
import { findDuplicate } from "@/lib/services/entries"
import { getFranchise } from "@/lib/services/anime/search"
import type { AnimeCandidate, AnimeFranchise } from "@/lib/services/anime/types"

type Step =
  | { kind: "identify" }
  | { kind: "loading" }
  | { kind: "error"; candidate: AnimeCandidate }
  | { kind: "confirm"; candidate: AnimeCandidate; franchise: AnimeFranchise; isDuplicate: boolean }

interface QuickAddDialogProps {
  userId: string
  onClose: () => void
  onSaved: () => void
  onManual: (title: string) => void
}

export function QuickAddDialog({ userId, onClose, onSaved, onManual }: QuickAddDialogProps) {
  const [step, setStep] = useState<Step>({ kind: "identify" })
  const inFlight = useRef<AbortController | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => () => inFlight.current?.abort(), [])

  const pick = async (candidate: AnimeCandidate) => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    setStep({ kind: "loading" })
    try {
      const franchise = await getFranchise(candidate, controller.signal)
      const isDuplicate = await findDuplicate(userId, "anime", franchise.title)
      if (!controller.signal.aborted) setStep({ kind: "confirm", candidate, franchise, isDuplicate })
    } catch (error) {
      if (controller.signal.aborted) return
      console.error("Error loading franchise:", error)
      setStep({ kind: "error", candidate })
    }
  }

  const backToIdentify = () => {
    inFlight.current?.abort()
    setStep({ kind: "identify" })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-t-2xl sm:rounded-lg"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 id="quick-add-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Agregado exprés
              <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full">
                Solo anime
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Encuentra tu anime y guárdalo en segundos. Películas, series, juegos y libros siguen siendo manuales.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Kept mounted so going back preserves the query and results. */}
          <div className={step.kind === "identify" ? "" : "hidden"}>
            <IdentifyStep onPick={pick} onManual={onManual} />
          </div>

          {step.kind === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-600 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              Armando la franquicia…
            </div>
          )}

          {step.kind === "error" && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-red-700 dark:text-red-300">No pudimos cargar los datos de {step.candidate.title}.</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => pick(step.candidate)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={backToIdentify}
                  className="px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {step.kind === "confirm" && (
            <ConfirmCard
              key={`${step.candidate.source}-${step.candidate.id}`}
              franchise={step.franchise}
              episodeHint={step.candidate.episodeHint}
              isDuplicate={step.isDuplicate}
              userId={userId}
              onBack={backToIdentify}
              onSaved={onSaved}
            />
          )}
        </div>
      </div>
    </div>
  )
}
