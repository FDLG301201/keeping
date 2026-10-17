"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Send, X } from "lucide-react"
import { FiltersStep } from "./filters-step"
import { ShareStep } from "./share-step"
import { SwipeDeck } from "./swipe-deck"
import type { SwipeDirection } from "./use-swipe"
import { filterRecommendable, orderDeck, type RecommendFilters } from "@/lib/services/recommend/filter"
import type { Entry } from "@/lib/types"

type Step = "filters" | "deck" | "share"

const DEFAULT_FILTERS: RecommendFilters = { type: "anime", genres: [], minRating: 4 }

const SUBTITLES: Record<Step, string> = {
  filters: "Elige qué quieres recomendar",
  deck: "Derecha para recomendar, izquierda para pasar",
  share: "Mándaselo a quien quieras",
}

interface RecommendDialogProps {
  entries: Entry[]
  onClose: () => void
}

export function RecommendDialog({ entries, onClose }: RecommendDialogProps) {
  const [step, setStep] = useState<Step>("filters")
  const [filters, setFilters] = useState<RecommendFilters>(DEFAULT_FILTERS)
  const [deck, setDeck] = useState<Entry[]>([])
  const [decisions, setDecisions] = useState<SwipeDirection[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const matches = useMemo(() => filterRecommendable(entries, filters), [entries, filters])
  const accepted = useMemo(
    () => deck.filter((e, i) => decisions[i] === "right" && !removed.has(e.id)),
    [deck, decisions, removed],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const start = () => {
    setDeck(orderDeck(matches))
    setDecisions([])
    setRemoved(new Set())
    setStep("deck")
  }

  const decide = (direction: SwipeDirection) => {
    const next = [...decisions, direction]
    setDecisions(next)
    if (next.length >= deck.length) setStep("share")
  }

  const restart = () => setStep("filters")

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/60 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommend-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl sm:rounded-lg"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 sm:px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            {step === "deck" && (
              <button
                type="button"
                onClick={restart}
                aria-label="Volver a los filtros"
                className="p-1 -ml-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 id="recommend-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <Send className="w-5 h-5 text-violet-500" />
                Recomendar
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{SUBTITLES[step]}</p>
            </div>
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
          {step === "filters" && (
            <FiltersStep
              entries={entries}
              filters={filters}
              matchCount={matches.length}
              onChange={setFilters}
              onStart={start}
            />
          )}
          {step === "deck" && (
            <SwipeDeck
              deck={deck}
              position={decisions.length}
              acceptedCount={decisions.filter((d) => d === "right").length}
              onDecide={decide}
              onUndo={() => setDecisions((d) => d.slice(0, -1))}
              onDone={() => setStep("share")}
            />
          )}
          {step === "share" && (
            <ShareStep
              entries={accepted}
              type={filters.type}
              onRemove={(id) => setRemoved((r) => new Set(r).add(id))}
              onRestart={restart}
            />
          )}
        </div>
      </div>
    </div>
  )
}
