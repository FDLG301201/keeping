"use client"

import NextImage from "next/image"
import { useEffect } from "react"
import { Heart, Star, Undo2, X } from "lucide-react"
import { useSwipe, type SwipeDirection } from "./use-swipe"
import type { Entry } from "@/lib/types"

interface SwipeDeckProps {
  deck: Entry[]
  /** How many cards have been decided; the top card is deck[position]. */
  position: number
  acceptedCount: number
  onDecide: (direction: SwipeDirection) => void
  onUndo: () => void
  onDone: () => void
}

function CardFace({ entry }: { entry: Entry }) {
  return (
    <>
      <NextImage
        src={entry.image_url || "/placeholder.svg"}
        alt={entry.title}
        fill
        sizes="(max-width: 640px) 90vw, 384px"
        draggable={false}
        className="object-cover select-none pointer-events-none bg-slate-700"
      />
      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <h3 className="text-xl font-bold text-white leading-tight line-clamp-2">{entry.title}</h3>
        <div className="flex items-center gap-0.5 mt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < entry.rating ? "fill-yellow-400 text-yellow-400" : "text-white/30"}`} />
          ))}
        </div>
        {entry.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.genres.slice(0, 4).map((g) => (
              <span key={g} className="px-2 py-0.5 text-xs text-white/90 bg-white/20 rounded">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function SwipeDeck({ deck, position, acceptedCount, onDecide, onUndo, onDone }: SwipeDeckProps) {
  const top = deck[position]
  const { handlers, style, intent, fling, busy } = useSwipe({ onSwipe: onDecide, disabled: !top })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") fling("right")
      else if (e.key === "ArrowLeft") fling("left")
      else if (e.key === "Backspace" && position > 0 && !busy) onUndo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fling, onUndo, position, busy])

  const behind = deck.slice(position + 1, position + 3)

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      <div className="w-full flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          {Math.min(position + 1, deck.length)} / {deck.length}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 font-medium rounded-md bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        >
          Listo ({acceptedCount})
        </button>
      </div>

      {/* Sized by whichever is tighter, width or height, so the buttons below stay on screen. */}
      <div className="relative aspect-[2/3]" style={{ width: "min(100%, 24rem, calc((100dvh - 290px) * 2 / 3))" }}>
        {behind
          .map((entry, i) => (
            <div
              key={entry.id}
              className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg transition-transform duration-300"
              style={{ transform: `translateY(${(i + 1) * 12}px) scale(${1 - (i + 1) * 0.05})`, zIndex: 1 - i }}
              aria-hidden
            >
              <CardFace entry={entry} />
            </div>
          ))
          .reverse()}

        {top && (
          <div
            key={top.id}
            {...handlers}
            style={{ ...style, zIndex: 10 }}
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
          >
            <CardFace entry={top} />
            <span
              className="absolute top-6 left-5 -rotate-12 px-3 py-1 text-2xl font-extrabold tracking-wider text-green-400 border-4 border-green-400 rounded-lg"
              style={{ opacity: Math.max(0, intent) }}
            >
              RECOMENDAR
            </span>
            <span
              className="absolute top-6 right-5 rotate-12 px-3 py-1 text-2xl font-extrabold tracking-wider text-slate-200 border-4 border-slate-200 rounded-lg"
              style={{ opacity: Math.max(0, -intent) }}
            >
              PASO
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fling("left")}
          disabled={!top || busy}
          aria-label="Pasar"
          className="w-14 h-14 flex items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          <X className="w-7 h-7" />
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={position === 0 || busy}
          aria-label="Deshacer"
          className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => fling("right")}
          disabled={!top || busy}
          aria-label="Recomendar"
          className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg hover:scale-105 disabled:opacity-40 transition-transform"
        >
          <Heart className="w-7 h-7 fill-white" />
        </button>
      </div>
      <p className="hidden sm:block text-xs text-slate-400">Desliza la carta o usa ← → · Retroceso para deshacer</p>
    </div>
  )
}
